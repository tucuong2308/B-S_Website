import asyncio
import logging
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.schemas.chat import (
    ChatRequest, ChatResponse,
    PriceChartWidget, ComparisonWidget, ComparisonItem,
    MiniMapWidget, MapMarker, Widget,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Lazy-load agent
_agent = None


def get_agent():
    global _agent
    if _agent is None:
        from chat_agent.agent_deepseek import agent
        _agent = agent
    return _agent


# ── Widget builders ───────────────────────────────────────────

def _build_price_chart(tool_name: str, tool_args: dict) -> PriceChartWidget | None:
    """Re-query monthly price data and build a price_chart widget."""
    from app.database import SessionLocal
    from app.services.price_history import (
        calc_monthly_avg_price_by_district_name,
        calc_monthly_avg_price_by_province_name,
    )

    area_name = tool_args.get("district_name") or tool_args.get("province_name") or ""
    if not area_name:
        return None

    db = SessionLocal()
    try:
        if "district" in tool_name:
            _, monthly_prices = calc_monthly_avg_price_by_district_name(
                db, area_name, None, months=12
            )
        else:
            _, monthly_prices = calc_monthly_avg_price_by_province_name(
                db, area_name, None, months=12
            )

        if not monthly_prices:
            return None

        return PriceChartWidget(
            area_name=area_name,
            monthly_prices=[
                {
                    "month": str(p.get("month", "")),
                    "avg_price_per_m2": p.get("avg_price_per_m2", 0),
                }
                for p in monthly_prices
            ],
        )
    except Exception as e:
        logger.warning(f"Failed to build price_chart widget: {e}")
        return None
    finally:
        db.close()


def _build_mini_map(tool_name: str, tool_args: dict) -> MiniMapWidget | None:
    """Re-query listings and build a mini_map widget with markers."""
    from app.database import SessionLocal
    from app.services.listings import (
        fetch_listings_by_district_name,
        fetch_listings_by_ward_name,
    )

    area_name = tool_args.get("district_name") or tool_args.get("ward_name") or ""
    if not area_name:
        return None

    db = SessionLocal()
    try:
        if "district" in tool_name:
            listings = fetch_listings_by_district_name(db, area_name, None, limit=5)
        else:
            listings = fetch_listings_by_ward_name(db, area_name, None, limit=5)

        if not listings:
            return None

        markers = []
        center_lat = 0.0
        center_lon = 0.0
        count = 0

        for item in listings:
            lat = item.get("latitude")
            lon = item.get("longitude")
            if lat is not None and lon is not None:
                lat_f = float(lat)
                lon_f = float(lon)
                markers.append(MapMarker(
                    lat=lat_f,
                    lon=lon_f,
                    label=item.get("ward_name") or area_name,
                    price=float(item.get("price", 0)),
                    area=float(item.get("area", 0)),
                ))
                center_lat += lat_f
                center_lon += lon_f
                count += 1

        if count == 0:
            center_lat, center_lon = 21.0285, 105.8542  # fallback Hà Nội
        else:
            center_lat /= count
            center_lon /= count

        return MiniMapWidget(
            area_name=area_name,
            center_lat=center_lat,
            center_lon=center_lon,
            markers=markers,
        )
    except Exception as e:
        logger.warning(f"Failed to build mini_map widget: {e}")
        return None
    finally:
        db.close()


def _build_comparison(tool_calls: list[tuple[str, dict]]) -> ComparisonWidget | None:
    """Build a comparison widget from multiple avg-price tool calls."""
    from app.database import SessionLocal
    from app.services.Price import (
        calc_avg_price_by_district_name,
        calc_avg_price_by_ward_name,
        calc_avg_price_by_province_name,
    )

    areas: list[ComparisonItem] = []
    db = SessionLocal()
    try:
        for tool_name, tool_args in tool_calls:
            area_name = (
                tool_args.get("district_name")
                or tool_args.get("ward_name")
                or tool_args.get("province_name")
                or ""
            )
            if not area_name:
                continue

            if "district" in tool_name:
                avg_price, total = calc_avg_price_by_district_name(db, area_name)
            elif "ward" in tool_name:
                avg_price, total = calc_avg_price_by_ward_name(db, area_name)
            else:
                avg_price, total = calc_avg_price_by_province_name(db, area_name)

            if avg_price:
                areas.append(ComparisonItem(
                    name=area_name,
                    avg_price_per_m2=avg_price,
                    total_listings=total,
                ))

        if len(areas) < 2:
            return None

        return ComparisonWidget(areas=areas)
    except Exception as e:
        logger.warning(f"Failed to build comparison widget: {e}")
        return None
    finally:
        db.close()


def _extract_widgets(response: dict) -> list[Widget]:
    """Parse agent's tool calls and build corresponding widgets."""
    messages = response.get("messages", [])
    widgets: list[Widget] = []

    # Collect all tool calls with their names and args
    tool_calls_info: list[tuple[str, dict]] = []
    chart_tools: list[tuple[str, dict]] = []  # monthly price tools
    avg_price_tools: list[tuple[str, dict]] = []  # avg price tools
    listing_tools: list[tuple[str, dict]] = []  # listing tools

    for msg in messages:
        if not isinstance(msg, AIMessage):
            continue
        if not hasattr(msg, "tool_calls") or not msg.tool_calls:
            continue

        for tc in msg.tool_calls:
            tool_name = tc.get("name", "")
            tool_args = tc.get("args", {})
            tool_calls_info.append((tool_name, tool_args))

            if "monthly" in tool_name:
                chart_tools.append((tool_name, tool_args))
            elif "avg_price" in tool_name:
                avg_price_tools.append((tool_name, tool_args))
            elif "listing" in tool_name:
                listing_tools.append((tool_name, tool_args))

    # Build price_chart widgets (one per area)
    for tool_name, tool_args in chart_tools:
        w = _build_price_chart(tool_name, tool_args)
        if w:
            widgets.append(w)

    # Build comparison widget if multiple areas were compared
    if len(avg_price_tools) >= 2:
        w = _build_comparison(avg_price_tools)
        if w:
            widgets.append(w)

    # Build mini_map widgets (one per area)
    for tool_name, tool_args in listing_tools:
        w = _build_mini_map(tool_name, tool_args)
        if w:
            widgets.append(w)

    return widgets


# ── Endpoint ──────────────────────────────────────────────────

@router.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    try:
        agent = get_agent()

        messages = []
        for msg in (request.history or []):
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
        messages.append(HumanMessage(content=request.message))

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: agent.invoke({"messages": messages})
        )

        reply = response["messages"][-1].content
        widgets = _extract_widgets(response)

        return ChatResponse(response=reply, widgets=widgets)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

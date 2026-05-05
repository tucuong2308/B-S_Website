from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any


class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = []


# ── Widget types ──────────────────────────────────────────────

class PriceChartWidget(BaseModel):
    type: str = "price_chart"
    area_name: str
    monthly_prices: List[Dict[str, Any]]  # [{month: "2024-01", avg_price_per_m2: 45000000}, ...]


class ComparisonItem(BaseModel):
    name: str
    avg_price_per_m2: float
    total_listings: int


class ComparisonWidget(BaseModel):
    type: str = "comparison"
    areas: List[ComparisonItem]


class MapMarker(BaseModel):
    lat: float
    lon: float
    label: str
    price: float
    area: float


class MiniMapWidget(BaseModel):
    type: str = "mini_map"
    area_name: str
    center_lat: float
    center_lon: float
    markers: List[MapMarker]


Widget = Union[PriceChartWidget, ComparisonWidget, MiniMapWidget]


class ChatResponse(BaseModel):
    response: str
    widgets: Optional[List[Widget]] = []

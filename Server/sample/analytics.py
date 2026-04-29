"""
Router cho các endpoint analytics:
  POST /api/v1/price/by-address              — Giá TB/m² theo địa chỉ + bán kính 1km (12 tháng)
  GET  /api/v1/price/by-district-name        — Giá TB/m² theo tên huyện (12 tháng)
  GET  /api/v1/projects/district/{district_id} — Tất cả dự án trong 1 huyện
  GET  /api/v1/projects/ward/{ward_id}         — Tất cả dự án trong 1 xã/phường
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.schemas import AddressPriceResponse, ProjectListResponse, DistrictMonthlyPriceResponse
from app.services.geocoding import geocode
from app.services.price_history import (
    calc_monthly_avg_price_in_radius,
    calc_monthly_avg_price_by_district_name,
)
from app.services.projects import fetch_projects_by_district, fetch_projects_by_ward, row_to_project_dict
from app.services.location import get_district_or_404, get_ward_or_404

router = APIRouter()


# ── Request body cho endpoint giá theo địa chỉ ───────────────────────────────

class AddressPriceRequest(BaseModel):
    address: str
    type_id: Optional[str] = None

    model_config = {"json_schema_extra": {
        "example": {
            "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
            "type_id": "nha-o"
        }
    }}


# ── Endpoint 1: Giá TB/m² theo địa chỉ ──────────────────────────────────────

@router.post("/price/by-address", response_model=AddressPriceResponse)
async def get_price_by_address(
    body: AddressPriceRequest,
    db: Session = Depends(get_db),
):
    """
    Nhận địa chỉ và loại BĐS, trả về giá trung bình/m² trong bán kính 1km
    cho 12 tháng gần nhất.

    **Geocoding (tự động):**
    - Thử Nominatim (OpenStreetMap) trước - miễn phí
    - Fallback sang Mapbox nếu thất bại - sử dụng API key từ config
    """
    # Geocoding: Nominatim → Mapbox fallback (xử lý tự động)
    coords = await geocode(body.address)
    lon, lat = coords

    monthly = calc_monthly_avg_price_in_radius(
        db=db, lon=lon, lat=lat, type_id=body.type_id, months=12,
    )

    return AddressPriceResponse(
        address=body.address,
        type_id=body.type_id,
        geocode_source="nominatim/mapbox",
        longitude=lon,
        latitude=lat,
        radius_meters=1000,
        monthly_prices=monthly,
    )


# ── Endpoint 2: Giá TB/m² theo tên huyện (12 tháng) ─────────────────────────

@router.get("/price/by-district-name", response_model=DistrictMonthlyPriceResponse)
def get_price_by_district_name(
    district_name: str = Query(
        ...,
        description="Tên huyện cần tra cứu (ví dụ: 'Quận 1', 'Huyện Bình Chánh', 'Ba Đình')",
        example="Quận 1"
    ),
    type_id: Optional[str] = Query(
        None,
        description="Lọc theo loại hình bất động sản (ví dụ: nha-o, dat-nen)"
    ),
    db: Session = Depends(get_db),
):
    """
    Nhận tên huyện, trả về giá bất động sản trung bình/m² theo từng tháng
    trong 12 tháng gần nhất.

    - Tìm kiếm tên huyện không phân biệt hoa thường (ILIKE)
    - Nếu không tìm thấy huyện -> 404
    - Hỗ trợ lọc thêm theo `type_id`
    """
    district_info, monthly = calc_monthly_avg_price_by_district_name(
        db=db,
        district_name=district_name,
        type_id=type_id,
        months=12,
    )

    if not district_info:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy huyện với tên '{district_name}'. Vui lòng kiểm tra lại tên huyện."
        )

    return DistrictMonthlyPriceResponse(
        district_id=district_info["id"],
        district_name=district_info["name"],
        province_id=district_info["province_id"],
        province_name=district_info["province_name"],
        type_id=type_id,
        months=12,
        monthly_prices=monthly,
    )


# ── Endpoint 3: Tất cả dự án trong 1 huyện ───────────────────────────────────

@router.get("/projects/district/{district_id}", response_model=ProjectListResponse)
def get_projects_by_district(
    district_id: str,
    db: Session = Depends(get_db),
):
    """
    Trả về thông tin đầy đủ của tất cả dự án trong 1 huyện/quận.
    Join bảng `projects` + `projects_detailed`.
    """
    get_district_or_404(db, district_id)
    rows = fetch_projects_by_district(db, district_id)
    projects = [row_to_project_dict(r) for r in rows]
    return ProjectListResponse(total=len(projects), projects=projects)


# ── Endpoint 4: Tất cả dự án trong 1 xã/phường ───────────────────────────────

@router.get("/projects/ward/{ward_id}", response_model=ProjectListResponse)
def get_projects_by_ward(
    ward_id: str,
    db: Session = Depends(get_db),
):
    """
    Trả về thông tin đầy đủ của tất cả dự án trong 1 xã/phường.
    Join bảng `projects` + `projects_detailed`.
    """
    get_ward_or_404(db, ward_id)
    rows = fetch_projects_by_ward(db, ward_id)
    projects = [row_to_project_dict(r) for r in rows]
    return ProjectListResponse(total=len(projects), projects=projects)

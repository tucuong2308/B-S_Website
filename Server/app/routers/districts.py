from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas import WardResponse, AvgPriceResponse, DistrictResponse
from app.services import (
    get_district_by_name,
    fetch_wards_by_district_name,
    calc_avg_price_by_district_name,
    fetch_districts_by_province_name,
    get_province_by_name,
)

router = APIRouter()


@router.get("", response_model=List[DistrictResponse])
def get_districts_by_province(
    province_name: str = Query(..., description="Tên tỉnh/thành phố (e.g., 'Hà Nội')"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả huyện thuộc 1 tỉnh theo tên tỉnh."""
    province = get_province_by_name(db, province_name)
    rows = fetch_districts_by_province_name(db, province_name)
    return [DistrictResponse(
        id=r.id, name=r.name, prefix=r.prefix,
        longitude=r.longitude, latitude=r.latitude
    ) for r in rows]


@router.get("/wards", response_model=List[WardResponse])
def get_wards_by_district(
    district_name: str = Query(..., description="Tên quận/huyện (e.g., 'Quận Ba Đình')"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả xã/phường thuộc 1 huyện theo tên huyện."""
    district = get_district_by_name(db, district_name)
    rows = fetch_wards_by_district_name(db, district_name)
    return [WardResponse(
        id=r.id, name=r.name, prefix=r.prefix,
        longitude=r.longitude, latitude=r.latitude
    ) for r in rows]


@router.get("/avg-price-per-m2", response_model=AvgPriceResponse)
def get_avg_price_by_district(
    district_name: str = Query(..., description="Tên quận/huyện (e.g., 'Quận Ba Đình')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản"),
    db: Session = Depends(get_db)
):
    """Tính giá trung bình/m² của tất cả listings trong 1 huyện."""
    district = get_district_by_name(db, district_name)
    avg_price, total = calc_avg_price_by_district_name(db, district_name, type_id)
    return AvgPriceResponse(
        id=district.id,
        name=district.name,
        avg_price_per_m2=avg_price,
        total_listings=total
    )

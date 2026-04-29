from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas import AvgPriceResponse, WardResponse
from app.services import (
    get_ward_by_name,
    calc_avg_price_by_ward_name,
    fetch_wards_by_district,
    fetch_wards_by_district_name,
    get_district_by_name,
)

router = APIRouter()


@router.get("/{district_id}", response_model=List[WardResponse])
def get_wards_by_district_id(
    district_id: str,
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả xã/phường thuộc 1 huyện theo ID huyện."""
    rows = fetch_wards_by_district(db, district_id)
    return [WardResponse(
        id=r.id, name=r.name, prefix=r.prefix,
        longitude=r.longitude, latitude=r.latitude
    ) for r in rows]


@router.get("", response_model=List[WardResponse])
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
def get_avg_price_by_ward(
    ward_name: str = Query(..., description="Tên xã/phường (e.g., 'Phường Phúc Xá')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản"),
    db: Session = Depends(get_db)
):
    """Tính giá trung bình/m² của tất cả listings trong 1 xã/phường."""
    ward = get_ward_by_name(db, ward_name)
    avg_price, total = calc_avg_price_by_ward_name(db, ward_name, type_id)
    return AvgPriceResponse(
        id=ward.id,
        name=ward.name,
        avg_price_per_m2=avg_price,
        total_listings=total
    )

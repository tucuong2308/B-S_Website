from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas import DistrictResponse, AvgPriceResponse, ProvinceResponse
from app.services import (
    get_province_by_name,
    fetch_districts_by_province,
    fetch_districts_by_province_name,
    calc_avg_price_by_province_name,
    fetch_all_provinces,
)

router = APIRouter()


@router.get("/", response_model=List[ProvinceResponse])
def get_all_provinces(
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả các tỉnh/thành phố."""
    rows = fetch_all_provinces(db)
    return [ProvinceResponse(
        id=r.id, name=r.name, prefix=getattr(r, 'prefix', None),
        longitude=getattr(r, 'longitude', None), latitude=getattr(r, 'latitude', None)
    ) for r in rows]


@router.get("/{province_id}/districts", response_model=List[DistrictResponse])
def get_districts_by_province_id(
    province_id: str,
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả huyện thuộc 1 tỉnh theo ID tỉnh."""
    rows = fetch_districts_by_province(db, province_id)
    return [DistrictResponse(
        id=r.id, name=r.name, prefix=r.prefix,
        longitude=r.longitude, latitude=r.latitude
    ) for r in rows]


@router.get("/districts", response_model=List[DistrictResponse])
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


@router.get("/avg-price-per-m2", response_model=AvgPriceResponse)
def get_avg_price_by_province(
    province_name: str = Query(..., description="Tên tỉnh/thành phố (e.g., 'Hà Nội')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản"),
    db: Session = Depends(get_db)
):
    """Tính giá trung bình/m² của tất cả listings trong 1 tỉnh."""
    province = get_province_by_name(db, province_name)
    avg_price, total = calc_avg_price_by_province_name(db, province_name, type_id)
    return AvgPriceResponse(
        id=province.id,
        name=province.name,
        avg_price_per_m2=avg_price,
        total_listings=total
    )

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional


def _build_avg_price_query(filter_col: str, type_id: Optional[str]) -> tuple:
    """Tạo câu query tính giá trung bình/m², hỗ trợ filter theo type_id."""
    query = f"""
        SELECT
            AVG(price / NULLIF(area, 0)) AS avg_price_per_m2,
            COUNT(*) AS total_listings
        FROM listings
        WHERE {filter_col} = :{filter_col}
          AND price > 0
          AND area > 0
    """
    if type_id:
        query += " AND type_id = :type_id"
    return query


def calc_avg_price(
    db: Session,
    filter_col: str,
    filter_val: str,
    type_id: Optional[str] = None
) -> tuple[Optional[float], int]:
    """
    Tính giá trung bình/m² và tổng số listings.

    Args:
        db: Database session
        filter_col: Cột filter ('province_id' | 'district_id' | 'ward_id')
        filter_val: Giá trị filter
        type_id: Lọc theo loại bất động sản (optional)

    Returns:
        (avg_price_per_m2, total_listings)
    """
    query = _build_avg_price_query(filter_col, type_id)
    params = {filter_col: filter_val}
    if type_id:
        params["type_id"] = type_id

    row = db.execute(text(query), params).fetchone()
    avg_price = float(row.avg_price_per_m2) if row.avg_price_per_m2 else None
    total = row.total_listings or 0
    return avg_price, total


# ── NEW: Calculate price by Name ─────────────────────────────────────────────

def calc_avg_price_by_province_name(
    db: Session,
    province_name: str,
    type_id: Optional[str] = None
) -> tuple[Optional[float], int]:
    """Calculate average price for a province by name"""
    from app.services.location import get_province_by_name
    province = get_province_by_name(db, province_name)
    return calc_avg_price(db, "province_id", province.id, type_id)


def calc_avg_price_by_district_name(
    db: Session,
    district_name: str,
    type_id: Optional[str] = None
) -> tuple[Optional[float], int]:
    """Calculate average price for a district by name"""
    from app.services.location import get_district_by_name
    district = get_district_by_name(db, district_name)
    return calc_avg_price(db, "district_id", district.id, type_id)


def calc_avg_price_by_ward_name(
    db: Session,
    ward_name: str,
    type_id: Optional[str] = None
) -> tuple[Optional[float], int]:
    """Calculate average price for a ward by name"""
    from app.services.location import get_ward_by_name
    ward = get_ward_by_name(db, ward_name)
    return calc_avg_price(db, "ward_id", ward.id, type_id)

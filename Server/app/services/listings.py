"""
Service lấy thông tin danh sách nhà (listings) theo vị trí.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List


def fetch_listings_by_district_name(
    db: Session,
    district_name: str,
    type_id: Optional[str] = None,
    limit: int = 100,
) -> List[dict]:
    """
    Lấy danh sách listings (nhà) trong 1 huyện theo tên huyện.
    
    Args:
        db: Database session
        district_name: Tên quận/huyện (e.g., 'Quận 1', 'Huyện Bình Chánh')
        type_id: Lọc theo loại bất động sản (optional)
        limit: Số kết quả tối đa (mặc định 100)
    
    Returns:
        List[{id, price, area, price_per_m2, type_id, 
              district_name, ward_name, longitude, latitude, published_at}]
    """
    type_filter = "AND l.type_id = :type_id" if type_id else ""
    
    query = f"""
        SELECT
            l.id,
            l.price,
            l.area,
            ROUND(l.price / NULLIF(l.area, 0), 2) AS price_per_m2,
            l.type_id,
            d.name AS district_name,
            w.name AS ward_name,
            l.longitude,
            l.latitude,
            l.published_at
        FROM listings l
        INNER JOIN districts d ON d.id = l.district_id
        LEFT JOIN wards w ON w.id = l.ward_id
        WHERE
            LOWER(d.name) = LOWER(:district_name)
            AND l.price > 0
            AND l.area > 0
            {type_filter}
        ORDER BY l.published_at DESC
        LIMIT :limit
    """
    
    params = {
        "district_name": district_name.strip(),
        "limit": limit,
    }
    if type_id:
        params["type_id"] = type_id
    
    rows = db.execute(text(query), params).fetchall()
    
    return [
        {
            "id": row.id,
            "price": float(row.price) if row.price else None,
            "area": float(row.area) if row.area else None,
            "price_per_m2": float(row.price_per_m2) if row.price_per_m2 else None,
            "type_id": row.type_id,
            "district_name": row.district_name,
            "ward_name": row.ward_name,
            "longitude": float(row.longitude) if row.longitude else None,
            "latitude": float(row.latitude) if row.latitude else None,
            "published_at": row.published_at.isoformat() if row.published_at else None,
        }
        for row in rows
    ]


def fetch_listings_by_ward_name(
    db: Session,
    ward_name: str,
    type_id: Optional[str] = None,
    limit: int = 100,
) -> List[dict]:
    """
    Lấy danh sách listings (nhà) trong 1 xã/phường theo tên xã/phường.
    
    Args:
        db: Database session
        ward_name: Tên xã/phường (e.g., 'Phường Phúc Xá', 'Xã Tân Lập')
        type_id: Lọc theo loại bất động sản (optional)
        limit: Số kết quả tối đa (mặc định 100)
    
    Returns:
        List[{id, price, area, price_per_m2, type_id, 
              district_name, ward_name, longitude, latitude, published_at}]
    """
    type_filter = "AND l.type_id = :type_id" if type_id else ""
    
    query = f"""
        SELECT
            l.id,
            l.price,
            l.area,
            ROUND(l.price / NULLIF(l.area, 0), 2) AS price_per_m2,
            l.type_id,
            d.name AS district_name,
            w.name AS ward_name,
            l.longitude,
            l.latitude,
            l.published_at
        FROM listings l
        INNER JOIN wards w ON w.id = l.ward_id
        INNER JOIN districts d ON d.id = l.district_id
        WHERE
            LOWER(w.name) = LOWER(:ward_name)
            AND l.price > 0
            AND l.area > 0
            {type_filter}
        ORDER BY l.published_at DESC
        LIMIT :limit
    """
    
    params = {
        "ward_name": ward_name.strip(),
        "limit": limit,
    }
    if type_id:
        params["type_id"] = type_id
    
    rows = db.execute(text(query), params).fetchall()
    
    return [
        {
            "id": row.id,
            "price": float(row.price) if row.price else None,
            "area": float(row.area) if row.area else None,
            "price_per_m2": float(row.price_per_m2) if row.price_per_m2 else None,
            "type_id": row.type_id,
            "district_name": row.district_name,
            "ward_name": row.ward_name,
            "longitude": float(row.longitude) if row.longitude else None,
            "latitude": float(row.latitude) if row.latitude else None,
            "published_at": row.published_at.isoformat() if row.published_at else None,
        }
        for row in rows
    ]

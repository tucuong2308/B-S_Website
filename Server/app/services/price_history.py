"""
Service tính giá trung bình/m² theo tháng trong bán kính 1km.

Dùng công thức Haversine trực tiếp trong SQL (PostgreSQL):
  - earth_distance ≈ 2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlon/2)))
  - R = 6371000 m
  - Điều kiện: distance <= 1000m (1km)
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta


# ── Haversine filter trong SQL ────────────────────────────────────────────────
_HAVERSINE_SQL = """
    (
        2 * 6371000 * asin(
            sqrt(
                power(sin(radians(CAST(l.latitude AS double precision) - :lat) / 2), 2)
                + cos(radians(:lat))
                * cos(radians(CAST(l.latitude AS double precision)))
                * power(sin(radians(CAST(l.longitude AS double precision) - :lon) / 2), 2)
            )
        )
    ) <= 1000
"""

# Bounding box: 1km ≈ 0.009 degrees (1km / 111km per degree)
_BOUNDING_BOX_BUFFER = 0.01


def _get_bounding_box(lon: float, lat: float) -> tuple[float, float, float, float]:
    """Return (min_lon, max_lon, min_lat, max_lat) for bounding box around point."""
    return (
        lon - _BOUNDING_BOX_BUFFER,
        lon + _BOUNDING_BOX_BUFFER,
        lat - _BOUNDING_BOX_BUFFER,
        lat + _BOUNDING_BOX_BUFFER,
    )


def calc_monthly_avg_price_in_radius(
    db: Session,
    lon: float,
    lat: float,
    type_id: Optional[str] = None,
    months: int = 12,
) -> list[dict]:
    """
    Tính giá trung bình/m² theo từng tháng trong 12 tháng gần nhất,
    cho các listings trong bán kính 1km quanh tọa độ (lon, lat).

    OPTIMIZED: Single query with GROUP BY instead of 12 separate queries

    Args:
        db       : DB session
        lon, lat : Tọa độ trung tâm
        type_id  : Lọc theo loại BĐS (optional)
        months   : Số tháng truy vấn (mặc định 12)

    Returns:
        List[{month, year, avg_price_per_m2, total_listings}]
        Sắp xếp từ tháng cũ nhất -> mới nhất
    """
    now = datetime.now(tz=timezone.utc)

    # Calculate date range
    months_back = now - relativedelta(months=months-1)

    # Get bounding box to filter candidates first (fast filtering)
    min_lon, max_lon, min_lat, max_lat = _get_bounding_box(lon, lat)

    # Type filter
    type_filter = "AND l.type_id = :type_id" if type_id else ""

    # Optimized query: Bounding box FIRST (fast), then Haversine SECOND (precise)
    query = f"""
        SELECT
            EXTRACT(YEAR FROM l.published_at)::int   AS year,
            EXTRACT(MONTH FROM l.published_at)::int  AS month,
            AVG(l.price / NULLIF(l.area, 0))         AS avg_price_per_m2,
            COUNT(*)                                   AS total_listings
        FROM listings l
        WHERE
            l.price     > 0
            AND l.area  > 0
            AND l.latitude  IS NOT NULL
            AND l.longitude IS NOT NULL
            AND l.published_at >= :date_start
            AND l.published_at < :date_end
            AND l.longitude BETWEEN :min_lon AND :max_lon
            AND l.latitude BETWEEN :min_lat AND :max_lat
            AND {_HAVERSINE_SQL}
            {type_filter}
        GROUP BY 
            EXTRACT(YEAR FROM l.published_at),
            EXTRACT(MONTH FROM l.published_at)
        ORDER BY year ASC, month ASC
    """

    params = {
        "lat": lat,
        "lon": lon,
        "min_lon": min_lon,
        "max_lon": max_lon,
        "min_lat": min_lat,
        "max_lat": max_lat,
        "date_start": months_back.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        "date_end": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + relativedelta(months=1),
    }
    if type_id:
        params["type_id"] = type_id

    rows = db.execute(text(query), params).fetchall()
    
    # Convert to list of dicts
    results = [
        {
            "year": int(row.year),
            "month": int(row.month),
            "avg_price_per_m2": float(row.avg_price_per_m2) if row.avg_price_per_m2 else None,
            "total_listings": int(row.total_listings) if row.total_listings else 0,
        }
        for row in rows
    ]

    return results


def calc_monthly_avg_price_by_district_name(
    db: Session,
    district_name: str,
    type_id: Optional[str] = None,
    months: int = 12,
) -> tuple[dict | None, list[dict]]:
    """
    Tìm huyện theo tên và tính giá trung bình/m² theo từng tháng 
    trong 12 tháng gần nhất.
    
    OPTIMIZED: Single query with GROUP BY instead of 12 separate queries

    Args:
        db            : DB session
        district_name : Tên huyện cần tìm (ví dụ: "Quận 1", "Huyện Bình Chánh")
        type_id       : Lọc theo loại BĐS (optional)
        months        : Số tháng (mặc định 12)

    Returns:
        (district_info, monthly_prices)
        district_info = {id, name, province_id, province_name} hoặc None nếu không tìm thấy
        monthly_prices = List[{year, month, avg_price_per_m2, total_listings}]
    """
    # 1. Tìm huyện theo tên — ILIKE để không phân biệt hoa thường
    district_row = db.execute(
        text("""
            SELECT d.id, d.name, d.province_id, p.name AS province_name
            FROM districts d
            LEFT JOIN provinces p ON p.id = d.province_id
            WHERE d.name ILIKE :name
            LIMIT 1
        """),
        {"name": f"%{district_name}%"}
    ).fetchone()

    if not district_row:
        return None, []

    district_info = {
        "id":            district_row.id,
        "name":          district_row.name,
        "province_id":   district_row.province_id,
        "province_name": district_row.province_name,
    }

    # 2. Tính date range
    now = datetime.now(tz=timezone.utc)
    months_back = now - relativedelta(months=months-1)

    # 3. Optimized query: Single GROUP BY instead of 12 separate queries
    type_filter = "AND l.type_id = :type_id" if type_id else ""
    query = f"""
        SELECT
            EXTRACT(YEAR FROM l.published_at)::int   AS year,
            EXTRACT(MONTH FROM l.published_at)::int  AS month,
            AVG(l.price / NULLIF(l.area, 0))         AS avg_price_per_m2,
            COUNT(*)                                   AS total_listings
        FROM listings l
        WHERE
            l.district_id = :district_id
            AND l.price   > 0
            AND l.area    > 0
            AND l.published_at >= :date_start
            AND l.published_at < :date_end
            {type_filter}
        GROUP BY 
            EXTRACT(YEAR FROM l.published_at),
            EXTRACT(MONTH FROM l.published_at)
        ORDER BY year ASC, month ASC
    """

    params: dict = {
        "district_id": district_row.id,
        "date_start": months_back.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        "date_end": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + relativedelta(months=1),
    }
    if type_id:
        params["type_id"] = type_id

    rows = db.execute(text(query), params).fetchall()
    
    # Convert to list of dicts
    results = [
        {
            "year":             int(row.year),
            "month":            int(row.month),
            "avg_price_per_m2": float(row.avg_price_per_m2) if row.avg_price_per_m2 else None,
            "total_listings":   int(row.total_listings) if row.total_listings else 0,
        }
        for row in rows
    ]

    return district_info, results


def calc_monthly_avg_price_by_province_name(
    db: Session,
    province_name: str,
    type_id: Optional[str] = None,
    months: int = 12,
) -> tuple[dict | None, list[dict]]:
    """
    Tìm tỉnh/thành phố theo tên và tính giá trung bình/m² theo từng tháng 
    trong 12 tháng gần nhất.
    
    OPTIMIZED: Single query with GROUP BY instead of 12 separate queries

    Args:
        db            : DB session
        province_name : Tên tỉnh/thành phố cần tìm (ví dụ: "Hà Nội", "TP.HCM")
        type_id       : Lọc theo loại BĐS (optional)
        months        : Số tháng (mặc định 12)

    Returns:
        (province_info, monthly_prices)
        province_info = {id, name} hoặc None nếu không tìm thấy
        monthly_prices = List[{year, month, avg_price_per_m2, total_listings}]
    """
    # 1. Tìm tỉnh theo tên — ILIKE để không phân biệt hoa thường
    province_row = db.execute(
        text("""
            SELECT p.id, p.name
            FROM provinces p
            WHERE p.name ILIKE :name
            LIMIT 1
        """),
        {"name": f"%{province_name}%"}
    ).fetchone()

    if not province_row:
        return None, []

    province_info = {
        "id":   province_row.id,
        "name": province_row.name,
    }

    # 2. Tính date range
    now = datetime.now(tz=timezone.utc)
    months_back = now - relativedelta(months=months-1)

    # 3. Optimized query: Single GROUP BY instead of 12 separate queries
    type_filter = "AND l.type_id = :type_id" if type_id else ""
    query = f"""
        SELECT
            EXTRACT(YEAR FROM l.published_at)::int   AS year,
            EXTRACT(MONTH FROM l.published_at)::int  AS month,
            AVG(l.price / NULLIF(l.area, 0))         AS avg_price_per_m2,
            COUNT(*)                                   AS total_listings
        FROM listings l
        INNER JOIN districts d ON d.id = l.district_id
        WHERE
            d.province_id = :province_id
            AND l.price   > 0
            AND l.area    > 0
            AND l.published_at >= :date_start
            AND l.published_at < :date_end
            {type_filter}
        GROUP BY 
            EXTRACT(YEAR FROM l.published_at),
            EXTRACT(MONTH FROM l.published_at)
        ORDER BY year ASC, month ASC
    """

    params: dict = {
        "province_id": province_row.id,
        "date_start": months_back.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        "date_end": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + relativedelta(months=1),
    }
    if type_id:
        params["type_id"] = type_id

    rows = db.execute(text(query), params).fetchall()
    
    # Convert to list of dicts
    results = [
        {
            "year":             int(row.year),
            "month":            int(row.month),
            "avg_price_per_m2": float(row.avg_price_per_m2) if row.avg_price_per_m2 else None,
            "total_listings":   int(row.total_listings) if row.total_listings else 0,
        }
        for row in rows
    ]

    return province_info, results

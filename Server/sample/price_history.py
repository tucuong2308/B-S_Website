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

    # Tạo danh sách (year, month) cho 12 tháng gần nhất
    periods = []
    for i in range(months - 1, -1, -1):
        dt = now - relativedelta(months=i)
        periods.append((dt.year, dt.month))

    results = []
    for year, month in periods:
        type_filter = "AND l.type_id = :type_id" if type_id else ""
        query = f"""
            SELECT
                AVG(l.price / NULLIF(l.area, 0)) AS avg_price_per_m2,
                COUNT(*)                          AS total_listings
            FROM listings l
            WHERE
                l.price     > 0
                AND l.area  > 0
                AND l.latitude  IS NOT NULL
                AND l.longitude IS NOT NULL
                AND EXTRACT(YEAR  FROM l.published_at) = :year
                AND EXTRACT(MONTH FROM l.published_at) = :month
                AND {_HAVERSINE_SQL}
                {type_filter}
        """
        params: dict = {"lat": lat, "lon": lon, "year": year, "month": month}
        if type_id:
            params["type_id"] = type_id

        row = db.execute(text(query), params).fetchone()
        results.append({
            "year":             year,
            "month":            month,
            "avg_price_per_m2": float(row.avg_price_per_m2) if row.avg_price_per_m2 else None,
            "total_listings":   int(row.total_listings) if row.total_listings else 0,
        })

    return results


def calc_monthly_avg_price_by_district_name(
    db: Session,
    district_name: str,
    type_id: Optional[str] = None,
    months: int = 12,
) -> tuple[dict | None, list[dict]]:
    """
    Tìm huyện theo tên (ILIKE, không phân biệt hoa thường + dấu),
    rồi tính giá trung bình/m² theo từng tháng trong 12 tháng gần nhất.

    Args:
        db            : DB session
        district_name : Tên huyện cần tìm (ví dụ: "Quận 1", "Huyện Bình Chánh")
        type_id       : Lọc theo loại BĐS (optional)
        months        : Số tháng (mặc định 12)

    Returns:
        (district_info, monthly_prices)
        district_info = {id, name, province_id} hoặc None nếu không tìm thấy
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

    # 2. Tạo danh sách 12 tháng gần nhất
    now = datetime.now(tz=timezone.utc)
    periods = []
    for i in range(months - 1, -1, -1):
        dt = now - relativedelta(months=i)
        periods.append((dt.year, dt.month))

    # 3. Tính giá từng tháng theo district_id
    results = []
    for year, month in periods:
        type_filter = "AND l.type_id = :type_id" if type_id else ""
        query = f"""
            SELECT
                AVG(l.price / NULLIF(l.area, 0)) AS avg_price_per_m2,
                COUNT(*)                          AS total_listings
            FROM listings l
            WHERE
                l.district_id = :district_id
                AND l.price   > 0
                AND l.area    > 0
                AND EXTRACT(YEAR  FROM l.published_at) = :year
                AND EXTRACT(MONTH FROM l.published_at) = :month
                {type_filter}
        """
        params: dict = {
            "district_id": district_row.id,
            "year": year,
            "month": month,
        }
        if type_id:
            params["type_id"] = type_id

        row = db.execute(text(query), params).fetchone()
        results.append({
            "year":             year,
            "month":            month,
            "avg_price_per_m2": float(row.avg_price_per_m2) if row.avg_price_per_m2 else None,
            "total_listings":   int(row.total_listings) if row.total_listings else 0,
        })

    return district_info, results

"""
Service lấy thông tin dự án bất động sản.
Join bảng projects + projects_detailed để có đầy đủ thông tin.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional


_PROJECT_JOIN_QUERY = """
    SELECT
        p.id,
        p.name,
        p.description,
        p.province_id,
        p.province_name,
        p.district_id,
        p.district_name,
        p.ward_id,
        p.ward_name,
        p.address,
        p.longitude,
        p.latitude,
        p.total_area,
        p.total_buildings,
        p.total_apartments,
        p.total_floors,
        p.start_time,
        p.completion_time,
        p.total_investment,
        p.building_density,
        -- Từ projects_detailed
        pd.status,
        pd.progress,
        pd.juridical,
        pd.ownership,
        pd."lowestPriceByM2"   AS lowest_price_per_m2,
        pd."highestPriceByM2"  AS highest_price_per_m2,
        pd."lowestPriceByProduct"  AS lowest_price_per_product,
        pd."highestPriceByProduct" AS highest_price_per_product,
        pd.logo,
        pd.banner,
        pd.utilities,
        pd."salePolicy"        AS sale_policy,
        pd."isPublished"       AS is_published,
        pd."publishedAt"       AS published_at
    FROM projects p
    LEFT JOIN projects_detailed pd ON pd."shortId"::text = p.id
    WHERE {filter_clause}
    ORDER BY p.name
"""


def fetch_projects_by_district(db: Session, district_id: str) -> list:
    """Lấy tất cả dự án trong 1 huyện (join projects + projects_detailed)."""
    query = _PROJECT_JOIN_QUERY.format(filter_clause="p.district_id = :filter_val")
    return db.execute(text(query), {"filter_val": district_id}).fetchall()


def fetch_projects_by_ward(db: Session, ward_id: str) -> list:
    """Lấy tất cả dự án trong 1 xã/phường (join projects + projects_detailed)."""
    query = _PROJECT_JOIN_QUERY.format(filter_clause="p.ward_id = :filter_val")
    return db.execute(text(query), {"filter_val": ward_id}).fetchall()


def row_to_project_dict(row) -> dict:
    """Chuyển SQLAlchemy row thành dict, bỏ qua các field None."""
    return {
        "id":                    row.id,
        "name":                  row.name,
        "description":           row.description,
        "address":               row.address,
        "province_id":           row.province_id,
        "province_name":         row.province_name,
        "district_id":           row.district_id,
        "district_name":         row.district_name,
        "ward_id":               row.ward_id,
        "ward_name":             row.ward_name,
        "longitude":             row.longitude,
        "latitude":              row.latitude,
        "total_area":            row.total_area,
        "total_buildings":       row.total_buildings,
        "total_apartments":      row.total_apartments,
        "total_floors":          row.total_floors,
        "total_investment":      row.total_investment,
        "building_density":      row.building_density,
        "start_time":            row.start_time,
        "completion_time":       row.completion_time,
        # Từ projects_detailed
        "status":                row.status,
        "progress":              row.progress,
        "juridical":             row.juridical,
        "ownership":             row.ownership,
        "lowest_price_per_m2":   row.lowest_price_per_m2,
        "highest_price_per_m2":  row.highest_price_per_m2,
        "lowest_price_per_product":  row.lowest_price_per_product,
        "highest_price_per_product": row.highest_price_per_product,
        "logo":                  row.logo,
        "banner":                row.banner,
        "sale_policy":           row.sale_policy,
        "is_published":          row.is_published,
        "published_at":          row.published_at,
    }

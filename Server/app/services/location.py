from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from fastapi import HTTPException


def get_province_or_404(db: Session, province_id: str):
    row = db.execute(
        text("SELECT id, name FROM provinces WHERE id = :id"),
        {"id": province_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tỉnh với id '{province_id}'")
    return row


def get_district_or_404(db: Session, district_id: str):
    row = db.execute(
        text("SELECT id, name FROM districts WHERE id = :id"),
        {"id": district_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy huyện với id '{district_id}'")
    return row


def get_ward_or_404(db: Session, ward_id: str):
    row = db.execute(
        text("SELECT id, name FROM wards WHERE id = :id"),
        {"id": ward_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy xã/phường với id '{ward_id}'")
    return row


def fetch_districts_by_province(db: Session, province_id: str) -> List:
    return db.execute(
        text("""
            SELECT id, name, prefix, longitude, latitude
            FROM districts
            WHERE province_id = :province_id
            ORDER BY name
        """),
        {"province_id": province_id}
    ).fetchall()


def fetch_wards_by_district(db: Session, district_id: str) -> List:
    return db.execute(
        text("""
            SELECT id, name, prefix, longitude, latitude
            FROM wards
            WHERE district_id = :district_id
            ORDER BY name
        """),
        {"district_id": district_id}
    ).fetchall()


# ── NEW: Search by Name functions ────────────────────────────────────────────

def get_province_by_name(db: Session, province_name: str):
    """Get province by name (case-insensitive search)"""
    row = db.execute(
        text("SELECT id, name FROM provinces WHERE LOWER(name) = LOWER(:name)"),
        {"name": province_name.strip()}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tỉnh '{province_name}'")
    return row


def get_district_by_name(db: Session, district_name: str):
    """Get district by name (case-insensitive search)"""
    row = db.execute(
        text("SELECT id, name FROM districts WHERE LOWER(name) = LOWER(:name)"),
        {"name": district_name.strip()}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy huyện '{district_name}'")
    return row


def get_ward_by_name(db: Session, ward_name: str):
    """Get ward by name (case-insensitive search)"""
    row = db.execute(
        text("SELECT id, name FROM wards WHERE LOWER(name) = LOWER(:name)"),
        {"name": ward_name.strip()}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy xã/phường '{ward_name}'")
    return row


def fetch_districts_by_province_name(db: Session, province_name: str) -> List:
    """Get all districts by province name"""
    # First get province ID by name
    province = get_province_by_name(db, province_name)
    return db.execute(
        text("""
            SELECT id, name, prefix, longitude, latitude
            FROM districts
            WHERE province_id = :province_id
            ORDER BY name
        """),
        {"province_id": province.id}
    ).fetchall()


def fetch_wards_by_district_name(db: Session, district_name: str) -> List:
    """Get all wards by district name"""
    # First get district ID by name
    district = get_district_by_name(db, district_name)
    return db.execute(
        text("""
            SELECT id, name, prefix, longitude, latitude
            FROM wards
            WHERE district_id = :district_id
            ORDER BY name
        """),
        {"district_id": district.id}
    ).fetchall()


def fetch_all_provinces(db: Session) -> List:
    """Get all provinces from the database"""
    return db.execute(
        text("""
            SELECT id, name, prefix, longitude, latitude
            FROM provinces
            ORDER BY name
        """)
    ).fetchall()

"""
Router cho các endpoint mới:
  POST /api/v1/price/by-address              — Giá TB/m² theo địa chỉ + bán kính 1km (12 tháng)
  GET  /api/v1/price/by-district-name        — Giá TB/m² theo tên huyện (12 tháng)
  GET  /api/v1/price/by-province-name        — Giá TB/m² theo tên tỉnh (12 tháng)
  GET  /api/v1/projects/district             — Tất cả dự án trong 1 huyện
  GET  /api/v1/projects/ward                 — Tất cả dự án trong 1 xã/phường
  GET  /api/v1/listings/by-district          — Danh sách nhà trong 1 huyện
  GET  /api/v1/listings/by-ward              — Danh sách nhà trong 1 xã/phường
"""
import logging
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.schemas import AddressPriceResponse, ProjectListResponse, DistrictMonthlyPriceResponse, ProvinceMonthlyPriceResponse
from app.services.geocoding import geocode_nominatim_sync, geocode_mapbox_sync
from app.services.price_history import calc_monthly_avg_price_in_radius, calc_monthly_avg_price_by_district_name, calc_monthly_avg_price_by_province_name
from app.services.projects import fetch_projects_by_district, fetch_projects_by_ward, row_to_project_dict
from app.services.listings import fetch_listings_by_district_name, fetch_listings_by_ward_name
from app.services.location import get_district_by_name, get_ward_by_name

logger = logging.getLogger(__name__)
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
def get_price_by_address(
    body: AddressPriceRequest = Body(...),
    db: Session = Depends(get_db),
):
    """
    Nhận địa chỉ và loại BĐS, trả về giá trung bình/m² trong bán kính 1km
    cho 12 tháng gần nhất.
    
    Geocoding (tự động):
    - Thử Nominatim (OpenStreetMap) trước - miễn phí
    - Fallback sang Mapbox nếu Nominatim thất bại - sử dụng API key từ config
    """
    try:
        logger.info(f"[price/by-address] START - address={body.address}, type_id={body.type_id}")
        
        # 1. Try Nominatim first
        logger.info(f"[price/by-address] Calling Nominatim...")
        geocode_source = "nominatim"
        coords = geocode_nominatim_sync(body.address)
        
        # 2. If Nominatim fails, try Mapbox as fallback
        if not coords:
            logger.warning(f"[price/by-address] Nominatim failed - trying Mapbox fallback...")
            coords = geocode_mapbox_sync(body.address)
            geocode_source = "mapbox"
        
        # 3. If both fail, return error
        if not coords:
            logger.error(f"[price/by-address] Both Nominatim and Mapbox failed for address: {body.address}")
            raise HTTPException(
                status_code=422,
                detail=f"Không thể xác định tọa độ cho địa chỉ '{body.address}'. Vui lòng thử địa chỉ rõ ràng hơn."
            )

        lon, lat = coords
        logger.info(f"[price/by-address] Got coordinates via {geocode_source}: lon={lon}, lat={lat}")

        # 4. Query database for prices
        monthly = []
        try:
            logger.info(f"[price/by-address] Querying database for prices...")
            monthly = calc_monthly_avg_price_in_radius(
                db=db,
                lon=lon,
                lat=lat,
                type_id=body.type_id,
                months=12,
            )
            logger.info(f"[price/by-address] Got {len(monthly)} months of data")
        except Exception as e:
            logger.error(f"[price/by-address] Database error: {type(e).__name__}: {e}")
            monthly = []

        logger.info(f"[price/by-address] SUCCESS - Returning response")
        return AddressPriceResponse(
            address=body.address,
            type_id=body.type_id,
            geocode_source=geocode_source,
            longitude=lon,
            latitude=lat,
            radius_meters=1000,
            monthly_prices=monthly,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[price/by-address] ERROR: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


# ── Endpoint 2: Tất cả dự án trong 1 huyện ───────────────────────────────────

@router.get("/projects/district", response_model=ProjectListResponse)
def get_projects_by_district(
    district_name: str = Query(..., description="Tên quận/huyện (e.g., 'Quận Ba Đình')"),
    db: Session = Depends(get_db),
):
    """Lấy tất cả dự án trong 1 huyện theo tên huyện."""
    district = get_district_by_name(db, district_name)
    rows = fetch_projects_by_district(db, district.id)
    projects = [row_to_project_dict(r) for r in rows]
    return ProjectListResponse(total=len(projects), projects=projects)


# ── Endpoint 3: Tất cả dự án trong 1 xã/phường ───────────────────────────────

@router.get("/projects/ward", response_model=ProjectListResponse)
def get_projects_by_ward(
    ward_name: str = Query(..., description="Tên xã/phường (e.g., 'Phường Phúc Xá')"),
    db: Session = Depends(get_db),
):
    """Lấy tất cả dự án trong 1 xã/phường theo tên xã/phường."""
    ward = get_ward_by_name(db, ward_name)
    rows = fetch_projects_by_ward(db, ward.id)
    projects = [row_to_project_dict(r) for r in rows]
    return ProjectListResponse(total=len(projects), projects=projects)


# ── Endpoint 4: Giá TB/m² theo tên huyện (12 tháng) ─────────────────────────

@router.get("/price/by-district-name", response_model=DistrictMonthlyPriceResponse)
def get_price_by_district_name(
    district_name: str = Query(..., description="Tên quận/huyện (e.g., 'Quận 1', 'Huyện Bình Chánh')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản (optional)"),
    db: Session = Depends(get_db),
):
    """
    Lấy giá trung bình/m² theo tháng cho một huyện trong 12 tháng gần nhất.
    
    Args:
        district_name: Tên quận/huyện (không phân biệt hoa thường)
        type_id: Loại bất động sản để lọc (optional)
    
    Returns:
        DistrictMonthlyPriceResponse với thông tin huyện và giá theo từng tháng
    """
    try:
        logger.info(f"[price/by-district-name] START - district_name={district_name}, type_id={type_id}")
        
        # Tìm huyện và tính giá
        district_info, monthly_prices = calc_monthly_avg_price_by_district_name(
            db=db,
            district_name=district_name,
            type_id=type_id,
            months=12,
        )
        
        if not district_info:
            logger.warning(f"[price/by-district-name] District not found: {district_name}")
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy huyện '{district_name}'"
            )
        
        logger.info(f"[price/by-district-name] SUCCESS - Found {len(monthly_prices)} months of data")
        return DistrictMonthlyPriceResponse(
            district_id=district_info["id"],
            district_name=district_info["name"],
            province_id=district_info.get("province_id"),
            province_name=district_info.get("province_name"),
            type_id=type_id,
            months=12,
            monthly_prices=monthly_prices,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[price/by-district-name] ERROR: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


# ── Endpoint 5: Giá TB/m² theo tên tỉnh/thành phố (12 tháng) ──────────────────

@router.get("/price/by-province-name", response_model=ProvinceMonthlyPriceResponse)
def get_price_by_province_name(
    province_name: str = Query(..., description="Tên tỉnh/thành phố (e.g., 'Hà Nội', 'TP.HCM')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản (optional)"),
    db: Session = Depends(get_db),
):
    """
    Lấy giá trung bình/m² theo tháng cho một tỉnh/thành phố trong 12 tháng gần nhất.
    
    Args:
        province_name: Tên tỉnh/thành phố (không phân biệt hoa thường)
        type_id: Loại bất động sản để lọc (optional)
    
    Returns:
        ProvinceMonthlyPriceResponse với thông tin tỉnh và giá theo từng tháng
    """
    try:
        logger.info(f"[price/by-province-name] START - province_name={province_name}, type_id={type_id}")
        
        # Tìm tỉnh và tính giá
        province_info, monthly_prices = calc_monthly_avg_price_by_province_name(
            db=db,
            province_name=province_name,
            type_id=type_id,
            months=12,
        )
        
        if not province_info:
            logger.warning(f"[price/by-province-name] Province not found: {province_name}")
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy tỉnh/thành phố '{province_name}'"
            )
        
        logger.info(f"[price/by-province-name] SUCCESS - Found {len(monthly_prices)} months of data")
        return ProvinceMonthlyPriceResponse(
            province_id=province_info["id"],
            province_name=province_info["name"],
            type_id=type_id,
            months=12,
            monthly_prices=monthly_prices,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[price/by-province-name] ERROR: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


# ── Endpoint 6: Danh sách nhà trong 1 huyện ──────────────────────────────────

@router.get("/listings/by-district")
def get_listings_by_district(
    district_name: str = Query(..., description="Tên quận/huyện (e.g., 'Quận 1', 'Quận Ba Đình')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản (optional)"),
    limit: int = Query(100, description="Số kết quả tối đa (mặc định 100)", ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách tất cả nhà/bất động sản trong 1 huyện theo tên huyện.
    
    Returns:
        List[{id, price, area, price_per_m2, type_id, 
              district_name, ward_name, longitude, latitude, published_at}]
    """
    try:
        logger.info(f"[listings/by-district] START - district_name={district_name}, type_id={type_id}, limit={limit}")
        
        # Verify district exists
        district = get_district_by_name(db, district_name)
        logger.info(f"[listings/by-district] Found district: {district.name}")
        
        # Fetch listings
        listings = fetch_listings_by_district_name(
            db=db,
            district_name=district_name,
            type_id=type_id,
            limit=limit,
        )
        
        logger.info(f"[listings/by-district] SUCCESS - Found {len(listings)} listings")
        return {
            "total": len(listings),
            "district_name": district.name,
            "type_id": type_id,
            "listings": listings,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[listings/by-district] ERROR: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


# ── Endpoint 7: Danh sách nhà trong 1 xã/phường ──────────────────────────────

@router.get("/listings/by-ward")
def get_listings_by_ward(
    ward_name: str = Query(..., description="Tên xã/phường (e.g., 'Phường Phúc Xá', 'Xã Tân Lập')"),
    type_id: Optional[str] = Query(None, description="Lọc theo loại bất động sản (optional)"),
    limit: int = Query(100, description="Số kết quả tối đa (mặc định 100)", ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách tất cả nhà/bất động sản trong 1 xã/phường theo tên xã/phường.
    
    Returns:
        List[{id, price, area, price_per_m2, type_id, 
              district_name, ward_name, longitude, latitude, published_at}]
    """
    try:
        logger.info(f"[listings/by-ward] START - ward_name={ward_name}, type_id={type_id}, limit={limit}")
        
        # Verify ward exists
        ward = get_ward_by_name(db, ward_name)
        logger.info(f"[listings/by-ward] Found ward: {ward.name}")
        
        # Fetch listings
        listings = fetch_listings_by_ward_name(
            db=db,
            ward_name=ward_name,
            type_id=type_id,
            limit=limit,
        )
        
        logger.info(f"[listings/by-ward] SUCCESS - Found {len(listings)} listings")
        return {
            "total": len(listings),
            "ward_name": ward.name,
            "type_id": type_id,
            "listings": listings,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[listings/by-ward] ERROR: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )

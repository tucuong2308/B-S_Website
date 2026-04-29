"""
Geocoding service:
- Thử Nominatim (OpenStreetMap) trước — miễn phí, không cần key
- Fallback sang Mapbox nếu Nominatim thất bại — sử dụng API key từ config
"""
import httpx
import logging
from fastapi import HTTPException
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
MAPBOX_URL    = "https://api.mapbox.com/geocoding/v5/mapbox.places"


async def geocode_nominatim(address: str) -> Optional[tuple[float, float]]:
    """
    Gọi Nominatim để lấy tọa độ từ địa chỉ.
    Trả về (longitude, latitude) hoặc None nếu thất bại.
    """
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "countrycodes": "vn",
    }
    headers = {"User-Agent": "BatDongSanAPI/1.0"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            results = resp.json()
            if results:
                lon = float(results[0]["lon"])
                lat = float(results[0]["lat"])
                return lon, lat
            logger.warning("Nominatim: no results for address '%s'", address)
    except Exception as e:
        logger.warning("Nominatim geocoding failed for '%s': %s", address, e)
    return None


async def geocode_mapbox(address: str) -> Optional[tuple[float, float]]:
    """
    Gọi Mapbox Geocoding API để lấy tọa độ.
    Sử dụng API key từ settings.
    Trả về (longitude, latitude) hoặc None nếu thất bại.
    """
    url = f"{MAPBOX_URL}/{address}.json"
    params = {
        "access_token": settings.MAPBOX_API_KEY,
        "country": "VN",
        "limit": 1,
        "autocomplete": "true",
        "language": "vi",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            features = data.get("features", [])
            if features:
                lon, lat = features[0]["center"]
                return float(lon), float(lat)
            logger.warning("Mapbox: no features for address '%s'", address)
    except Exception as e:
        logger.warning("Mapbox geocoding failed for '%s': %s", address, e)
    return None


# ── Synchronous wrappers cho dùng trong sync context ────────────────────────

def geocode_nominatim_sync(address: str) -> Optional[tuple[float, float]]:
    """Synchronous wrapper cho geocode_nominatim — dùng httpx.Client trực tiếp."""
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "countrycodes": "vn",
    }
    headers = {"User-Agent": "BatDongSanAPI/1.0"}
    try:
        with httpx.Client(timeout=3.0) as client:  # Reduced from 10.0 to 3.0
            resp = client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            results = resp.json()
            if results:
                return float(results[0]["lon"]), float(results[0]["lat"])
            logger.warning("Nominatim: no results for address '%s'", address)
    except Exception as e:
        logger.warning("Nominatim geocoding failed for '%s': %s", address, e)
    return None


def geocode_mapbox_sync(address: str) -> Optional[tuple[float, float]]:
    """Synchronous wrapper cho geocode_mapbox — dùng httpx.Client trực tiếp."""
    url = f"{MAPBOX_URL}/{address}.json"
    params = {
        "access_token": settings.MAPBOX_API_KEY,
        "country": "VN",
        "limit": 1,
        "autocomplete": "true",
        "language": "vi",
    }
    try:
        with httpx.Client(timeout=3.0) as client:  # Reduced from 10.0 to 3.0
            resp = client.get(url, params=params)
            resp.raise_for_status()
            features = resp.json().get("features", [])
            if features:
                lon, lat = features[0]["center"]
                return float(lon), float(lat)
            logger.warning("Mapbox: no features for address '%s'", address)
    except Exception as e:
        logger.warning("Mapbox geocoding failed for '%s': %s", address, e)
    return None


async def geocode(address: str) -> tuple[float, float]:
    """
    Geocode địa chỉ - Quy trình:
    1. Thử Nominatim (OpenStreetMap) - miễn phí, không cần key
    2. Nếu thất bại -> thử Mapbox (sử dụng API key từ config)
    3. Nếu cả hai thất bại -> raise 422

    Returns:
        (longitude, latitude)
    """
    # Thử Nominatim trước
    coords = await geocode_nominatim(address)
    if coords:
        logger.info("Geocoding '%s' succeeded with Nominatim", address)
        return coords

    # Fallback sang Mapbox nếu Nominatim thất bại
    logger.info("Nominatim failed, trying Mapbox for '%s'", address)
    coords = await geocode_mapbox(address)
    if coords:
        logger.info("Geocoding '%s' succeeded with Mapbox", address)
        return coords

    # Nếu cả hai thất bại
    logger.error("Geocoding failed for address '%s' - both Nominatim and Mapbox returned no results", address)
    raise HTTPException(
        status_code=422,
        detail=(
            f"Không thể xác định tọa độ cho địa chỉ '{address}'. "
            "Vui lòng cung cấp địa chỉ rõ ràng hơn."
        )
    )

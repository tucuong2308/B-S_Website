from app.services.location import (
    get_province_or_404,
    get_district_or_404,
    get_ward_or_404,
    fetch_districts_by_province,
    fetch_wards_by_district,
    get_province_by_name,
    get_district_by_name,
    get_ward_by_name,
    fetch_districts_by_province_name,
    fetch_wards_by_district_name,
    fetch_all_provinces,
)
from app.services.Price import (
    calc_avg_price,
    calc_avg_price_by_province_name,
    calc_avg_price_by_district_name,
    calc_avg_price_by_ward_name,
)
from app.services.geocoding import geocode_nominatim, geocode_mapbox, geocode, geocode_nominatim_sync, geocode_mapbox_sync
from app.services.price_history import calc_monthly_avg_price_in_radius
from app.services.projects import fetch_projects_by_district, fetch_projects_by_ward, row_to_project_dict

__all__ = [
    # Old ID-based functions (kept for backward compatibility and tests)
    "get_province_or_404",
    "get_district_or_404",
    "get_ward_or_404",
    "fetch_districts_by_province",
    "fetch_wards_by_district",
    "fetch_all_provinces",
    "calc_avg_price",
    # New name-based functions
    "get_province_by_name",
    "get_district_by_name",
    "get_ward_by_name",
    "fetch_districts_by_province_name",
    "fetch_wards_by_district_name",
    "calc_avg_price_by_province_name",
    "calc_avg_price_by_district_name",
    "calc_avg_price_by_ward_name",
    # Geocoding
    "geocode_nominatim",
    "geocode_mapbox",
    "geocode",
    "geocode_nominatim_sync",
    "geocode_mapbox_sync",
    # Analytics
    "calc_monthly_avg_price_in_radius",
    "fetch_projects_by_district",
    "fetch_projects_by_ward",
    "row_to_project_dict",
]

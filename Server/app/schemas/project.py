from pydantic import BaseModel
from typing import Optional, List


# ── Endpoint 1: Giá theo địa chỉ ─────────────────────────────────────────────

class MonthlyPriceItem(BaseModel):
    year: int
    month: int
    avg_price_per_m2: Optional[float] = None
    total_listings: int


class AddressPriceResponse(BaseModel):
    address: str
    type_id: Optional[str] = None
    geocode_source: str          # "nominatim" | "mapbox"
    longitude: float
    latitude: float
    radius_meters: int = 1000
    monthly_prices: List[MonthlyPriceItem]


# ── Endpoint 2 & 3: Dự án theo huyện / xã ────────────────────────────────────

class ProjectResponse(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    province_id: Optional[str] = None
    province_name: Optional[str] = None
    district_id: Optional[str] = None
    district_name: Optional[str] = None
    ward_id: Optional[str] = None
    ward_name: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    total_area: Optional[str] = None
    total_buildings: Optional[str] = None
    total_apartments: Optional[str] = None
    total_floors: Optional[str] = None
    total_investment: Optional[str] = None
    building_density: Optional[str] = None
    start_time: Optional[str] = None
    completion_time: Optional[str] = None
    # Từ projects_detailed
    status: Optional[str] = None
    progress: Optional[str] = None
    juridical: Optional[str] = None
    ownership: Optional[str] = None
    lowest_price_per_m2: Optional[float] = None
    highest_price_per_m2: Optional[float] = None
    lowest_price_per_product: Optional[float] = None
    highest_price_per_product: Optional[float] = None
    logo: Optional[str] = None
    banner: Optional[str] = None
    sale_policy: Optional[str] = None
    is_published: Optional[bool] = None
    published_at: Optional[str] = None


class ProjectListResponse(BaseModel):
    total: int
    projects: list[ProjectResponse]


# ── Endpoint: Giá theo tên huyện ─────────────────────────────────────────────

class DistrictMonthlyPriceResponse(BaseModel):
    district_id: str
    district_name: str
    province_id: Optional[str] = None
    province_name: Optional[str] = None
    type_id: Optional[str] = None
    months: int = 12
    monthly_prices: list[MonthlyPriceItem]


# ── Endpoint: Giá theo tên tỉnh/thành phố ───────────────────────────────────

class ProvinceMonthlyPriceResponse(BaseModel):
    province_id: str
    province_name: str
    type_id: Optional[str] = None
    months: int = 12
    monthly_prices: list[MonthlyPriceItem]

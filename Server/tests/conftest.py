import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
from app.main import app
from app.database import get_db
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import app.routers.provinces
import app.routers.districts
import app.routers.wards
import app.routers.analytics


class MockRow:
    """Mock database row with proper attributes"""
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


def _generate_monthly_prices(type_id=None):
    """Generate 12 months of mock price data"""
    now = datetime.now(tz=timezone.utc)
    prices = []
    for i in range(12, 0, -1):
        dt = now - relativedelta(months=i)
        avg_price = 1500.0 if type_id != "nonexistent" else None
        listings = 100 if type_id != "nonexistent" else 0
        prices.append({
            "year": dt.year,
            "month": dt.month,
            "avg_price_per_m2": avg_price,
            "total_listings": listings,
        })
    return prices


@pytest.fixture
def client(monkeypatch):
    """FastAPI test client with mocked service functions."""
    from app.main import app as fastapi_app
    import app.routers.provinces
    import app.routers.districts
    import app.routers.wards
    import app.routers.analytics
    
    mock_db = MagicMock()
    
    def override_get_db():
        return mock_db
    
    fastapi_app.dependency_overrides[get_db] = override_get_db
    
    # Monkeypatch functions in the router modules WHERE THEY'RE IMPORTED
    monkeypatch.setattr(app.routers.provinces, 'get_province_by_name', mock_get_province_by_name)
    monkeypatch.setattr(app.routers.provinces, 'fetch_districts_by_province_name', mock_fetch_districts_by_name)
    monkeypatch.setattr(app.routers.provinces, 'calc_avg_price_by_province_name', mock_calc_avg_price_by_province_name)
    
    monkeypatch.setattr(app.routers.districts, 'get_province_by_name', mock_get_province_by_name)
    monkeypatch.setattr(app.routers.districts, 'fetch_districts_by_province_name', mock_fetch_districts_by_name)
    monkeypatch.setattr(app.routers.districts, 'get_district_by_name', mock_get_district_by_name)
    monkeypatch.setattr(app.routers.districts, 'fetch_wards_by_district_name', mock_fetch_wards_by_name)
    monkeypatch.setattr(app.routers.districts, 'calc_avg_price_by_district_name', mock_calc_avg_price_by_district_name)
    
    monkeypatch.setattr(app.routers.wards, 'get_district_by_name', mock_get_district_by_name)
    monkeypatch.setattr(app.routers.wards, 'fetch_wards_by_district_name', mock_fetch_wards_by_name)
    monkeypatch.setattr(app.routers.wards, 'get_ward_by_name', mock_get_ward_by_name)
    monkeypatch.setattr(app.routers.wards, 'calc_avg_price_by_ward_name', mock_calc_avg_price_by_ward_name)
    
    monkeypatch.setattr(app.routers.analytics, 'get_district_by_name', mock_get_district_by_name)
    monkeypatch.setattr(app.routers.analytics, 'get_ward_by_name', mock_get_ward_by_name)
    monkeypatch.setattr(app.routers.analytics, 'calc_monthly_avg_price_in_radius', mock_calc_monthly_prices)
    monkeypatch.setattr(app.routers.analytics, 'calc_monthly_avg_price_by_district_name', mock_calc_monthly_prices_by_district_name)
    monkeypatch.setattr(app.routers.analytics, 'calc_monthly_avg_price_by_province_name', mock_calc_monthly_prices_by_province_name)
    monkeypatch.setattr(app.routers.analytics, 'fetch_projects_by_district', mock_fetch_projects_by_district)
    monkeypatch.setattr(app.routers.analytics, 'fetch_projects_by_ward', mock_fetch_projects_by_ward)
    
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


def mock_get_province(db, province_id):
    """Mock get_province_or_404"""
    if province_id == "01":
        return MockRow(id="01", name="Hà Nội")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy tỉnh với id '{province_id}'")


def mock_fetch_districts(db, province_id):
    """Mock fetch_districts_by_province"""
    if province_id == "01":
        return [
            MockRow(id="001", name="Quận Ba Đình", prefix="Quận", longitude=21.0, latitude=105.8),
        ]
    return []


def mock_get_district(db, district_id):
    """Mock get_district_or_404"""
    if district_id == "001":
        return MockRow(id="001", name="Quận Ba Đình")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy huyện với id '{district_id}'")


def mock_fetch_wards(db, district_id):
    """Mock fetch_wards_by_district"""
    if district_id == "001":
        return [
            MockRow(id="00001", name="Phường Phúc Xá", prefix="Phường", longitude=21.0, latitude=105.8),
        ]
    return []


def mock_get_ward(db, ward_id):
    """Mock get_ward_or_404"""
    if ward_id == "00001":
        return MockRow(id="00001", name="Phường Phúc Xá")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy xã/phường với id '{ward_id}'")


# ── NEW: Mock functions for Name-based Search ────────────────────────────────

def mock_get_province_by_name(db, province_name):
    """Mock get_province_by_name"""
    if province_name.lower() == "hà nội":
        return MockRow(id="01", name="Hà Nội")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy tỉnh '{province_name}'")


def mock_get_district_by_name(db, district_name):
    """Mock get_district_by_name"""
    if district_name.lower() == "quận ba đình":
        return MockRow(id="001", name="Quận Ba Đình")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy huyện '{district_name}'")


def mock_get_ward_by_name(db, ward_name):
    """Mock get_ward_by_name"""
    if ward_name.lower() == "phường phúc xá":
        return MockRow(id="00001", name="Phường Phúc Xá")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy xã/phường '{ward_name}'")


def mock_fetch_districts_by_name(db, province_name):
    """Mock fetch_districts_by_province_name"""
    print(f"MOCK: fetch_districts_by_name called with province_name='{province_name}'")
    # Case-insensitive matching
    if province_name and province_name.lower() == "hà nội":
        print(f"MOCK: Match found, returning districts list")
        return [
            MockRow(id="001", name="Quận Ba Đình", prefix="Quận", longitude=21.0, latitude=105.8),
        ]
    # Return empty list for any other province (treated as NOT FOUND, should 404)
    print(f"MOCK: No match, raising 404")
    raise HTTPException(status_code=404, detail=f"Không tìm thấy tỉnh '{province_name}'")


def mock_fetch_wards_by_name(db, district_name):
    """Mock fetch_wards_by_district_name"""
    # Case-insensitive matching
    if district_name and district_name.lower() == "quận ba đình":
        return [
            MockRow(id="00001", name="Phường Phúc Xá", prefix="Phường", longitude=21.0, latitude=105.8),
        ]
    # Return empty list for any other district (treated as NOT FOUND, should 404)
    raise HTTPException(status_code=404, detail=f"Không tìm thấy huyện '{district_name}'")


def mock_calc_avg_price_by_province_name(db, province_name, type_id=None):
    """Mock calc_avg_price_by_province_name"""
    if type_id is not None and type_id not in [None]:
        return (None, 0)
    return (1500.0, 100)


def mock_calc_avg_price_by_district_name(db, district_name, type_id=None):
    """Mock calc_avg_price_by_district_name"""
    if type_id is not None and type_id not in [None]:
        return (None, 0)
    return (1500.0, 100)


def mock_calc_avg_price_by_ward_name(db, ward_name, type_id=None):
    """Mock calc_avg_price_by_ward_name"""
    if type_id is not None and type_id not in [None]:
        return (None, 0)
    return (1500.0, 100)


def mock_calc_avg_price(db, filter_col, filter_val, type_id=None):
    """Mock calc_avg_price - return 0 for nonexistent types"""
    # Valid type_ids that exist in the system
    valid_types = [None]  # None means no type filter
    
    # If type_id is anything other than valid types, return 0 listings
    if type_id is not None and type_id not in valid_types:
        return (None, 0)
    
    return (1500.0, 100)


def mock_calc_monthly_prices(db, lon, lat, type_id=None, months=12):
    """Mock calc_monthly_avg_price_in_radius"""
    return _generate_monthly_prices(type_id)


def mock_calc_monthly_prices_by_district_name(db, district_name, type_id=None, months=12):
    """Mock calc_monthly_avg_price_by_district_name"""
    if district_name.lower() == "quận ba đình":
        district_info = {
            "id": "001",
            "name": "Quận Ba Đình",
            "province_id": "01",
            "province_name": "Hà Nội",
        }
        return (district_info, _generate_monthly_prices(type_id))
    return (None, [])


def mock_calc_monthly_prices_by_province_name(db, province_name, type_id=None, months=12):
    """Mock calc_monthly_avg_price_by_province_name"""
    if province_name.lower() == "hà nội":
        province_info = {
            "id": "01",
            "name": "Hà Nội",
        }
        return (province_info, _generate_monthly_prices(type_id))
    return (None, [])


def mock_fetch_projects_by_district(db, district_id):
    """Mock fetch_projects_by_district"""
    if district_id == "001":
        return [
            MockRow(
                id="proj_001",
                name="Dự án 1",
                description="Dự án test",
                address="123 Test St",
                province_id="01",
                province_name="Hà Nội",
                district_id="001",
                district_name="Quận Ba Đình",
                ward_id="00001",
                ward_name="Phường Phúc Xá",
                longitude=21.0,
                latitude=105.8,
                total_area="100000",
                total_buildings="5",
                total_apartments="100",
                total_floors="10",
                total_investment="1000000",
                building_density="50",
                start_time="2023-01-01",
                completion_time="2025-12-31",
                status="ongoing",
                progress="50",
                juridical="valid",
                ownership="private",
                lowest_price_per_m2=1000.0,
                highest_price_per_m2=2000.0,
                lowest_price_per_product=50000000,
                highest_price_per_product=200000000,
                logo="http://example.com/logo.jpg",
                banner="http://example.com/banner.jpg",
                sale_policy="normal",
                is_published=True,
                published_at="2023-06-01",
            )
        ]
    return []


def mock_fetch_projects_by_ward(db, ward_id):
    """Mock fetch_projects_by_ward"""
    if ward_id == "00001":
        return [
            MockRow(
                id="proj_001",
                name="Dự án 1",
                description="Dự án test",
                address="123 Test St",
                province_id="01",
                province_name="Hà Nội",
                district_id="001",
                district_name="Quận Ba Đình",
                ward_id="00001",
                ward_name="Phường Phúc Xá",
                longitude=21.0,
                latitude=105.8,
                total_area="100000",
                total_buildings="5",
                total_apartments="100",
                total_floors="10",
                total_investment="1000000",
                building_density="50",
                start_time="2023-01-01",
                completion_time="2025-12-31",
                status="ongoing",
                progress="50",
                juridical="valid",
                ownership="private",
                lowest_price_per_m2=1000.0,
                highest_price_per_m2=2000.0,
                lowest_price_per_product=50000000,
                highest_price_per_product=200000000,
                logo="http://example.com/logo.jpg",
                banner="http://example.com/banner.jpg",
                sale_policy="normal",
                is_published=True,
                published_at="2023-06-01",
            )
        ]
    return []


@pytest.fixture
def mock_db():
    """Mock database session để test không cần DB thật."""
    return MagicMock()


@pytest.fixture
def mock_client(mock_db):
    """TestClient với DB bị mock - dùng cho unit test."""
    from app.main import app as fastapi_app
    fastapi_app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


# ── ID mẫu để dùng chung trong các test ──────────────────────────────────────
SAMPLE_PROVINCE_ID = "01"       # Hà Nội
SAMPLE_DISTRICT_ID = "001"      # Quận Ba Đình
SAMPLE_WARD_ID     = "00001"    # Phường Phúc Xá
INVALID_ID         = "INVALID_ID_KHONG_TON_TAI"

"""
Test suite cho Analytics endpoints:
  POST /api/v1/price/by-address
  GET  /api/v1/projects/district?district_name=...
  GET  /api/v1/projects/ward?ward_name=...
  GET  /api/v1/price/by-district-name?district_name=...
"""
import pytest
from unittest.mock import patch

# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_ADDRESS_BODY = {
    "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
    "type_id": "nha-o"
}

NOMINATIM_COORDS  = (106.6927, 10.7756)   # (lon, lat) TP.HCM
MAPBOX_COORDS     = (106.6930, 10.7760)
FAKE_MAPBOX_KEY   = "pk.fake_mapbox_key_for_testing"

# Sample names for new name-based API
VALID_DISTRICT_NAME = "Quận Ba Đình"
VALID_WARD_NAME = "Phường Phúc Xá"
INVALID_NAME = "District_Not_Found"


# ══ Endpoint 1: POST /api/v1/price/by-address ════════════════════════════════

class TestGetPriceByAddress:

    def test_nominatim_success_returns_200(self, client):
        """Nominatim tìm được tọa độ -> 200 OK, geocode_source = nominatim."""
        with patch(
            "app.routers.analytics.geocode_nominatim_sync",
            return_value=NOMINATIM_COORDS
        ):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        data = response.json()
        assert data["geocode_source"] == "nominatim"
        assert data["longitude"] == NOMINATIM_COORDS[0]
        assert data["latitude"]  == NOMINATIM_COORDS[1]

    def test_fallback_to_mapbox_when_nominatim_fails(self, client):
        """Nominatim thất bại -> dùng Mapbox fallback, geocode_source = mapbox."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=None), \
             patch("app.routers.analytics.geocode_mapbox_sync", return_value=MAPBOX_COORDS):
            response = client.post(
                "/api/v1/price/by-address",
                json=VALID_ADDRESS_BODY,
                headers={"X-Mapbox-Api-Key": FAKE_MAPBOX_KEY}
            )
        assert response.status_code == 200
        data = response.json()
        assert data["geocode_source"] == "mapbox"

    def test_nominatim_fails_no_mapbox_key_returns_422(self, client):
        """Nominatim thất bại + không có Mapbox key -> 422."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=None):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 422

    def test_both_geocoders_fail_returns_422(self, client):
        """Cả Nominatim lẫn Mapbox đều thất bại -> 422."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=None), \
             patch("app.routers.analytics.geocode_mapbox_sync", return_value=None):
            response = client.post(
                "/api/v1/price/by-address",
                json=VALID_ADDRESS_BODY,
                headers={"X-Mapbox-Api-Key": FAKE_MAPBOX_KEY}
            )
        assert response.status_code == 422

    def test_response_has_12_monthly_entries(self, client):
        """Response phải trả về đúng 12 tháng."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=NOMINATIM_COORDS):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        data = response.json()
        assert len(data["monthly_prices"]) == 12

    def test_monthly_price_fields(self, client):
        """Mỗi tháng trong monthly_prices phải có đủ fields."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=NOMINATIM_COORDS):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        item = response.json()["monthly_prices"][0]
        assert "year"             in item
        assert "month"            in item
        assert "avg_price_per_m2" in item
        assert "total_listings"   in item

    def test_monthly_prices_sorted_oldest_to_newest(self, client):
        """12 tháng phải được sắp xếp từ cũ nhất đến mới nhất."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=NOMINATIM_COORDS):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        months = response.json()["monthly_prices"]
        dates = [(m["year"], m["month"]) for m in months]
        assert dates == sorted(dates)

    def test_radius_is_1000_meters(self, client):
        """radius_meters trong response phải là 1000."""
        with patch("app.routers.analytics.geocode_nominatim_sync", return_value=NOMINATIM_COORDS):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        data = response.json()
        assert data["radius_meters"] == 1000


# ══ Endpoint 2: GET /api/v1/projects/district?district_name=... ═══════════════════

class TestGetProjectsByDistrict:

    def test_valid_district_returns_200(self, client):
        """Huyện hợp lệ -> 200 OK."""
        response = client.get("/api/v1/projects/district", params={"district_name": VALID_DISTRICT_NAME})
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "projects" in data

    def test_invalid_district_returns_404(self, client):
        """Huyện không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/projects/district", params={"district_name": INVALID_NAME})
        assert response.status_code == 404

    def test_response_structure(self, client):
        """Response phải có đúng cấu trúc {total, projects}."""
        response = client.get("/api/v1/projects/district", params={"district_name": VALID_DISTRICT_NAME})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["total"], int)
        assert isinstance(data["projects"], list)
        assert data["total"] >= 0
        # Nếu có dự án, mỗi dự án phải có cấu trúc hợp lệ
        if data["projects"]:
            project = data["projects"][0]
            assert "id" in project
            assert "name" in project


# ══ Endpoint 3: GET /api/v1/projects/ward?ward_name=... ═════════════════════

class TestGetProjectsByWard:

    def test_valid_ward_returns_200(self, client):
        """Xã/phường hợp lệ -> 200 OK."""
        response = client.get("/api/v1/projects/ward", params={"ward_name": VALID_WARD_NAME})
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "projects" in data

    def test_invalid_ward_returns_404(self, client):
        """Xã/phường không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/projects/ward", params={"ward_name": INVALID_NAME})
        assert response.status_code == 404

    def test_response_structure(self, client):
        """Response phải có đúng cấu trúc {total, projects}."""
        response = client.get("/api/v1/projects/ward", params={"ward_name": VALID_WARD_NAME})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["total"], int)
        assert isinstance(data["projects"], list)
        assert data["total"] >= 0
        # Nếu có dự án, mỗi dự án phải có cấu trúc hợp lệ
        if data["projects"]:
            project = data["projects"][0]
            assert "id" in project
            assert "name" in project


# ══ Endpoint 4: GET /api/v1/price/by-district-name ════════════════════════════

class TestGetPriceByDistrictName:

    def test_valid_district_returns_200(self, client):
        """Huyện hợp lệ -> 200 OK, trả về dữ liệu 12 tháng."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["district_name"] == "Quận Ba Đình"
        assert data["district_id"] == "001"
        assert len(data["monthly_prices"]) == 12

    def test_invalid_district_returns_404(self, client):
        """Huyện không tồn tại -> 404 Not Found."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": INVALID_NAME}
        )
        assert response.status_code == 404

    def test_response_structure(self, client):
        """Response phải có đủ fields: district_id, district_name, province_id, province_name, type_id, months, monthly_prices."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert "district_id" in data
        assert "district_name" in data
        assert "province_id" in data
        assert "province_name" in data
        assert "type_id" in data
        assert "months" in data
        assert "monthly_prices" in data
        assert data["months"] == 12

    def test_monthly_prices_fields(self, client):
        """Mỗi tháng trong monthly_prices phải có đủ fields."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        prices = response.json()["monthly_prices"]
        assert len(prices) > 0
        for item in prices:
            assert "year" in item
            assert "month" in item
            assert "avg_price_per_m2" in item
            assert "total_listings" in item

    def test_monthly_prices_sorted_oldest_to_newest(self, client):
        """12 tháng phải được sắp xếp từ cũ nhất đến mới nhất."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        months = response.json()["monthly_prices"]
        dates = [(m["year"], m["month"]) for m in months]
        assert dates == sorted(dates)

    def test_with_type_id_filter(self, client):
        """Truyền type_id -> filter theo loại BĐS."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME, "type_id": "nha-o"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type_id"] == "nha-o"
        assert len(data["monthly_prices"]) == 12

    def test_province_info_populated(self, client):
        """Thông tin tỉnh phải được điền đầy đủ."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["province_id"] is not None
        assert data["province_name"] is not None
        assert data["province_name"] == "Hà Nội"

    def test_response_has_exactly_12_months(self, client):
        """Response phải trả về đúng 12 tháng."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": VALID_DISTRICT_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["months"] == 12
        assert len(data["monthly_prices"]) == 12


# ══ Endpoint 5: GET /api/v1/price/by-province-name ════════════════════════════

class TestGetPriceByProvinceName:

    def test_valid_province_returns_200(self, client):
        """Tỉnh hợp lệ -> 200 OK, trả về dữ liệu 12 tháng."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["province_name"] == "Hà Nội"
        assert data["province_id"] == "01"
        assert len(data["monthly_prices"]) == 12

    def test_invalid_province_returns_404(self, client):
        """Tỉnh không tồn tại -> 404 Not Found."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Tỉnh_Không_Tồn_Tại"}
        )
        assert response.status_code == 404

    def test_response_structure(self, client):
        """Response phải có đủ fields: province_id, province_name, type_id, months, monthly_prices."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "province_id" in data
        assert "province_name" in data
        assert "type_id" in data
        assert "months" in data
        assert "monthly_prices" in data
        assert data["months"] == 12

    def test_monthly_prices_fields(self, client):
        """Mỗi tháng trong monthly_prices phải có đủ fields."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội"}
        )
        assert response.status_code == 200
        prices = response.json()["monthly_prices"]
        assert len(prices) > 0
        for item in prices:
            assert "year" in item
            assert "month" in item
            assert "avg_price_per_m2" in item
            assert "total_listings" in item

    def test_monthly_prices_sorted_oldest_to_newest(self, client):
        """12 tháng phải được sắp xếp từ cũ nhất đến mới nhất."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội"}
        )
        assert response.status_code == 200
        months = response.json()["monthly_prices"]
        dates = [(m["year"], m["month"]) for m in months]
        assert dates == sorted(dates)

    def test_with_type_id_filter(self, client):
        """Truyền type_id -> filter theo loại BĐS."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội", "type_id": "nha-o"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type_id"] == "nha-o"
        assert len(data["monthly_prices"]) == 12

    def test_response_has_exactly_12_months(self, client):
        """Response phải trả về đúng 12 tháng."""
        response = client.get(
            "/api/v1/price/by-province-name",
            params={"province_name": "Hà Nội"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["months"] == 12
        assert len(data["monthly_prices"]) == 12

"""
Test suite cho Analytics endpoints:
  POST /api/v1/price/by-address
  GET  /api/v1/projects/district/{district_id}
  GET  /api/v1/projects/ward/{ward_id}
"""
import pytest
from unittest.mock import AsyncMock, patch
from tests.conftest import SAMPLE_DISTRICT_ID, SAMPLE_WARD_ID, INVALID_ID

# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_ADDRESS_BODY = {
    "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
    "type_id": "nha-o"
}

NOMINATIM_COORDS  = (106.6927, 10.7756)   # (lon, lat) TP.HCM
MAPBOX_COORDS     = (106.6930, 10.7760)
FAKE_MAPBOX_KEY   = "pk.fake_mapbox_key_for_testing"


# ══ Endpoint 1: POST /api/v1/price/by-address ════════════════════════════════

class TestGetPriceByAddress:

    def test_nominatim_success_returns_200(self, client):
        """Nominatim tìm được tọa độ -> 200 OK, geocode_source = nominatim."""
        with patch(
            "app.routers.analytics.geocode_nominatim",
            new=AsyncMock(return_value=NOMINATIM_COORDS)
        ):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        data = response.json()
        assert data["geocode_source"] == "nominatim"
        assert data["longitude"] == NOMINATIM_COORDS[0]
        assert data["latitude"]  == NOMINATIM_COORDS[1]

    def test_fallback_to_mapbox_when_nominatim_fails(self, client):
        """Nominatim thất bại -> dùng Mapbox fallback, geocode_source = mapbox."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=None)), \
             patch("app.routers.analytics.geocode_mapbox",    new=AsyncMock(return_value=MAPBOX_COORDS)):
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
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=None)):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 422

    def test_both_geocoders_fail_returns_422(self, client):
        """Cả Nominatim lẫn Mapbox đều thất bại -> 422."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=None)), \
             patch("app.routers.analytics.geocode_mapbox",    new=AsyncMock(return_value=None)):
            response = client.post(
                "/api/v1/price/by-address",
                json=VALID_ADDRESS_BODY,
                headers={"X-Mapbox-Api-Key": FAKE_MAPBOX_KEY}
            )
        assert response.status_code == 422

    def test_response_has_12_monthly_entries(self, client):
        """Response phải trả về đúng 12 tháng."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=NOMINATIM_COORDS)):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        data = response.json()
        assert len(data["monthly_prices"]) == 12

    def test_monthly_price_fields(self, client):
        """Mỗi tháng trong monthly_prices phải có đủ fields."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=NOMINATIM_COORDS)):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        item = response.json()["monthly_prices"][0]
        assert "year"             in item
        assert "month"            in item
        assert "avg_price_per_m2" in item
        assert "total_listings"   in item

    def test_monthly_prices_sorted_oldest_to_newest(self, client):
        """12 tháng phải được sắp xếp từ cũ nhất đến mới nhất."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=NOMINATIM_COORDS)):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.status_code == 200
        months = response.json()["monthly_prices"]
        dates = [(m["year"], m["month"]) for m in months]
        assert dates == sorted(dates)

    def test_radius_is_1000_meters(self, client):
        """radius_meters trong response phải là 1000."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=NOMINATIM_COORDS)):
            response = client.post("/api/v1/price/by-address", json=VALID_ADDRESS_BODY)
        assert response.json()["radius_meters"] == 1000

    def test_without_type_id(self, client):
        """Request không có type_id vẫn phải hoạt động bình thường."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=NOMINATIM_COORDS)):
            response = client.post(
                "/api/v1/price/by-address",
                json={"address": "Hà Nội"}
            )
        assert response.status_code == 200

    def test_empty_address_returns_422(self, client):
        """Địa chỉ rỗng -> 422 Unprocessable Entity."""
        with patch("app.routers.analytics.geocode_nominatim", new=AsyncMock(return_value=None)):
            response = client.post("/api/v1/price/by-address", json={"address": ""})
        assert response.status_code == 422


# ══ Endpoint 2: GET /api/v1/projects/district/{district_id} ══════════════════

class TestGetProjectsByDistrict:

    def test_success_returns_200(self, client):
        """Huyện hợp lệ -> 200 OK."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        assert response.status_code == 200

    def test_invalid_district_returns_404(self, client):
        """Huyện không tồn tại -> 404 Not Found."""
        response = client.get(f"/api/v1/projects/district/{INVALID_ID}")
        assert response.status_code == 404

    def test_response_has_total_and_projects(self, client):
        """Response phải có field 'total' và 'projects'."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "total"    in data
        assert "projects" in data
        assert isinstance(data["projects"], list)

    def test_total_matches_projects_count(self, client):
        """Field 'total' phải bằng len(projects)."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        data = response.json()
        assert data["total"] == len(data["projects"])

    def test_project_has_required_fields(self, client):
        """Mỗi project trong list phải có ít nhất id, name, district_id."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        data = response.json()
        if data["projects"]:
            proj = data["projects"][0]
            assert "id"          in proj
            assert "name"        in proj
            assert "district_id" in proj

    def test_all_projects_belong_to_district(self, client):
        """Tất cả project trong kết quả phải có district_id khớp."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        data = response.json()
        for proj in data["projects"]:
            if proj["district_id"] is not None:
                assert proj["district_id"] == SAMPLE_DISTRICT_ID

    def test_includes_detailed_fields(self, client):
        """Response phải bao gồm fields từ projects_detailed (status, progress...)."""
        response = client.get(f"/api/v1/projects/district/{SAMPLE_DISTRICT_ID}")
        data = response.json()
        if data["projects"]:
            proj = data["projects"][0]
            assert "status"   in proj
            assert "progress" in proj
            assert "juridical" in proj


# ══ Endpoint 3: GET /api/v1/projects/ward/{ward_id} ══════════════════════════

class TestGetProjectsByWard:

    def test_success_returns_200(self, client):
        """Xã hợp lệ -> 200 OK."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        assert response.status_code == 200

    def test_invalid_ward_returns_404(self, client):
        """Xã không tồn tại -> 404 Not Found."""
        response = client.get(f"/api/v1/projects/ward/{INVALID_ID}")
        assert response.status_code == 404

    def test_response_has_total_and_projects(self, client):
        """Response phải có field 'total' và 'projects'."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        data = response.json()
        assert "total"    in data
        assert "projects" in data
        assert isinstance(data["projects"], list)

    def test_total_matches_projects_count(self, client):
        """Field 'total' phải bằng len(projects)."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        data = response.json()
        assert data["total"] == len(data["projects"])

    def test_project_has_required_fields(self, client):
        """Mỗi project trong list phải có ít nhất id, name, ward_id."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        data = response.json()
        if data["projects"]:
            proj = data["projects"][0]
            assert "id"      in proj
            assert "name"    in proj
            assert "ward_id" in proj

    def test_all_projects_belong_to_ward(self, client):
        """Tất cả project trong kết quả phải có ward_id khớp."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        data = response.json()
        for proj in data["projects"]:
            if proj["ward_id"] is not None:
                assert proj["ward_id"] == SAMPLE_WARD_ID

    def test_price_fields_are_numeric_or_null(self, client):
        """Các field giá (lowest/highest_price_per_m2) phải là số hoặc null."""
        response = client.get(f"/api/v1/projects/ward/{SAMPLE_WARD_ID}")
        data = response.json()
        for proj in data["projects"]:
            for field in ["lowest_price_per_m2", "highest_price_per_m2"]:
                val = proj.get(field)
                assert val is None or isinstance(val, (int, float))


# ══ Endpoint mới: GET /api/v1/price/by-district-name ═════════════════════════

class TestGetPriceByDistrictName:

    def test_success_returns_200(self, client):
        """Tên huyện hợp lệ -> 200 OK."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        assert response.status_code == 200

    def test_invalid_name_returns_404(self, client):
        """Tên huyện không tồn tại -> 404 Not Found."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "HuyenKhongTonTaiXyzAbc123"}
        )
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_missing_district_name_returns_422(self, client):
        """Thiếu query param district_name -> 422 Unprocessable Entity."""
        response = client.get("/api/v1/price/by-district-name")
        assert response.status_code == 422

    def test_response_has_required_fields(self, client):
        """Response phải có đủ tất cả các field."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "district_id"     in data
        assert "district_name"   in data
        assert "province_id"     in data
        assert "province_name"   in data
        assert "type_id"         in data
        assert "months"          in data
        assert "monthly_prices"  in data

    def test_returns_exactly_12_months(self, client):
        """monthly_prices phải có đúng 12 phần tử."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        assert response.status_code == 200
        assert len(response.json()["monthly_prices"]) == 12

    def test_months_field_is_12(self, client):
        """Field months trong response phải là 12."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        assert response.json()["months"] == 12

    def test_monthly_price_item_fields(self, client):
        """Mỗi item trong monthly_prices phải có đủ 4 fields."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        item = response.json()["monthly_prices"][0]
        assert "year"             in item
        assert "month"            in item
        assert "avg_price_per_m2" in item
        assert "total_listings"   in item

    def test_months_sorted_oldest_to_newest(self, client):
        """12 tháng phải sắp xếp từ cũ -> mới."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        months = response.json()["monthly_prices"]
        dates = [(m["year"], m["month"]) for m in months]
        assert dates == sorted(dates)

    def test_avg_price_is_positive_or_null(self, client):
        """avg_price_per_m2 nếu có phải > 0."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        for item in response.json()["monthly_prices"]:
            if item["avg_price_per_m2"] is not None:
                assert item["avg_price_per_m2"] > 0

    def test_total_listings_is_non_negative(self, client):
        """total_listings của mỗi tháng phải >= 0."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình"}
        )
        for item in response.json()["monthly_prices"]:
            assert item["total_listings"] >= 0

    def test_case_insensitive_search(self, client):
        """Tìm kiếm không phân biệt hoa thường: 'ba đình' == 'Ba Đình'."""
        r1 = client.get("/api/v1/price/by-district-name", params={"district_name": "Ba Đình"})
        r2 = client.get("/api/v1/price/by-district-name", params={"district_name": "ba đình"})
        assert r1.status_code == r2.status_code
        if r1.status_code == 200:
            assert r1.json()["district_id"] == r2.json()["district_id"]

    def test_filter_by_type_id(self, client):
        """type_id query param phải hoạt động và trả về 200."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình", "type_id": "nha-o"}
        )
        assert response.status_code == 200
        assert response.json()["type_id"] == "nha-o"

    def test_no_listings_months_have_null_price(self, client):
        """Tháng không có listing -> avg_price_per_m2 = null, total_listings = 0."""
        response = client.get(
            "/api/v1/price/by-district-name",
            params={"district_name": "Ba Đình", "type_id": "type_khong_ton_tai_xyz"}
        )
        assert response.status_code == 200
        for item in response.json()["monthly_prices"]:
            assert item["total_listings"] == 0
            assert item["avg_price_per_m2"] is None

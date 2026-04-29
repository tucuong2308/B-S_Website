"""
Test suite cho Districts endpoints:
  - GET /api/v1/wards?district_name=...
  - GET /api/v1/districts/avg-price-per-m2?district_name=...
"""
import pytest

SAMPLE_DISTRICT_NAME = "Quận Ba Đình"
INVALID_DISTRICT_NAME = "District_Not_Found"


class TestGetWardsByDistrict:

    def test_success_returns_200(self, client):
        """Huyện hợp lệ -> 200 OK và trả về list."""
        response = client.get("/api/v1/wards", params={"district_name": SAMPLE_DISTRICT_NAME})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_invalid_district_returns_404(self, client):
        """Huyện không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/wards", params={"district_name": INVALID_DISTRICT_NAME})
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_response_has_required_fields(self, client):
        """Mỗi xã/phường trong response phải có đủ các field."""
        response = client.get("/api/v1/wards", params={"district_name": SAMPLE_DISTRICT_NAME})
        assert response.status_code == 200
        data = response.json()
        if data:
            item = data[0]
            assert "id" in item
            assert "name" in item
            assert "prefix" in item
            assert "longitude" in item
            assert "latitude" in item

    def test_results_sorted_by_name(self, client):
        """Kết quả phải được sắp xếp theo tên tăng dần."""
        response = client.get("/api/v1/wards", params={"district_name": SAMPLE_DISTRICT_NAME})
        assert response.status_code == 200
        data = response.json()
        if len(data) > 1:
            names = [item["name"] for item in data]
            assert names == sorted(names)

    def test_response_is_list_type(self, client):
        """Response body phải là JSON array."""
        response = client.get("/api/v1/wards", params={"district_name": SAMPLE_DISTRICT_NAME})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_ward_id_is_string(self, client):
        """id của xã phải là string."""
        response = client.get("/api/v1/wards", params={"district_name": SAMPLE_DISTRICT_NAME})
        data = response.json()
        if data:
            assert isinstance(data[0]["id"], str)


class TestGetAvgPriceByDistrict:

    def test_success_returns_200(self, client):
        """Huyện hợp lệ -> 200 OK."""
        response = client.get("/api/v1/districts/avg-price-per-m2", params={"district_name": SAMPLE_DISTRICT_NAME})
        assert response.status_code == 200

    def test_invalid_district_returns_404(self, client):
        """Huyện không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/districts/avg-price-per-m2", params={"district_name": INVALID_DISTRICT_NAME})
        assert response.status_code == 404

    def test_response_has_required_fields(self, client):
        """Response phải có đủ 4 field."""
        response = client.get("/api/v1/districts/avg-price-per-m2", params={"district_name": SAMPLE_DISTRICT_NAME})
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "avg_price_per_m2" in data
        assert "total_listings" in data

    def test_avg_price_is_positive_or_null(self, client):
        """Giá trung bình nếu có phải > 0."""
        response = client.get("/api/v1/districts/avg-price-per-m2", params={"district_name": SAMPLE_DISTRICT_NAME})
        data = response.json()
        if data["avg_price_per_m2"] is not None:
            assert data["avg_price_per_m2"] > 0

    def test_total_listings_is_non_negative(self, client):
        """total_listings phải >= 0."""
        response = client.get("/api/v1/districts/avg-price-per-m2", params={"district_name": SAMPLE_DISTRICT_NAME})
        data = response.json()
        assert data["total_listings"] >= 0

    def test_filter_by_type_id(self, client):
        """Query param type_id phải hoạt động và trả về 200."""
        response = client.get(
            f"/api/v1/districts/avg-price-per-m2",
            params={"district_name": SAMPLE_DISTRICT_NAME, "type_id": "nha-o"}
        )
        assert response.status_code == 200

    def test_filter_by_nonexistent_type_returns_zero_listings(self, client):
        """type_id không tồn tại -> total_listings = 0, avg_price_per_m2 = null."""
        response = client.get(
            f"/api/v1/districts/avg-price-per-m2",
            params={"district_name": SAMPLE_DISTRICT_NAME, "type_id": "type_khong_ton_tai_xyz"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_listings"] == 0
        assert data["avg_price_per_m2"] is None

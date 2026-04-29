"""
Test suite cho Provinces endpoints:
  - GET /api/v1/districts?province_name=...
  - GET /api/v1/provinces/avg-price-per-m2?province_name=...
"""
import pytest

SAMPLE_PROVINCE_NAME = "Hà Nội"
INVALID_PROVINCE_NAME = "Province_Not_Found"


class TestGetDistrictsByProvince:

    def test_success_returns_200(self, client):
        """Tỉnh hợp lệ -> 200 OK và trả về list."""
        response = client.get("/api/v1/districts", params={"province_name": SAMPLE_PROVINCE_NAME})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_invalid_province_returns_404(self, client):
        """Tỉnh không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/districts", params={"province_name": INVALID_PROVINCE_NAME})
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_response_has_required_fields(self, client):
        """Mỗi huyện trong response phải có đủ các field."""
        response = client.get("/api/v1/districts", params={"province_name": SAMPLE_PROVINCE_NAME})
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
        response = client.get("/api/v1/districts", params={"province_name": SAMPLE_PROVINCE_NAME})
        assert response.status_code == 200
        data = response.json()
        if len(data) > 1:
            names = [item["name"] for item in data]
            assert names == sorted(names)

    def test_response_is_list_type(self, client):
        """Response body phải là JSON array."""
        response = client.get("/api/v1/districts", params={"province_name": SAMPLE_PROVINCE_NAME})
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestGetAvgPriceByProvince:

    def test_success_returns_200(self, client):
        """Tỉnh hợp lệ -> 200 OK."""
        response = client.get("/api/v1/provinces/avg-price-per-m2", params={"province_name": SAMPLE_PROVINCE_NAME})
        assert response.status_code == 200

    def test_invalid_province_returns_404(self, client):
        """Tỉnh không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/provinces/avg-price-per-m2", params={"province_name": INVALID_PROVINCE_NAME})
        assert response.status_code == 404

    def test_response_has_required_fields(self, client):
        """Response phải có đủ 4 field."""
        response = client.get("/api/v1/provinces/avg-price-per-m2", params={"province_name": SAMPLE_PROVINCE_NAME})
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "avg_price_per_m2" in data
        assert "total_listings" in data

    def test_avg_price_is_positive_or_null(self, client):
        """Giá trung bình nếu có phải > 0, nếu không có listings thì là null."""
        response = client.get("/api/v1/provinces/avg-price-per-m2", params={"province_name": SAMPLE_PROVINCE_NAME})
        data = response.json()
        if data["avg_price_per_m2"] is not None:
            assert data["avg_price_per_m2"] > 0

    def test_total_listings_is_non_negative(self, client):
        """total_listings phải >= 0."""
        response = client.get("/api/v1/provinces/avg-price-per-m2", params={"province_name": SAMPLE_PROVINCE_NAME})
        data = response.json()
        assert data["total_listings"] >= 0

    def test_filter_by_type_id(self, client):
        """Query param type_id phải hoạt động và trả về 200."""
        response = client.get(
            f"/api/v1/provinces/avg-price-per-m2",
            params={"province_name": SAMPLE_PROVINCE_NAME, "type_id": "nha-o"}
        )
        assert response.status_code == 200

    def test_filter_by_nonexistent_type_returns_zero_listings(self, client):
        """type_id không tồn tại -> total_listings = 0, avg_price_per_m2 = null."""
        response = client.get(
            f"/api/v1/provinces/avg-price-per-m2",
            params={"province_name": SAMPLE_PROVINCE_NAME, "type_id": "type_khong_ton_tai_xyz"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_listings"] == 0
        assert data["avg_price_per_m2"] is None

"""
Test suite cho Wards endpoints:
  - GET /api/v1/wards/avg-price-per-m2?ward_name=...
"""
import pytest

SAMPLE_WARD_NAME = "Phường Phúc Xá"
INVALID_WARD_NAME = "Ward_Not_Found"


class TestGetAvgPriceByWard:

    def test_success_returns_200(self, client):
        """Xã hợp lệ -> 200 OK."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        assert response.status_code == 200

    def test_invalid_ward_returns_404(self, client):
        """Xã không tồn tại -> 404 Not Found."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": INVALID_WARD_NAME})
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_response_has_required_fields(self, client):
        """Response phải có đủ 4 field."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "avg_price_per_m2" in data
        assert "total_listings" in data

    def test_avg_price_is_positive_or_null(self, client):
        """Giá trung bình nếu có phải > 0, nếu không có listings thì là null."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        data = response.json()
        if data["avg_price_per_m2"] is not None:
            assert data["avg_price_per_m2"] > 0

    def test_total_listings_is_non_negative(self, client):
        """total_listings phải >= 0."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        data = response.json()
        assert data["total_listings"] >= 0

    def test_filter_by_type_id(self, client):
        """Query param type_id phải hoạt động và trả về 200."""
        response = client.get(
            f"/api/v1/wards/avg-price-per-m2",
            params={"ward_name": SAMPLE_WARD_NAME, "type_id": "nha-o"}
        )
        assert response.status_code == 200

    def test_filter_by_nonexistent_type_returns_zero_listings(self, client):
        """type_id không tồn tại -> total_listings = 0, avg_price_per_m2 = null."""
        response = client.get(
            f"/api/v1/wards/avg-price-per-m2",
            params={"ward_name": SAMPLE_WARD_NAME, "type_id": "type_khong_ton_tai_xyz"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_listings"] == 0
        assert data["avg_price_per_m2"] is None

    def test_response_id_matches_requested_ward(self, client):
        """id trong response phải khớp với ward_name đã request."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        data = response.json()
        assert data["name"].lower() == SAMPLE_WARD_NAME.lower()

    def test_response_name_is_string(self, client):
        """name trong response phải là string không rỗng."""
        response = client.get("/api/v1/wards/avg-price-per-m2", params={"ward_name": SAMPLE_WARD_NAME})
        data = response.json()
        assert isinstance(data["name"], str)
        assert len(data["name"]) > 0

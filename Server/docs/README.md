# Bất Động Sản API

Backend REST API cho trang web bất động sản, xây dựng bằng **FastAPI** + **PostgreSQL**.

---

## Yêu cầu hệ thống

- Python 3.10+
- PostgreSQL 14+
- pip

---

## Cài đặt

```bash
# 1. Clone project
git clone <repo-url>
cd bds_project

# 2. Tạo virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# 3. Cài dependencies
pip install -r requirements.txt

# 4. Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa .env với thông tin DB thật của bạn
```

---

## Cấu hình Database

Chỉnh file `.env`:

```env
DB_DRIVER=postgresql
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=batdongsan_db
```

---

## Chạy server

```bash
uvicorn app.main:app --reload
```

Server khởi động tại: `http://localhost:8000`

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Cấu trúc project

```
bds_project/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── database.py             # Kết nối PostgreSQL (SQLAlchemy)
│   ├── core/
│   │   └── config.py           # Cấu hình app và DB (pydantic-settings)
│   ├── schemas/
│   │   ├── district.py         # Schema response cho huyện
│   │   ├── ward.py             # Schema response cho xã/phường
│   │   └── price.py            # Schema response cho giá trung bình
│   ├── services/
│   │   ├── location.py         # Business logic truy vấn địa lý
│   │   └── price.py            # Business logic tính giá trung bình
│   └── routers/
│       ├── provinces.py        # Endpoints /provinces
│       ├── districts.py        # Endpoints /districts
│       └── wards.py            # Endpoints /wards
├── tests/
│   ├── conftest.py             # Fixtures và constants dùng chung
│   ├── test_provinces.py       # Tests cho provinces endpoints
│   ├── test_districts.py       # Tests cho districts endpoints
│   └── test_wards.py           # Tests cho wards endpoints
├── docs/
│   ├── README.md               # File này
│   └── REPORT.docx             # Báo cáo thiết kế hệ thống
├── .env.example                # Mẫu file cấu hình môi trường
├── pytest.ini                  # Cấu hình pytest
└── requirements.txt            # Dependencies
```

---

## API Endpoints

### Tỉnh/Thành phố

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/provinces/{province_id}/districts` | Lấy tất cả huyện trong 1 tỉnh |
| GET | `/api/v1/provinces/{province_id}/avg-price-per-m2` | Giá trung bình/m² theo tỉnh |

### Quận/Huyện

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/districts/{district_id}/wards` | Lấy tất cả xã/phường trong 1 huyện |
| GET | `/api/v1/districts/{district_id}/avg-price-per-m2` | Giá trung bình/m² theo huyện |

### Xã/Phường

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/wards/{ward_id}/avg-price-per-m2` | Giá trung bình/m² theo xã/phường |

### Query Parameters (cho các endpoint giá)

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `type_id` | string (optional) | Lọc theo loại bất động sản |

---

## Ví dụ Response

**GET** `/api/v1/provinces/01/districts`
```json
[
  {
    "id": "001",
    "name": "Quận Ba Đình",
    "prefix": "Quận",
    "longitude": 105.8412,
    "latitude": 21.0359
  }
]
```

**GET** `/api/v1/provinces/01/avg-price-per-m2`
```json
{
  "id": "01",
  "name": "Thành phố Hà Nội",
  "avg_price_per_m2": 85000000.5,
  "total_listings": 1240
}
```

---

## Chạy Tests

```bash
# Chạy toàn bộ test
pytest

# Chạy test cụ thể
pytest tests/test_provinces.py -v
pytest tests/test_districts.py -v
pytest tests/test_wards.py -v

# Chạy với coverage report
pip install pytest-cov
pytest --cov=app tests/
```

> **Lưu ý:** Cập nhật `SAMPLE_PROVINCE_ID`, `SAMPLE_DISTRICT_ID`, `SAMPLE_WARD_ID`  
> trong `tests/conftest.py` cho khớp với dữ liệu thực tế trong DB của bạn.

---

## Error Responses

| HTTP Code | Ý nghĩa |
|-----------|---------|
| 200 | Thành công |
| 404 | Không tìm thấy tỉnh/huyện/xã với ID đã cho |
| 422 | Dữ liệu đầu vào không hợp lệ |
| 500 | Lỗi server |

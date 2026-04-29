# 📚 Bất Động Sản API - Complete Documentation

**Application:** Bất Động Sản API  
**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Database:** PostgreSQL  
**Framework:** FastAPI 0.111.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Endpoints by Category](#api-endpoints-by-category)
3. [Detailed Endpoint Specifications](#detailed-endpoint-specifications)
4. [Response Models](#response-models)
5. [Error Handling](#error-handling)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Project Structure](#project-structure)

---

## Overview

This is a FastAPI-based Real Estate API that provides:

- 📍 Geographic hierarchical data (Provinces → Districts → Wards)
- 💰 Real estate pricing analysis
- 📊 Advanced analytics with geocoding
- 🏢 Project information management

**Key Features:**

- Hierarchical location data (Tỉnh/Quận/Xã)
- Average price calculations by location and property type
- Geocoding service (Nominatim + Mapbox fallback)
- Price history analysis with 12-month data
- Project management and filtering by district/ward

---

## API Endpoints by Category

### 🌍 PROVINCES (Tỉnh/Thành phố)

**Base URL:** `/api/v1/provinces`

| Method | Endpoint                          | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/{province_id}/districts`        | Get all districts in a province        |
| GET    | `/{province_id}/avg-price-per-m2` | Get average price per m² in a province |

---

### 🏘️ DISTRICTS (Quận/Huyện)

**Base URL:** `/api/v1/districts`

| Method | Endpoint                          | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/{district_id}/wards`            | Get all wards in a district            |
| GET    | `/{district_id}/avg-price-per-m2` | Get average price per m² in a district |

---

### 🏠 WARDS (Xã/Phường)

**Base URL:** `/api/v1/wards`

| Method | Endpoint                      | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/{ward_id}/avg-price-per-m2` | Get average price per m² in a ward |

---

### 📊 ANALYTICS (Phân tích giá & Dự án)

**Base URL:** `/api/v1`

| Method | Endpoint                           | Description                                     |
| ------ | ---------------------------------- | ----------------------------------------------- |
| POST   | `/price/by-address`                | Analyze prices by address with 12-month history |
| GET    | `/projects/district/{district_id}` | Get all projects in a district                  |
| GET    | `/projects/ward/{ward_id}`         | Get all projects in a ward                      |

---

### ✅ HEALTH CHECKS

**Base URL:** N/A

| Method | Endpoint  | Description                     |
| ------ | --------- | ------------------------------- |
| GET    | `/`       | Root endpoint - return app info |
| GET    | `/health` | Health check status             |

---

## Detailed Endpoint Specifications

### 1. Get Districts by Province

**Endpoint:** `GET /api/v1/provinces/{province_id}/districts`

**Parameters:**

- `province_id` (path, required): Province ID (e.g., "01" for Hà Nội)

**Response:** `Array[DistrictResponse]`

**Status Codes:**

- `200` - Success
- `404` - Province not found

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/provinces/01/districts"
```

**Response Example:**

```json
[
  {
    "id": "001",
    "name": "Quận Ba Đình",
    "prefix": "Quận",
    "longitude": 21.0,
    "latitude": 105.8
  }
]
```

---

### 2. Get Average Price by Province

**Endpoint:** `GET /api/v1/provinces/{province_id}/avg-price-per-m2`

**Parameters:**

- `province_id` (path, required): Province ID
- `type_id` (query, optional): Filter by property type (e.g., "nha-o", "van-phong")

**Response:** `AvgPriceResponse`

**Status Codes:**

- `200` - Success
- `404` - Province not found

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/provinces/01/avg-price-per-m2?type_id=nha-o"
```

**Response Example:**

```json
{
  "id": "01",
  "name": "Hà Nội",
  "avg_price_per_m2": 1500.0,
  "total_listings": 100
}
```

---

### 3. Get Wards by District

**Endpoint:** `GET /api/v1/districts/{district_id}/wards`

**Parameters:**

- `district_id` (path, required): District ID

**Response:** `Array[WardResponse]`

**Status Codes:**

- `200` - Success
- `404` - District not found

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/districts/001/wards"
```

---

### 4. Get Average Price by District

**Endpoint:** `GET /api/v1/districts/{district_id}/avg-price-per-m2`

**Parameters:**

- `district_id` (path, required): District ID
- `type_id` (query, optional): Filter by property type

**Response:** `AvgPriceResponse`

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/districts/001/avg-price-per-m2"
```

---

### 5. Get Average Price by Ward

**Endpoint:** `GET /api/v1/wards/{ward_id}/avg-price-per-m2`

**Parameters:**

- `ward_id` (path, required): Ward ID
- `type_id` (query, optional): Filter by property type

**Response:** `AvgPriceResponse`

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/wards/00001/avg-price-per-m2"
```

---

### 6. Get Price Analysis by Address (NEW!)

**Endpoint:** `POST /api/v1/price/by-address`

**Description:** Analyze real estate prices by geocoded address with 12-month history within 1km radius

**Request Body:**

```json
{
  "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
  "type_id": "nha-o"
}
```

**Response:** `AddressPriceResponse`

**Status Codes:**

- `200` - Success
- `422` - Unable to geocode address

**Features:**

- Uses Nominatim (OpenStreetMap) for free geocoding (no API key needed)
- Automatically falls back to Mapbox if Nominatim fails
- Uses configured API key from environment
- Returns 12 months of price history
- Calculates within 1km radius
- Haversine formula for distance calculation

**Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/price/by-address" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
    "type_id": "nha-o"
  }'
```

**Response Example:**

```json
{
  "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
  "type_id": "nha-o",
  "geocode_source": "nominatim",
  "longitude": 106.6829,
  "latitude": 10.7769,
  "radius_meters": 1000,
  "monthly_prices": [
    {
      "year": 2025,
      "month": 5,
      "avg_price_per_m2": 1500.0,
      "total_listings": 100
    },
    {
      "year": 2025,
      "month": 6,
      "avg_price_per_m2": 1520.0,
      "total_listings": 105
    }
  ]
}
```

---

### 7. Get Projects by District (NEW!)

**Endpoint:** `GET /api/v1/projects/district/{district_id}`

**Parameters:**

- `district_id` (path, required): District ID

**Response:** `ProjectListResponse`

**Status Codes:**

- `200` - Success
- `404` - District not found

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/projects/district/001"
```

**Response Example:**

```json
{
  "total": 1,
  "projects": [
    {
      "id": "proj_001",
      "name": "Dự án 1",
      "description": "Dự án test",
      "address": "123 Test St",
      "province_id": "01",
      "province_name": "Hà Nội",
      "district_id": "001",
      "district_name": "Quận Ba Đình",
      "ward_id": "00001",
      "ward_name": "Phường Phúc Xá",
      "longitude": 21.0,
      "latitude": 105.8,
      "total_area": "100000",
      "total_buildings": "5",
      "total_apartments": "100",
      "total_floors": "10",
      "total_investment": "1000000",
      "status": "ongoing",
      "progress": "50"
    }
  ]
}
```

---

### 8. Get Projects by Ward (NEW!)

**Endpoint:** `GET /api/v1/projects/ward/{ward_id}`

**Parameters:**

- `ward_id` (path, required): Ward ID

**Response:** `ProjectListResponse`

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/projects/ward/00001"
```

---

## Response Models

### DistrictResponse

```json
{
  "id": "string",
  "name": "string",
  "prefix": "string",
  "longitude": "number",
  "latitude": "number"
}
```

**Fields:**

- `id`: Unique district identifier
- `name`: District name
- `prefix`: Prefix (e.g., "Quận", "Huyện")
- `longitude`: GPS longitude coordinate
- `latitude`: GPS latitude coordinate

---

### WardResponse

```json
{
  "id": "string",
  "name": "string",
  "prefix": "string",
  "longitude": "number",
  "latitude": "number"
}
```

**Fields:**

- `id`: Unique ward identifier
- `name`: Ward name
- `prefix`: Prefix (e.g., "Phường", "Xã")
- `longitude`: GPS longitude coordinate
- `latitude`: GPS latitude coordinate

---

### AvgPriceResponse

```json
{
  "id": "string",
  "name": "string",
  "avg_price_per_m2": "number or null",
  "total_listings": "integer"
}
```

**Fields:**

- `id`: Location identifier
- `name`: Location name
- `avg_price_per_m2`: Average price per square meter (null if no data)
- `total_listings`: Total number of listings in this location

---

### MonthlyPriceItem

```json
{
  "year": "integer",
  "month": "integer",
  "avg_price_per_m2": "number or null",
  "total_listings": "integer"
}
```

**Fields:**

- `year`: Year of the data
- `month`: Month (1-12)
- `avg_price_per_m2`: Average price per m² for that month
- `total_listings`: Number of listings in that month

---

### AddressPriceResponse

```json
{
  "address": "string",
  "type_id": "string or null",
  "geocode_source": "nominatim | mapbox",
  "longitude": "number",
  "latitude": "number",
  "radius_meters": "integer",
  "monthly_prices": "Array[MonthlyPriceItem]"
}
```

**Fields:**

- `address`: Input address string
- `type_id`: Property type filter (if provided)
- `geocode_source`: Which geocoder was used ("nominatim" or "mapbox")
- `longitude`: Geocoded longitude
- `latitude`: Geocoded latitude
- `radius_meters`: Search radius (always 1000)
- `monthly_prices`: Array of 12 months of price data

---

### ProjectResponse

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "address": "string",
  "province_id": "string",
  "province_name": "string",
  "district_id": "string",
  "district_name": "string",
  "ward_id": "string",
  "ward_name": "string",
  "longitude": "number",
  "latitude": "number",
  "total_area": "string",
  "total_buildings": "string",
  "total_apartments": "string",
  "total_floors": "string",
  "total_investment": "string",
  "building_density": "string",
  "start_time": "string",
  "completion_time": "string",
  "status": "string",
  "progress": "string",
  "juridical": "string",
  "ownership": "string",
  "lowest_price_per_m2": "number",
  "highest_price_per_m2": "number",
  "lowest_price_per_product": "number",
  "highest_price_per_product": "number",
  "logo": "string",
  "banner": "string",
  "sale_policy": "string",
  "is_published": "boolean",
  "published_at": "string"
}
```

**Key Fields:**

- Project identification: `id`, `name`, `description`
- Location data: `address`, `province_id`, `district_id`, `ward_id`, `longitude`, `latitude`
- Physical specs: `total_area`, `total_buildings`, `total_apartments`, `total_floors`
- Financial: `total_investment`, `lowest_price_per_m2`, `highest_price_per_m2`
- Status: `status`, `progress`, `juridical`, `ownership`
- Media: `logo`, `banner`
- Marketing: `sale_policy`, `is_published`, `published_at`

---

### ProjectListResponse

```json
{
  "total": "integer",
  "projects": "Array[ProjectResponse]"
}
```

**Fields:**

- `total`: Count of returned projects
- `projects`: Array of ProjectResponse objects

---

## Error Handling

### Common Error Responses

**404 Not Found**

```json
{
  "detail": "Không tìm thấy tỉnh với id 'invalid_id'"
}
```

**422 Unprocessable Entity (Geocoding Error)**

```json
{
  "detail": "Không thể xác định tọa độ cho địa chỉ 'invalid address'. Vui lòng thử địa chỉ rõ ràng hơn."
}
```

**500 Internal Server Error**

```json
{
  "detail": "Internal server error"
}
```

### HTTP Status Codes

- `200`: Request successful
- `404`: Resource not found
- `422`: Unprocessable entity (validation error)
- `500`: Internal server error

---

## Examples

### Example 1: Get Districts in Hà Nội

```bash
curl -X GET "http://localhost:8000/api/v1/provinces/01/districts"
```

### Example 2: Get Average Price in a District with Type Filter

```bash
curl -X GET "http://localhost:8000/api/v1/districts/001/avg-price-per-m2?type_id=nha-o"
```

### Example 3: Analyze Prices by Address (Automatic Fallback)

```bash
curl -X POST "http://localhost:8000/api/v1/price/by-address" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
    "type_id": "nha-o"
  }'
```

### Example 4: Get All Projects in a District

```bash
curl -X GET "http://localhost:8000/api/v1/projects/district/001"
```

### Example 5: Using Python Requests

```python
import requests

# Get districts
response = requests.get("http://localhost:8000/api/v1/provinces/01/districts")
districts = response.json()

# Analyze price by address (geocoding automatic with fallback)
data = {
    "address": "123 Nguyễn Trãi, Quận 1, TP.HCM",
    "type_id": "nha-o"
}
response = requests.post(
    "http://localhost:8000/api/v1/price/by-address",
    json=data
)
price_analysis = response.json()
```

---

## Testing

### Test Coverage

- ✅ **48/48 tests passing** (100% success rate)
- **8** analytics tests (price/address and projects)
- **12** districts tests (wards & average price)
- **9** provinces tests (districts & average price)
- **9** wards tests (average price)

### Running Tests

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_analytics.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

### Test Framework

- **Framework:** pytest 8.2.2
- **Async Support:** pytest-asyncio
- **Mocking:** unittest.mock with AsyncMock for async functions
- **HTTP Testing:** FastAPI TestClient

---

## Project Structure

```
Server/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── database.py             # Database connection
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py           # Settings & configuration
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── provinces.py        # Province endpoints
│   │   ├── districts.py        # District endpoints
│   │   ├── wards.py            # Ward endpoints
│   │   └── analytics.py        # Analytics endpoints (NEW)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── district.py         # District models
│   │   ├── price.py            # Price models
│   │   ├── ward.py             # Ward models
│   │   └── project.py          # Project models (NEW)
│   └── services/
│       ├── __init__.py
│       ├── location.py         # Location queries
│       ├── Price.py            # Price calculations
│       ├── geocoding.py        # Geocoding service (NEW)
│       ├── price_history.py    # Monthly price aggregation (NEW)
│       └── projects.py         # Project queries (NEW)
├── tests/
│   ├── conftest.py             # Pytest fixtures & mocks
│   ├── test_provinces.py       # Province tests
│   ├── test_districts.py       # District tests
│   ├── test_wards.py           # Ward tests
│   └── test_analytics.py       # Analytics tests (NEW)
├── requirements.txt            # Python dependencies
├── pytest.ini                  # Pytest configuration
└── README.md                   # Project README
```

---

## Technologies Stack

**Backend Framework:**

- FastAPI 0.111.0
- Starlette (ASGI)
- Pydantic 2.7.4 (Data validation)

**Database:**

- SQLAlchemy 2.0.30 (ORM)
- PostgreSQL (Database)

**Geocoding:**

- httpx 0.27.0 (Async HTTP client)
- Nominatim API (Free, no API key)
- Mapbox API (Optional fallback)

**Date/Time:**

- python-dateutil 2.9.0 (relativedelta for monthly iteration)

**Testing:**

- pytest 8.2.2
- pytest-asyncio (Async test support)
- unittest.mock (Mocking)

**Environment:**

- Python 3.11.14
- Conda (Package manager)

---

## Installation & Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Conda (optional but recommended)

### Installation Steps

```bash
# Create conda environment
conda create -n manhaw python=3.11

# Activate environment
conda activate manhaw

# Install dependencies
pip install -r requirements.txt

# Run migrations (if applicable)
# alembic upgrade head

# Run tests
pytest tests/ -v

# Start server
uvicorn app.main:app --reload
```

### Configuration

Edit `app/core/config.py` to configure:

- Database connection string
- API version
- API prefix

---

## Database Schema Notes

### Key Tables

- `provinces`: Tỉnh/Thành phố data
- `districts`: Quận/Huyện data
- `wards`: Xã/Phường data
- `listings`: Real estate listings with prices
- `projects`: Real estate projects
- `projects_detailed`: Extended project information

### Spatial Queries

The API uses PostgreSQL's Haversine formula for distance calculations:

```sql
(2 * 6371000 * asin(...)) <= 1000  -- 1km radius calculation
```

---

## Performance Notes

- **Geocoding:** Uses Nominatim by default (no API key needed, rate-limited)
- **Price Calculations:** Uses SQL aggregations for performance
- **Monthly Data:** 12-month history generated from 12 separate queries
- **Radius Search:** Uses Haversine distance (efficient for 1km radius)

---

## Future Enhancements

- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Caching (Redis)
- [ ] Pagination for large result sets
- [ ] Advanced filtering options
- [ ] Real-time price updates
- [ ] Multiple radius options
- [ ] CSV export functionality

---

## Support & Debugging

### Access API Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

### Common Issues

**Database Connection Error**

```
ensure PostgreSQL is running and credentials are correct in config.py
```

**Nominatim Timeout**

```
retry the request - will automatically fallback to Mapbox
```

**404 Location Not Found**

```
verify the location ID exists in the database
```

---

## License & Credits

**Application:** Bất Động Sản API  
**Built with:** FastAPI, SQLAlchemy, PostgreSQL  
**Last Updated:** April 2026

---

_For API questions or issues, please check the Swagger docs at `/docs` or review the test cases in `tests/`._

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import provinces, districts, wards, analytics

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API cho trang web bất động sản",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    provinces.router,
    prefix=f"{settings.API_PREFIX}/provinces",
    tags=["Provinces - Tỉnh/Thành phố"]
)
app.include_router(
    districts.router,
    prefix=f"{settings.API_PREFIX}/districts",
    tags=["Districts - Quận/Huyện"]
)
app.include_router(
    wards.router,
    prefix=f"{settings.API_PREFIX}/wards",
    tags=["Wards - Xã/Phường"]
)
app.include_router(
    analytics.router,
    prefix=f"{settings.API_PREFIX}",
    tags=["Analytics - Phân tích giá & Dự án"]
)


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

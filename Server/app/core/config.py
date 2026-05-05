from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Bất Động Sản API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    DB_DRIVER: str = "postgresql"
    DB_USERNAME: str = "postgres"
    DB_PASSWORD: str = "8"
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    DB_NAME: str = "batdongsan_db"

    DEEPSEEK_API_KEY: str = ""
    MAPBOX_API_KEY: str = ""
    
    # CORS Configuration
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://cleverish-kiera-commonplacely.ngrok-free.dev",
    ]

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"{self.DB_DRIVER}://{self.DB_USERNAME}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

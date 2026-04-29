from pydantic import BaseModel
from typing import Optional
from app.schemas.project import MonthlyPriceItem


class DistrictMonthlyPriceResponse(BaseModel):
    district_id: str
    district_name: str
    province_id: Optional[str] = None
    province_name: Optional[str] = None
    type_id: Optional[str] = None
    months: int = 12
    monthly_prices: list[MonthlyPriceItem]

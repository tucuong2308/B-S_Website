from pydantic import BaseModel
from typing import Optional


class AvgPriceResponse(BaseModel):
    id: str
    name: str
    avg_price_per_m2: Optional[float] = None
    total_listings: int

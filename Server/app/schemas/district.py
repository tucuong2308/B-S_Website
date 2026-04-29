from pydantic import BaseModel
from typing import Optional


class DistrictResponse(BaseModel):
    id: str
    name: str
    prefix: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None

    class Config:
        from_attributes = True

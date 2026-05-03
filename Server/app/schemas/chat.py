from pydantic import BaseModel
from typing import List, Optional


class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = []


class ChatResponse(BaseModel):
    response: str

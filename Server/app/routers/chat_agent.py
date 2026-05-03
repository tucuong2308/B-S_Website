import asyncio
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage

from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

# Lazy-load agent để tránh lỗi khi GEMINI_API_KEY chưa được set lúc khởi động
_agent = None


def get_agent():
    global _agent
    if _agent is None:
        from chat_agent.agent_deepseek import agent
        _agent = agent
    return _agent


@router.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    try:
        agent = get_agent()

        messages = []
        for msg in (request.history or []):
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
        messages.append(HumanMessage(content=request.message))

        # Chạy agent đồng bộ trong thread pool để không block event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: agent.invoke({"messages": messages})
        )

        reply = response["messages"][-1].content
        return ChatResponse(response=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

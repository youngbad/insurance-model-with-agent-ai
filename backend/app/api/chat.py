import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, AsyncSessionLocal
from app.models.db_models import Session as DBSession, InsuranceInput, ChatMessage
from app.models.schemas import ChatMessageCreate
from app.services.agent_service import chat_with_agent
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def _build_input_dict(db_input) -> dict:
    if not db_input:
        return {}
    return {
        "general_info": {
            "company_name": db_input.company_name,
            "industry": db_input.industry,
            "country": db_input.country,
            "revenue": db_input.revenue,
            "num_employees": db_input.num_employees,
        },
        "historical_experience": {
            "past_claims_count": db_input.past_claims_count,
            "total_claim_value": db_input.total_claim_value,
            "loss_ratio": db_input.loss_ratio,
            "claim_frequency": db_input.claim_frequency,
        },
        "exposure": {
            "assets_value": db_input.assets_value,
            "locations": db_input.locations,
            "risk_categories": db_input.risk_categories,
            "operational_complexity_score": db_input.operational_complexity_score,
        },
        "derived_metrics": {
            "risk_score": db_input.risk_score,
            "suggested_premium": db_input.suggested_premium,
        },
    }


@router.post("/stream")
async def chat_stream(
    payload: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Stream a chat response from the AI agent (Server-Sent Events)."""
    result = await db.execute(
        select(DBSession).where(DBSession.id == payload.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result2 = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == payload.session_id)
        .order_by(ChatMessage.created_at)
    )
    history_db = result2.scalars().all()
    chat_history = [{"role": m.role, "content": m.content} for m in history_db]

    result3 = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == payload.session_id)
    )
    db_input = result3.scalar_one_or_none()
    input_data = _build_input_dict(db_input)

    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=payload.session_id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    await db.flush()

    full_response_parts = []

    async def generate():
        try:
            async for chunk in chat_with_agent(payload.message, chat_history, input_data):
                full_response_parts.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        full_content = "".join(full_response_parts)
        if full_content:
            async with AsyncSessionLocal() as save_db:
                try:
                    assistant_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        session_id=payload.session_id,
                        role="assistant",
                        content=full_content,
                    )
                    save_db.add(assistant_msg)
                    await save_db.commit()
                except Exception as e:
                    logger.error(f"Error saving assistant message: {e}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get chat history for a session."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import Session as DBSession, InsuranceInput
from app.models.schemas import SessionCreate, SessionResponse, InsuranceInputResponse
import uuid

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(db: AsyncSession = Depends(get_db)):
    """Create a new user session."""
    session = DBSession(id=str(uuid.uuid4()))
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

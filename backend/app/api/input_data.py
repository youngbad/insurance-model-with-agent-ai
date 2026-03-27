from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.models.db_models import Session as DBSession, InsuranceInput
from app.models.schemas import (
    InsuranceInputCreate, InsuranceInputResponse,
    GeneralInfo, HistoricalExperience, Exposure, DerivedMetrics
)
from app.services.agent_service import analyze_risk
import uuid

router = APIRouter(prefix="/input-data", tags=["input-data"])


def _db_to_response(db_input: InsuranceInput) -> InsuranceInputResponse:
    return InsuranceInputResponse(
        id=db_input.id,
        session_id=db_input.session_id,
        general_info=GeneralInfo(
            company_name=db_input.company_name,
            industry=db_input.industry,
            country=db_input.country,
            revenue=db_input.revenue,
            num_employees=db_input.num_employees,
        ),
        historical_experience=HistoricalExperience(
            past_claims_count=db_input.past_claims_count,
            total_claim_value=db_input.total_claim_value,
            loss_ratio=db_input.loss_ratio,
            claim_frequency=db_input.claim_frequency,
        ),
        exposure=Exposure(
            assets_value=db_input.assets_value,
            locations=db_input.locations,
            risk_categories=db_input.risk_categories,
            operational_complexity_score=db_input.operational_complexity_score,
        ),
        derived_metrics=DerivedMetrics(
            risk_score=db_input.risk_score or 0,
            suggested_premium=db_input.suggested_premium or 0,
            risk_explanation=db_input.risk_explanation or "",
        ) if db_input.risk_score is not None else None,
        created_at=db_input.created_at,
        updated_at=db_input.updated_at,
    )


@router.post("", response_model=InsuranceInputResponse)
async def upsert_input_data(
    payload: InsuranceInputCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or update insurance input data for a session."""
    result = await db.execute(
        select(DBSession).where(DBSession.id == payload.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result2 = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == payload.session_id)
    )
    db_input = result2.scalar_one_or_none()

    if not db_input:
        db_input = InsuranceInput(id=str(uuid.uuid4()), session_id=payload.session_id)
        db.add(db_input)

    gi = payload.general_info or GeneralInfo()
    if gi.company_name is not None:
        db_input.company_name = gi.company_name
    if gi.industry is not None:
        db_input.industry = gi.industry
    if gi.country is not None:
        db_input.country = gi.country
    if gi.revenue is not None:
        db_input.revenue = gi.revenue
    if gi.num_employees is not None:
        db_input.num_employees = gi.num_employees

    he = payload.historical_experience or HistoricalExperience()
    if he.past_claims_count is not None:
        db_input.past_claims_count = he.past_claims_count
    if he.total_claim_value is not None:
        db_input.total_claim_value = he.total_claim_value
    if he.loss_ratio is not None:
        db_input.loss_ratio = he.loss_ratio
    if he.claim_frequency is not None:
        db_input.claim_frequency = he.claim_frequency

    exp = payload.exposure or Exposure()
    if exp.assets_value is not None:
        db_input.assets_value = exp.assets_value
    if exp.locations is not None:
        db_input.locations = exp.locations
    if exp.risk_categories is not None:
        db_input.risk_categories = exp.risk_categories
    if exp.operational_complexity_score is not None:
        db_input.operational_complexity_score = exp.operational_complexity_score

    db_input.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(db_input)
    return _db_to_response(db_input)


@router.get("/{session_id}", response_model=InsuranceInputResponse)
async def get_input_data(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get current insurance input data for a session."""
    result = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == session_id)
    )
    db_input = result.scalar_one_or_none()
    if not db_input:
        raise HTTPException(status_code=404, detail="No input data found for session")
    return _db_to_response(db_input)

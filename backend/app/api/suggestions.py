from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import Session as DBSession, InsuranceInput
from app.models.schemas import (
    SuggestionRequest, SuggestionResponse, BulkSuggestionsResponse,
    ValidationRequest, ValidationResponse
)
from app.services.agent_service import suggest_field_value, validate_field

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.post("", response_model=SuggestionResponse)
async def get_suggestion(
    payload: SuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Get a suggestion for a specific field."""
    result = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == payload.session_id)
    )
    db_input = result.scalar_one_or_none()

    session_inputs = {}
    if db_input:
        session_inputs = {
            "general_info": {
                "company_name": db_input.company_name,
                "industry": db_input.industry,
                "country": db_input.country,
                "revenue": db_input.revenue,
                "num_employees": db_input.num_employees,
            },
            "historical_experience": {
                "loss_ratio": db_input.loss_ratio,
                "claim_frequency": db_input.claim_frequency,
            },
            "exposure": {
                "operational_complexity_score": db_input.operational_complexity_score,
            },
        }

    result_data = await suggest_field_value(
        payload.field,
        payload.context or {},
        session_inputs,
    )

    return SuggestionResponse(
        field=payload.field,
        suggested_value=result_data.get("suggested_value"),
        explanation=result_data.get("explanation", ""),
        confidence=result_data.get("confidence", 0.5),
    )


@router.post("/bulk", response_model=BulkSuggestionsResponse)
async def get_bulk_suggestions(
    payload: SuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Get suggestions for all key fields based on current session data."""
    result = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == payload.session_id)
    )
    db_input = result.scalar_one_or_none()

    session_inputs = {}
    if db_input:
        session_inputs = {
            "general_info": {
                "company_name": db_input.company_name,
                "industry": db_input.industry,
                "country": db_input.country,
                "revenue": db_input.revenue,
                "num_employees": db_input.num_employees,
            },
        }

    fields_to_suggest = [
        "loss_ratio", "claim_frequency",
        "operational_complexity_score", "locations",
        "assets_value", "past_claims_count",
    ]

    suggestions = []
    for field in fields_to_suggest:
        result_data = await suggest_field_value(field, payload.context or {}, session_inputs)
        suggestions.append(SuggestionResponse(
            field=field,
            suggested_value=result_data.get("suggested_value"),
            explanation=result_data.get("explanation", ""),
            confidence=result_data.get("confidence", 0.5),
        ))

    return BulkSuggestionsResponse(
        suggestions=suggestions,
        session_id=payload.session_id,
    )


router_validate = APIRouter(prefix="/validate", tags=["validation"])


@router_validate.post("", response_model=ValidationResponse)
async def validate_input(payload: ValidationRequest):
    """Validate a field value."""
    result = await validate_field(payload.field, payload.value, payload.context)
    return ValidationResponse(**result)

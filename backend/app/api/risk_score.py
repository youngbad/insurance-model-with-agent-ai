from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.models.db_models import Session as DBSession, InsuranceInput
from app.models.schemas import RiskScoreResponse
from app.services.agent_service import analyze_risk

router = APIRouter(prefix="/risk-score", tags=["risk-score"])


@router.get("/{session_id}", response_model=RiskScoreResponse)
async def get_risk_score(session_id: str, db: AsyncSession = Depends(get_db)):
    """Calculate and return the risk score for a session."""
    result = await db.execute(
        select(InsuranceInput).where(InsuranceInput.session_id == session_id)
    )
    db_input = result.scalar_one_or_none()
    if not db_input:
        raise HTTPException(status_code=404, detail="No input data found for session")

    input_data = {
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
    }

    analysis = await analyze_risk(input_data)

    db_input.risk_score = analysis["risk_score"]
    db_input.suggested_premium = analysis["suggested_premium"]
    db_input.risk_explanation = analysis["risk_explanation"]
    db_input.updated_at = datetime.utcnow()
    await db.flush()

    what_if = _build_what_if_scenarios(input_data, analysis["risk_score"], analysis["suggested_premium"])

    return RiskScoreResponse(
        session_id=session_id,
        risk_score=analysis["risk_score"],
        suggested_premium=analysis["suggested_premium"],
        risk_explanation=analysis["risk_explanation"],
        risk_factors=analysis["risk_factors"],
        what_if_scenarios=what_if,
    )


def _build_what_if_scenarios(data: dict, base_score: float, base_premium: float):
    """Generate simple what-if scenarios."""
    from app.services.agent_service import _calculate_risk_score, _calculate_premium
    import copy

    scenarios = []

    mod = copy.deepcopy(data)
    he = mod.get("historical_experience", {}) or {}
    current_lr = he.get("loss_ratio") or 0.65
    he["loss_ratio"] = max(0, current_lr * 0.80)
    mod["historical_experience"] = he
    new_score = _calculate_risk_score(mod)
    new_premium = _calculate_premium(mod, new_score)
    scenarios.append({
        "label": "Reduce Loss Ratio by 20%",
        "risk_score": round(new_score, 1),
        "suggested_premium": round(new_premium, 0),
        "premium_change": round(new_premium - base_premium, 0),
        "score_change": round(new_score - base_score, 1),
    })

    mod2 = copy.deepcopy(data)
    exp2 = mod2.get("exposure", {}) or {}
    exp2["operational_complexity_score"] = max(1, (exp2.get("operational_complexity_score") or 5) - 2)
    mod2["exposure"] = exp2
    new_score2 = _calculate_risk_score(mod2)
    new_premium2 = _calculate_premium(mod2, new_score2)
    scenarios.append({
        "label": "Reduce Operational Complexity by 2 points",
        "risk_score": round(new_score2, 1),
        "suggested_premium": round(new_premium2, 0),
        "premium_change": round(new_premium2 - base_premium, 0),
        "score_change": round(new_score2 - base_score, 1),
    })

    mod3 = copy.deepcopy(data)
    exp3 = mod3.get("exposure", {}) or {}
    current_locs = exp3.get("locations") or 1
    exp3["locations"] = max(1, current_locs // 2)
    mod3["exposure"] = exp3
    new_score3 = _calculate_risk_score(mod3)
    new_premium3 = _calculate_premium(mod3, new_score3)
    scenarios.append({
        "label": "Halve Number of Locations",
        "risk_score": round(new_score3, 1),
        "suggested_premium": round(new_premium3, 0),
        "premium_change": round(new_premium3 - base_premium, 0),
        "score_change": round(new_score3 - base_score, 1),
    })

    return scenarios

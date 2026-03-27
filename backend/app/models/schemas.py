from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Insurance Input Schemas ────────────────────────────────────────────────────

class GeneralInfo(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    revenue: Optional[float] = Field(None, ge=0)
    num_employees: Optional[int] = Field(None, ge=1)


class HistoricalExperience(BaseModel):
    past_claims_count: Optional[int] = Field(None, ge=0)
    total_claim_value: Optional[float] = Field(None, ge=0)
    loss_ratio: Optional[float] = Field(None, ge=0, le=10)
    claim_frequency: Optional[float] = Field(None, ge=0)


class Exposure(BaseModel):
    assets_value: Optional[float] = Field(None, ge=0)
    locations: Optional[int] = Field(None, ge=1)
    risk_categories: Optional[List[str]] = None
    operational_complexity_score: Optional[float] = Field(None, ge=0, le=10)


class InsuranceInputCreate(BaseModel):
    session_id: str
    general_info: Optional[GeneralInfo] = None
    historical_experience: Optional[HistoricalExperience] = None
    exposure: Optional[Exposure] = None


class DerivedMetrics(BaseModel):
    risk_score: float
    suggested_premium: float
    risk_explanation: str


class InsuranceInputResponse(BaseModel):
    id: str
    session_id: str
    general_info: GeneralInfo
    historical_experience: HistoricalExperience
    exposure: Exposure
    derived_metrics: Optional[DerivedMetrics] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Chat Schemas ───────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    session_id: str
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    message: str
    session_id: str


# ── Suggestion Schemas ─────────────────────────────────────────────────────────

class SuggestionRequest(BaseModel):
    session_id: str
    field: str
    context: Optional[dict] = None


class SuggestionResponse(BaseModel):
    field: str
    suggested_value: Any
    explanation: str
    confidence: float


class BulkSuggestionsResponse(BaseModel):
    suggestions: List[SuggestionResponse]
    session_id: str


# ── Validation Schemas ─────────────────────────────────────────────────────────

class ValidationRequest(BaseModel):
    field: str
    value: Any
    context: Optional[dict] = None


class ValidationResponse(BaseModel):
    field: str
    is_valid: bool
    message: str
    severity: str  # "info" | "warning" | "error"


# ── Session Schemas ────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    pass


class SessionResponse(BaseModel):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Risk Score Schemas ─────────────────────────────────────────────────────────

class RiskScoreResponse(BaseModel):
    session_id: str
    risk_score: float
    suggested_premium: float
    risk_explanation: str
    risk_factors: List[dict]
    what_if_scenarios: Optional[List[dict]] = None

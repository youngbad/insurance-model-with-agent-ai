"""
AI Agent service: orchestrates LLM calls with RAG context and tool execution.
"""
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional, List

from openai import AsyncOpenAI
from app.core.config import get_settings
from app.rag.pipeline import retrieve_context, format_retrieved_context

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


SYSTEM_PROMPT = """You are an expert insurance underwriting assistant with deep knowledge of:
- Insurance underwriting principles and risk assessment
- Commercial insurance products (property, liability, workers comp, etc.)
- Risk scoring methodologies
- Premium calculation frameworks
- Industry-specific risk profiles

Your role is to help users complete insurance risk assessment forms by:
1. Explaining what each field means and why it matters
2. Suggesting appropriate values based on industry benchmarks
3. Validating inputs and flagging unusual values
4. Providing risk insights and premium guidance
5. Running "what-if" scenarios to show how changes affect risk

Always base your responses on the provided knowledge base context when available.
Be specific, use numbers and benchmarks when relevant.
Keep responses concise but complete."""


def _build_insurance_context(input_data: Optional[Dict[str, Any]]) -> str:
    """Build a context string from current insurance input data."""
    if not input_data:
        return "No insurance data has been entered yet."

    parts = []

    gi = input_data.get("general_info", {}) or {}
    if any(gi.values()):
        parts.append("**Current Input Data:**")
        if gi.get("company_name"):
            parts.append(f"- Company: {gi['company_name']}")
        if gi.get("industry"):
            parts.append(f"- Industry: {gi['industry']}")
        if gi.get("country"):
            parts.append(f"- Country: {gi['country']}")
        if gi.get("revenue"):
            parts.append(f"- Revenue: ${gi['revenue']:,.0f}")
        if gi.get("num_employees"):
            parts.append(f"- Employees: {gi['num_employees']}")

    he = input_data.get("historical_experience", {}) or {}
    if any(he.values()):
        if he.get("past_claims_count") is not None:
            parts.append(f"- Past Claims Count: {he['past_claims_count']}")
        if he.get("total_claim_value"):
            parts.append(f"- Total Claim Value: ${he['total_claim_value']:,.0f}")
        if he.get("loss_ratio") is not None:
            parts.append(f"- Loss Ratio: {he['loss_ratio']:.2f}")
        if he.get("claim_frequency") is not None:
            parts.append(f"- Claim Frequency: {he['claim_frequency']:.2f}")

    exp = input_data.get("exposure", {}) or {}
    if any(exp.values()):
        if exp.get("assets_value"):
            parts.append(f"- Assets Value: ${exp['assets_value']:,.0f}")
        if exp.get("locations"):
            parts.append(f"- Locations: {exp['locations']}")
        if exp.get("risk_categories"):
            parts.append(f"- Risk Categories: {', '.join(exp['risk_categories'])}")
        if exp.get("operational_complexity_score"):
            parts.append(f"- Operational Complexity: {exp['operational_complexity_score']}/10")

    dm = input_data.get("derived_metrics", {}) or {}
    if dm.get("risk_score") is not None:
        parts.append(f"- **Risk Score: {dm['risk_score']:.1f}/100**")
    if dm.get("suggested_premium"):
        parts.append(f"- **Suggested Premium: ${dm['suggested_premium']:,.0f}**")

    return "\n".join(parts) if parts else "No insurance data entered yet."


async def chat_with_agent(
    message: str,
    chat_history: List[Dict[str, str]],
    input_data: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat response from the AI agent, enhanced with RAG context.
    Yields text chunks as they stream.
    """
    client = _get_client()

    rag_docs = retrieve_context(message, k=3)
    rag_context = format_retrieved_context(rag_docs)
    insurance_context = _build_insurance_context(input_data)

    system_content = SYSTEM_PROMPT
    if rag_context:
        system_content += f"\n\n**Relevant Knowledge Base Context:**\n{rag_context}"
    system_content += f"\n\n{insurance_context}"

    messages = [{"role": "system", "content": system_content}]

    for msg in chat_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    try:
        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1000,
            temperature=0.3,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        yield f"I encountered an error: {str(e)}. Please check your API key and try again."


async def analyze_risk(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze risk and return structured risk score and premium.
    Uses rule-based calculation enhanced by LLM explanation.
    """
    score = _calculate_risk_score(input_data)
    premium = _calculate_premium(input_data, score)
    risk_factors = _extract_risk_factors(input_data, score)

    explanation = await _generate_risk_explanation(input_data, score, premium, risk_factors)

    return {
        "risk_score": round(score, 1),
        "suggested_premium": round(premium, 0),
        "risk_explanation": explanation,
        "risk_factors": risk_factors,
    }


def _calculate_risk_score(data: Dict[str, Any]) -> float:
    """Rule-based risk score calculation (0-100)."""
    score = 0.0

    # ── Loss History Score (0-30) ──────────────────────────────────────────────
    he = data.get("historical_experience", {}) or {}
    loss_ratio = he.get("loss_ratio") or 0

    if loss_ratio < 0.30:
        score += 2
    elif loss_ratio < 0.50:
        score += 5
    elif loss_ratio < 0.65:
        score += 8
    elif loss_ratio < 0.80:
        score += 11
    elif loss_ratio < 1.00:
        score += 14
    else:
        score += 15

    gi = data.get("general_info", {}) or {}
    num_employees = gi.get("num_employees") or 1
    claims_count = he.get("past_claims_count") or 0
    claim_freq = claims_count / max(num_employees, 1)

    # Thresholds represent claims per employee per year:
    # < 0.0001 = < 1 claim per 10,000 employees (essentially zero)
    if claim_freq < 0.0001:
        score += 2
    elif claim_freq < 0.003:
        score += 5
    elif claim_freq < 0.006:
        score += 8
    elif claim_freq < 0.010:
        score += 11
    else:
        score += 15

    # ── Exposure Score (0-25) ──────────────────────────────────────────────────
    exp = data.get("exposure", {}) or {}
    revenue = gi.get("revenue") or 1
    assets = exp.get("assets_value") or 0
    asset_ratio = assets / max(revenue, 1)

    if asset_ratio < 0.5:
        score += 2
    elif asset_ratio < 1.0:
        score += 4
    elif asset_ratio < 2.0:
        score += 6
    elif asset_ratio < 5.0:
        score += 8
    else:
        score += 10

    locations = exp.get("locations") or 1
    if locations == 1:
        score += 1
    elif locations <= 5:
        score += 3
    elif locations <= 15:
        score += 5
    else:
        score += 8

    risk_cats = exp.get("risk_categories") or []
    cat_points = 0
    cat_map = {
        "fire": 2, "natural_catastrophe": 2, "cyber": 2,
        "environmental": 3, "products": 2, "professional": 1,
    }
    for cat in risk_cats:
        cat_points += cat_map.get(cat.lower(), 1)
    score += min(cat_points, 7)

    # ── Industry Risk Score (0-20) ─────────────────────────────────────────────
    industry = (gi.get("industry") or "").lower()
    industry_scores = {
        "technology": 8, "software": 7, "it services": 7,
        "financial services": 6, "finance": 6, "banking": 7, "insurance": 5,
        "professional services": 5, "consulting": 5, "legal": 6,
        "healthcare": 10, "medical": 10, "pharmaceutical": 11,
        "retail": 8, "wholesale": 7, "ecommerce": 7,
        "manufacturing": 12, "light manufacturing": 10,
        "heavy manufacturing": 14, "industrial": 13,
        "construction": 14, "engineering": 11,
        "transportation": 12, "logistics": 11, "shipping": 12,
        "mining": 17, "extraction": 16,
        "chemical": 18, "petrochemical": 19,
        "hospitality": 9, "food service": 9, "restaurant": 9,
        "agriculture": 10, "farming": 10,
        "education": 6, "nonprofit": 5, "government": 5,
    }
    ind_score = 10  # default
    for key, val in industry_scores.items():
        if key in industry:
            ind_score = val
            break
    score += ind_score

    # ── Operational Complexity (0-15) ──────────────────────────────────────────
    complexity = exp.get("operational_complexity_score") or 5
    score += (complexity / 10) * 15

    # ── Financial Stability (0-10) ─────────────────────────────────────────────
    rev_per_emp = revenue / max(num_employees, 1)
    if rev_per_emp > 500_000:
        score += 1
    elif rev_per_emp > 200_000:
        score += 3
    elif rev_per_emp > 100_000:
        score += 5
    elif rev_per_emp > 50_000:
        score += 7
    else:
        score += 9

    return min(score, 100)


def _calculate_premium(data: Dict[str, Any], risk_score: float) -> float:
    """Calculate suggested annual premium based on risk score and exposure."""
    gi = data.get("general_info", {}) or {}
    exp = data.get("exposure", {}) or {}

    revenue = gi.get("revenue") or 0
    assets = exp.get("assets_value") or 0
    num_employees = gi.get("num_employees") or 1

    base_revenue_rate = 0.003
    base_asset_rate = 0.001

    base_premium = (revenue * base_revenue_rate) + (assets * base_asset_rate)

    if risk_score <= 20:
        multiplier = 0.60
    elif risk_score <= 35:
        multiplier = 0.80
    elif risk_score <= 50:
        multiplier = 1.00
    elif risk_score <= 65:
        multiplier = 1.25
    elif risk_score <= 75:
        multiplier = 1.60
    elif risk_score <= 85:
        multiplier = 2.00
    else:
        multiplier = 3.00

    premium = base_premium * multiplier

    if num_employees < 50:
        minimum = 5_000
    elif num_employees < 500:
        minimum = 25_000
    else:
        minimum = 100_000

    return max(premium, minimum)


def _extract_risk_factors(data: Dict[str, Any], score: float) -> List[Dict[str, Any]]:
    """Extract key risk factors with their contribution to the score."""
    factors = []

    he = data.get("historical_experience", {}) or {}
    loss_ratio = he.get("loss_ratio")
    if loss_ratio is not None:
        severity = "high" if loss_ratio > 0.80 else "medium" if loss_ratio > 0.55 else "low"
        factors.append({
            "factor": "Loss Ratio",
            "value": f"{loss_ratio:.2f}",
            "severity": severity,
            "description": f"Loss ratio of {loss_ratio:.2f} is {'above' if loss_ratio > 0.65 else 'within'} typical industry range",
        })

    gi = data.get("general_info", {}) or {}
    industry = gi.get("industry")
    if industry:
        high_risk = any(k in industry.lower() for k in ["chemical", "mining", "construction", "manufacturing"])
        factors.append({
            "factor": "Industry",
            "value": industry,
            "severity": "high" if high_risk else "low",
            "description": f"{industry} is a {'high' if high_risk else 'standard'}-risk industry",
        })

    exp = data.get("exposure", {}) or {}
    risk_cats = exp.get("risk_categories") or []
    if risk_cats:
        high_cats = [c for c in risk_cats if c.lower() in ["environmental", "chemical", "cyber"]]
        factors.append({
            "factor": "Risk Categories",
            "value": ", ".join(risk_cats),
            "severity": "high" if high_cats else "medium",
            "description": f"Exposure in {len(risk_cats)} risk categories",
        })

    complexity = exp.get("operational_complexity_score")
    if complexity is not None:
        factors.append({
            "factor": "Operational Complexity",
            "value": f"{complexity}/10",
            "severity": "high" if complexity >= 7 else "medium" if complexity >= 4 else "low",
            "description": f"Complexity score of {complexity} adds operational risk",
        })

    return factors


async def _generate_risk_explanation(
    data: Dict[str, Any],
    risk_score: float,
    premium: float,
    risk_factors: List[Dict],
) -> str:
    """Generate a natural language explanation of the risk score via LLM."""
    if not settings.openai_api_key:
        return _fallback_explanation(risk_score, premium, risk_factors)

    client = _get_client()
    gi = data.get("general_info", {}) or {}

    prompt = f"""Generate a concise 3-4 sentence explanation of an insurance risk assessment:

Company: {gi.get('company_name', 'Unknown')} ({gi.get('industry', 'Unknown industry')})
Risk Score: {risk_score:.1f}/100
Suggested Annual Premium: ${premium:,.0f}
Key Risk Factors: {json.dumps(risk_factors, indent=2)}

Explain:
1. What the risk score means
2. Key drivers of the score
3. How the premium relates to the risk
4. One actionable recommendation to reduce risk

Be specific and professional. No bullet points - write in paragraph form."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional insurance underwriter."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.3,
        )
        return response.choices[0].message.content or _fallback_explanation(risk_score, premium, risk_factors)
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        return _fallback_explanation(risk_score, premium, risk_factors)


def _fallback_explanation(risk_score: float, premium: float, risk_factors: List[Dict]) -> str:
    """Rule-based fallback explanation when LLM is unavailable."""
    level = "low" if risk_score < 35 else "moderate" if risk_score < 55 else "high" if risk_score < 75 else "very high"
    top_factor = risk_factors[0]["factor"] if risk_factors else "operational profile"
    return (
        f"This account has a {level} risk profile with a score of {risk_score:.1f}/100. "
        f"The primary driver is {top_factor}. "
        f"The suggested annual premium of ${premium:,.0f} reflects the current risk exposure. "
        f"Implementing a formal risk management program could reduce the score and premium."
    )


async def suggest_field_value(
    field: str,
    context: Dict[str, Any],
    session_inputs: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Suggest a value for a specific form field based on context."""
    if not settings.openai_api_key:
        return _rule_based_suggestion(field, context, session_inputs)

    client = _get_client()
    rag_docs = retrieve_context(f"suggest value for insurance field {field}", k=2)
    rag_context = format_retrieved_context(rag_docs)

    prompt = f"""You are an insurance underwriting expert. Suggest an appropriate value for the field: "{field}"

Context:
{json.dumps(context, indent=2)}

Current session inputs:
{json.dumps(session_inputs or {}, indent=2)}

Relevant knowledge:
{rag_context}

Respond with a JSON object containing:
- "suggested_value": the recommended value (number, string, or array as appropriate)
- "explanation": brief explanation (1-2 sentences)
- "confidence": confidence level 0.0-1.0

Only respond with valid JSON."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an insurance underwriting expert. Always respond with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content or "{}")
        return result
    except Exception as e:
        logger.error(f"Error generating suggestion: {e}")
        return _rule_based_suggestion(field, context, session_inputs)


def _rule_based_suggestion(
    field: str,
    context: Dict[str, Any],
    session_inputs: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Simple rule-based suggestion fallback."""
    suggestions = {
        "loss_ratio": {"suggested_value": 0.55, "explanation": "Industry average loss ratio", "confidence": 0.6},
        "claim_frequency": {"suggested_value": 2.5, "explanation": "Average claim frequency per 100 employees", "confidence": 0.5},
        "operational_complexity_score": {"suggested_value": 5.0, "explanation": "Medium complexity for most businesses", "confidence": 0.5},
        "locations": {"suggested_value": 1, "explanation": "Single location is most common for small businesses", "confidence": 0.5},
    }
    return suggestions.get(field, {
        "suggested_value": None,
        "explanation": "No suggestion available for this field",
        "confidence": 0.0,
    })


async def validate_field(
    field: str,
    value: Any,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Validate a field value and return validation result."""
    validations = {
        "loss_ratio": _validate_loss_ratio,
        "claim_frequency": _validate_claim_frequency,
        "operational_complexity_score": _validate_complexity,
        "revenue": _validate_revenue,
        "num_employees": _validate_employees,
    }

    validator = validations.get(field)
    if validator:
        return validator(value, context or {})

    return {"field": field, "is_valid": True, "message": "Value looks valid", "severity": "info"}


def _validate_loss_ratio(value: Any, context: dict) -> dict:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return {"field": "loss_ratio", "is_valid": False, "message": "Loss ratio must be a number", "severity": "error"}

    if v < 0:
        return {"field": "loss_ratio", "is_valid": False, "message": "Loss ratio cannot be negative", "severity": "error"}
    if v > 2.0:
        return {"field": "loss_ratio", "is_valid": False, "message": f"Loss ratio of {v:.2f} is extremely high (>2.0). This may indicate data entry error.", "severity": "warning"}
    if v > 1.0:
        return {"field": "loss_ratio", "is_valid": True, "message": f"Loss ratio > 1.0 indicates losses exceed premium. This is a significant red flag.", "severity": "warning"}
    if v > 0.80:
        return {"field": "loss_ratio", "is_valid": True, "message": f"Loss ratio of {v:.2f} is above industry average. Expect higher premium.", "severity": "warning"}
    return {"field": "loss_ratio", "is_valid": True, "message": f"Loss ratio of {v:.2f} is within acceptable range.", "severity": "info"}


def _validate_claim_frequency(value: Any, context: dict) -> dict:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return {"field": "claim_frequency", "is_valid": False, "message": "Claim frequency must be a number", "severity": "error"}

    if v < 0:
        return {"field": "claim_frequency", "is_valid": False, "message": "Claim frequency cannot be negative", "severity": "error"}
    if v > 50:
        return {"field": "claim_frequency", "is_valid": True, "message": f"Very high claim frequency ({v}). Please verify this value.", "severity": "warning"}
    return {"field": "claim_frequency", "is_valid": True, "message": "Claim frequency looks valid.", "severity": "info"}


def _validate_complexity(value: Any, context: dict) -> dict:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return {"field": "operational_complexity_score", "is_valid": False, "message": "Complexity score must be a number 1-10", "severity": "error"}

    if v < 1 or v > 10:
        return {"field": "operational_complexity_score", "is_valid": False, "message": "Operational complexity score must be between 1 and 10", "severity": "error"}
    return {"field": "operational_complexity_score", "is_valid": True, "message": "Complexity score is valid.", "severity": "info"}


def _validate_revenue(value: Any, context: dict) -> dict:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return {"field": "revenue", "is_valid": False, "message": "Revenue must be a number", "severity": "error"}

    if v < 0:
        return {"field": "revenue", "is_valid": False, "message": "Revenue cannot be negative", "severity": "error"}
    if v < 100_000:
        return {"field": "revenue", "is_valid": True, "message": "Very low revenue. Ensure this is the annual figure.", "severity": "warning"}
    return {"field": "revenue", "is_valid": True, "message": "Revenue looks valid.", "severity": "info"}


def _validate_employees(value: Any, context: dict) -> dict:
    try:
        v = int(value)
    except (TypeError, ValueError):
        return {"field": "num_employees", "is_valid": False, "message": "Number of employees must be an integer", "severity": "error"}

    if v <= 0:
        return {"field": "num_employees", "is_valid": False, "message": "Number of employees must be positive", "severity": "error"}
    if v > 1_000_000:
        return {"field": "num_employees", "is_valid": True, "message": "Very large workforce. Please verify.", "severity": "warning"}
    return {"field": "num_employees", "is_valid": True, "message": "Employee count looks valid.", "severity": "info"}

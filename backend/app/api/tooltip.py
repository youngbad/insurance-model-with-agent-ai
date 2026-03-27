from fastapi import APIRouter, HTTPException
from app.services.agent_service import suggest_field_value
from app.rag.pipeline import retrieve_context, format_retrieved_context

router = APIRouter(prefix="/tooltip", tags=["tooltip"])


@router.get("/{field}")
async def get_tooltip(field: str, industry: str = "", context: str = ""):
    """Get an AI-powered tooltip explanation for a form field."""
    query = f"explain insurance field {field} for {industry or 'general business'}"
    docs = retrieve_context(query, k=2)
    rag_ctx = format_retrieved_context(docs)

    field_descriptions = {
        "company_name": "The legal name of the company being insured.",
        "industry": "The primary business sector. Industry classification directly impacts risk scoring and premium rates.",
        "country": "Country of primary operations. Geographic location affects natural disaster exposure and regulatory requirements.",
        "revenue": "Annual gross revenue in USD. Used to determine appropriate policy limits and premium base.",
        "num_employees": "Total headcount including full-time and part-time employees. Affects workers compensation premium calculation.",
        "past_claims_count": "Total number of insurance claims filed in the past 3 years across all lines of coverage.",
        "total_claim_value": "Aggregate dollar amount of all claims paid or reserved in the past 3 years.",
        "loss_ratio": "Ratio of losses to earned premium (e.g., 0.65 = 65%). A key profitability indicator for insurers.",
        "claim_frequency": "Average number of claims per year. High frequency indicates systemic risk management issues.",
        "assets_value": "Total insurable value of physical assets including buildings, equipment, and inventory.",
        "locations": "Number of distinct operating locations. More locations = broader geographic risk exposure.",
        "risk_categories": "Types of risk exposures present in the business operations.",
        "operational_complexity_score": "A 1-10 scale rating the complexity of business operations. Higher scores indicate more sophisticated risk management needed.",
        "risk_score": "Composite risk score (0-100) calculated from all input factors. Higher score = higher risk = higher premium.",
        "suggested_premium": "Estimated annual insurance premium based on risk analysis.",
    }

    description = field_descriptions.get(field, f"Input field: {field}")

    if rag_ctx:
        description += f"\n\n**From Knowledge Base:**\n{rag_ctx[:500]}..."

    return {"field": field, "tooltip": description}

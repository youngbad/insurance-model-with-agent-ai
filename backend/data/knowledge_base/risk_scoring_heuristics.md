# Risk Scoring Heuristics and Methodology

## Risk Score Calculation Model

### Overview
The Risk Score is a composite metric on a scale of 0-100 that quantifies the overall insurance risk of a company. Higher scores indicate greater risk.

### Score Components and Weights

| Component | Weight | Max Points |
|-----------|--------|------------|
| Loss History Score | 30% | 30 |
| Exposure Score | 25% | 25 |
| Industry Risk Score | 20% | 20 |
| Operational Risk Score | 15% | 15 |
| Financial Stability Score | 10% | 10 |
| **Total** | **100%** | **100** |

---

## Component Calculations

### 1. Loss History Score (0-30 points)

**Loss Ratio Component (0-15 points)**
- Loss ratio < 0.30: 2 points
- Loss ratio 0.30-0.50: 5 points
- Loss ratio 0.50-0.65: 8 points
- Loss ratio 0.65-0.80: 11 points
- Loss ratio 0.80-1.00: 14 points
- Loss ratio > 1.00: 15 points

**Claim Frequency Component (0-15 points)**
- Claim frequency per employee < 0.01: 2 points
- 0.01-0.03: 5 points
- 0.03-0.06: 8 points
- 0.06-0.10: 11 points
- > 0.10: 15 points

### 2. Exposure Score (0-25 points)

**Asset Value Component (0-10 points)**
- Scales with total insured value relative to revenue
- Asset-to-Revenue ratio < 0.5: 2 points
- 0.5-1.0: 4 points
- 1.0-2.0: 6 points
- 2.0-5.0: 8 points
- > 5.0: 10 points

**Geographic Spread Component (0-8 points)**
- Single location: 1 point
- 2-5 locations: 3 points
- 6-15 locations: 5 points
- 16+ locations: 8 points

**Risk Category Component (0-7 points)**
- Each high-risk category adds points:
  - Fire hazard: +2
  - Natural catastrophe: +2
  - Cyber exposure: +2
  - Environmental: +3
  - Products liability: +2
  - Maximum 7 points

### 3. Industry Risk Score (0-20 points)

**Base Industry Scores**
- Financial Services / Professional Services: 4-6 points
- Retail / Wholesale: 6-8 points
- Technology: 7-9 points
- Healthcare: 8-11 points
- Manufacturing (light): 8-11 points
- Transportation / Logistics: 10-13 points
- Construction: 12-15 points
- Manufacturing (heavy): 13-16 points
- Mining / Extraction: 16-18 points
- Chemical / Petrochemical: 17-20 points

### 4. Operational Risk Score (0-15 points)

- Directly maps from operational complexity score (1-10)
- Formula: Operational Points = (complexity_score / 10) × 15
- Score 1-2: 1.5-3 points
- Score 3-4: 4.5-6 points
- Score 5-6: 7.5-9 points
- Score 7-8: 10.5-12 points
- Score 9-10: 13.5-15 points

### 5. Financial Stability Score (0-10 points)

**Revenue per Employee Indicator**
- > $500K/employee: 1 point (highly productive, well-resourced)
- $200K-$500K: 3 points
- $100K-$200K: 5 points
- $50K-$100K: 7 points
- < $50K: 9-10 points (may be under-resourced for safety)

---

## Premium Calculation Heuristics

### Base Premium Formula
```
Base Premium = (Total Assets Value × Base Rate) + (Annual Revenue × Revenue Rate)
```

Where:
- Base Rate = 0.001 to 0.020 depending on risk score
- Revenue Rate = 0.002 to 0.015 depending on industry

### Risk Score Premium Multiplier
| Risk Score Range | Premium Multiplier |
|-----------------|-------------------|
| 0-20 | 0.60 (60% of base) |
| 21-35 | 0.80 |
| 36-50 | 1.00 (base rate) |
| 51-65 | 1.25 |
| 66-75 | 1.60 |
| 76-85 | 2.00 |
| 86-100 | Decline or 3.00+ |

### Minimum Premium Guidelines
- Small businesses (< 50 employees): $5,000 minimum annual premium
- Medium businesses (50-500 employees): $25,000 minimum
- Large businesses (500+ employees): $100,000 minimum

---

## Red Flag Indicators

### Automatic Referral to Senior Underwriter
1. Loss ratio > 1.20 in past 3 years
2. Single claim > 50% of annual premium
3. Claims frequency > 3x industry average
4. Risk score > 80
5. Any environmental liability claims in history
6. Operations in sanctions-listed countries

### Automatic Declination Criteria
1. Loss ratio > 2.0 consecutive years
2. Criminal prosecution of management for safety violations
3. Operations in excluded industries (cannabis, firearms, certain mining)
4. Risk score > 90 without exceptional mitigation

---

## What-If Analysis Framework

### Premium Sensitivity Factors
1. **Reducing Loss Ratio by 20%**: Typically reduces premium by 10-15%
2. **Implementing Safety Program**: Can reduce premium by 5-20%
3. **Reducing Locations by 50%**: Reduces exposure component by ~4 points
4. **Improving Operational Complexity**: Each point reduction saves ~1.5 risk score points
5. **Increasing Deductible**: $10K to $50K deductible typically saves 8-12%
6. **Risk Management Certification (ISO 31000)**: -5% to -10% premium credit

### Scenario Modeling Examples

**Scenario A: New Manufacturing Company**
- Industry: Light Manufacturing
- Revenue: $5M
- Employees: 50
- No loss history (new business)
- Expected Risk Score: 45-55
- Estimated Annual Premium: $75,000-$120,000

**Scenario B: Established Professional Services**
- Industry: Consulting/Professional Services
- Revenue: $20M
- Employees: 150
- Clean loss history (3 years)
- Expected Risk Score: 20-30
- Estimated Annual Premium: $40,000-$65,000

**Scenario C: High-Risk Construction**
- Industry: Construction
- Revenue: $50M
- Employees: 300
- Loss ratio 0.85 last 3 years
- Expected Risk Score: 65-75
- Estimated Annual Premium: $500,000-$800,000

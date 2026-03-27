export interface GeneralInfo {
  company_name?: string;
  industry?: string;
  country?: string;
  revenue?: number;
  num_employees?: number;
}

export interface HistoricalExperience {
  past_claims_count?: number;
  total_claim_value?: number;
  loss_ratio?: number;
  claim_frequency?: number;
}

export interface Exposure {
  assets_value?: number;
  locations?: number;
  risk_categories?: string[];
  operational_complexity_score?: number;
}

export interface DerivedMetrics {
  risk_score: number;
  suggested_premium: number;
  risk_explanation: string;
}

export interface InsuranceInput {
  id: string;
  session_id: string;
  general_info: GeneralInfo;
  historical_experience: HistoricalExperience;
  exposure: Exposure;
  derived_metrics?: DerivedMetrics;
  created_at: string;
  updated_at: string;
}

export interface RiskFactor {
  factor: string;
  value: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface WhatIfScenario {
  label: string;
  risk_score: number;
  suggested_premium: number;
  premium_change: number;
  score_change: number;
}

export interface RiskScoreResponse {
  session_id: string;
  risk_score: number;
  suggested_premium: number;
  risk_explanation: string;
  risk_factors: RiskFactor[];
  what_if_scenarios?: WhatIfScenario[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface SuggestionResponse {
  field: string;
  suggested_value: string | number | string[] | null;
  explanation: string;
  confidence: number;
}

export interface ValidationResponse {
  field: string;
  is_valid: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SessionResponse {
  id: string;
  created_at: string;
}

export const RISK_CATEGORIES = [
  { value: 'fire', label: 'Fire Hazard' },
  { value: 'natural_catastrophe', label: 'Natural Catastrophe' },
  { value: 'cyber', label: 'Cyber Liability' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'products', label: 'Products Liability' },
  { value: 'professional', label: 'Professional Liability' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'crime', label: 'Crime / Theft' },
];

export const INDUSTRIES = [
  'Technology',
  'Software',
  'Financial Services',
  'Banking',
  'Healthcare',
  'Pharmaceutical',
  'Manufacturing',
  'Heavy Manufacturing',
  'Construction',
  'Retail',
  'Wholesale',
  'Transportation',
  'Logistics',
  'Hospitality',
  'Professional Services',
  'Consulting',
  'Legal',
  'Education',
  'Agriculture',
  'Mining',
  'Chemical',
  'Petrochemical',
  'Nonprofit',
  'Other',
];

export const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Australia',
  'Japan',
  'China',
  'India',
  'Brazil',
  'Mexico',
  'Netherlands',
  'Switzerland',
  'Singapore',
  'South Korea',
  'Other',
];

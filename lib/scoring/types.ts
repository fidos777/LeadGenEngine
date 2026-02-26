import type {
  TenantStructure,
  OperatingHours,
  OwnershipStatus,
} from "@/types/index";

// Input for ATAP-aware scoring
export type AtapScoringInput = {
  sector: string | null;
  zone: string | null;
  estimated_md_kw: number | null;
  tenant_structure: TenantStructure | null;
  operating_hours: OperatingHours | null;
  estimated_roof_sqft: number | null;
  tnb_bill_band: string | null;
  ownership_status: OwnershipStatus | null;
};

// ATAP eligibility result (hard filter — pass/fail)
export type AtapEligibility = {
  eligible: boolean;
  disqualify_reasons: string[];
  warnings: string[];
};

// Fit score breakdown
export type LeadScore = {
  fit_score: number; // 0–50
  urgency_score: number; // 0–30
  priority_score: number; // 0–100 final composite
};

// Full scoring result combining eligibility + fit
export type AtapScoringResult = {
  eligibility: AtapEligibility;
  score: LeadScore;
  recommended_kwp_band: string | null;
};

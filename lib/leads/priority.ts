import { scoreProspect } from "@/lib/scoring/solar";
import type { AtapScoringInput, AtapScoringResult } from "@/lib/scoring/types";
import { type LeadStatus, ACTIONABLE_STATUSES } from "./status";

type LeadWithCompany = {
  id: string;
  status: LeadStatus;
  opportunity_type: string;
  updated_at: string;
  companies: {
    name: string;
    sector: string | null;
    zone: string | null;
    estimated_md_kw: number | null;
    tenant_structure: string | null;
    operating_hours: string | null;
    estimated_roof_sqft: number | null;
    tnb_bill_band: string | null;
    ownership_status: string | null;
  } | null;
};

type RankedLead = LeadWithCompany & {
  atap_result: AtapScoringResult | null;
};

const DEFAULT_LIMIT = 10;

export function rankLeads(
  leads: LeadWithCompany[],
  limit = DEFAULT_LIMIT
): RankedLead[] {
  return leads
    .filter((lead) => ACTIONABLE_STATUSES.includes(lead.status))
    .map((lead) => {
      let atap_result: AtapScoringResult | null = null;

      if (lead.opportunity_type === "solar" && lead.companies) {
        const input: AtapScoringInput = {
          sector: lead.companies.sector,
          zone: lead.companies.zone,
          estimated_md_kw: lead.companies.estimated_md_kw ?? null,
          tenant_structure:
            (lead.companies.tenant_structure as AtapScoringInput["tenant_structure"]) ??
            null,
          operating_hours:
            (lead.companies.operating_hours as AtapScoringInput["operating_hours"]) ??
            null,
          estimated_roof_sqft: lead.companies.estimated_roof_sqft ?? null,
          tnb_bill_band: lead.companies.tnb_bill_band ?? null,
          ownership_status:
            (lead.companies.ownership_status as AtapScoringInput["ownership_status"]) ??
            null,
        };
        atap_result = scoreProspect(input);
      }

      return { ...lead, atap_result };
    })
    .sort((a, b) => {
      // Ineligible leads sort to bottom
      const aEligible = a.atap_result?.eligibility.eligible ?? true;
      const bEligible = b.atap_result?.eligibility.eligible ?? true;
      if (aEligible && !bEligible) return -1;
      if (!aEligible && bEligible) return 1;

      // Then by priority score descending
      const scoreA = a.atap_result?.score.priority_score ?? 0;
      const scoreB = b.atap_result?.score.priority_score ?? 0;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

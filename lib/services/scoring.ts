import type { Lead } from "@/types";

export interface ScoringFactors {
  hasDirectorData: boolean;
  hasContactInfo: boolean;
  industryMatch: boolean;
  zoneMatch: boolean;
  companyAge?: number;
}

export function calculateLeadScore(factors: ScoringFactors): number {
  let score = 0;

  if (factors.hasDirectorData) score += 30;
  if (factors.hasContactInfo) score += 25;
  if (factors.industryMatch) score += 20;
  if (factors.zoneMatch) score += 15;
  if (factors.companyAge && factors.companyAge > 5) score += 10;

  return Math.min(score, 100);
}

export async function scoreLeads(_leads: Lead[]): Promise<Lead[]> {
  // TODO: Implement batch scoring
  throw new Error("Not implemented");
}

/**
 * Solar ATAP Scoring Engine v2.0
 *
 * Two-layer model:
 * 1. ATAP Eligibility Gate — hard pass/fail based on GP/ST/No.60/2025
 * 2. Weighted Fit Score — prioritization within eligible prospects
 *
 * References:
 * - Solar ATAP Guidelines (GP/ST/No.60/2025)
 * - Non-domestic SMP-based export settlement
 * - 100% MD cap, ≤1MW ceiling
 * - Multi-tenant exclusion
 * - No credit carry-forward (monthly forfeiture)
 */

import type {
  AtapScoringInput,
  AtapEligibility,
  LeadScore,
  AtapScoringResult,
} from "./types";

// ================================================================
// LAYER 1: ATAP ELIGIBILITY GATE (Binary pass/fail)
// ================================================================

export function checkAtapEligibility(
  input: AtapScoringInput
): AtapEligibility {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Gate 1: Multi-tenant exclusion
  // Solar ATAP explicitly excludes multi-tenant premises
  if (input.tenant_structure === "multi") {
    reasons.push("Multi-tenant structure — excluded by Solar ATAP guidelines");
  }

  // Gate 2: MD cap check (≤1MW for non-domestic)
  if (input.estimated_md_kw !== null && input.estimated_md_kw > 1000) {
    warnings.push(
      `Estimated MD (${input.estimated_md_kw}kW) exceeds 1MW cap — system will be truncated to 1MW`
    );
  }

  // Gate 3: Ownership / lease viability
  // Solar ATAP requires TNB account holder consent
  if (input.ownership_status === "tenant") {
    warnings.push(
      "Tenant occupancy — requires building owner consent for ATAP application"
    );
  }

  // Gate 4: Operating hours → forfeiture risk
  // Night-shift-dominant facilities have high export ratio → SMP settlement
  // is much lower than TNB import rate → forfeiture risk
  if (input.operating_hours === "24hr" || input.operating_hours === "shift") {
    warnings.push(
      "Shift/24hr operation — high export ratio likely, forfeiture risk under monthly reset"
    );
  }

  // Gate 5: Sector exclusion check
  // Some sectors have regulatory complications or typically multi-tenant
  const excludedSectors = ["property_management", "strata_commercial"];
  if (input.sector && excludedSectors.includes(input.sector)) {
    reasons.push(`Sector "${input.sector}" typically excluded from ATAP`);
  }

  return {
    eligible: reasons.length === 0,
    disqualify_reasons: reasons,
    warnings,
  };
}

// ================================================================
// LAYER 2: WEIGHTED FIT SCORE (Prioritization)
// ================================================================

export function calculateSolarScore(input: AtapScoringInput): LeadScore {
  let fit = 0;
  let urgency = 0;

  // ---- Fit (0–50) ----

  // Sector signal (0–15)
  const sectorScores: Record<string, number> = {
    manufacturing: 15,
    engineering: 12,
    food_processing: 14,
    logistics: 10,
    automotive: 13,
    electronics: 12,
    plastics: 13,
    cold_chain: 11,
    commercial: 8,
  };
  if (input.sector) {
    fit += sectorScores[input.sector] ?? 5;
  }

  // Zone signal (0–10)
  const zoneScores: Record<string, number> = {
    Klang: 10,
    "Shah Alam": 10,
    Rawang: 8,
    Semenyih: 8,
    "Petaling Jaya": 7,
    Subang: 7,
    Puchong: 6,
  };
  if (input.zone) {
    fit += zoneScores[input.zone] ?? 3;
  }

  // Bill band signal (0–10)
  // Higher TNB bills = stronger economic case for solar
  if (input.tnb_bill_band) {
    const band = input.tnb_bill_band.toLowerCase();
    if (band.includes("150k") || band.includes("100k")) fit += 10;
    else if (band.includes("50k") || band.includes("60k")) fit += 8;
    else if (band.includes("15k") || band.includes("20k")) fit += 6;
    else if (band.includes("8k") || band.includes("10k")) fit += 4;
    else fit += 2;
  }

  // Roof size signal (0–8)
  if (input.estimated_roof_sqft !== null) {
    if (input.estimated_roof_sqft >= 40000) fit += 8;
    else if (input.estimated_roof_sqft >= 20000) fit += 6;
    else if (input.estimated_roof_sqft >= 10000) fit += 4;
    else if (input.estimated_roof_sqft >= 5000) fit += 2;
  }

  // Operating hours bonus (0–7)
  // Day-dominant operations maximize self-consumption → minimize forfeiture
  if (input.operating_hours === "day_dominant") fit += 7;
  else if (input.operating_hours === "shift") fit += 3;
  else if (input.operating_hours === "24hr") fit += 1;

  fit = Math.min(fit, 50);

  // ---- Urgency (0–30) ----

  // MD in sweet spot (200–400 kW) = fastest close cycle
  if (input.estimated_md_kw !== null) {
    if (input.estimated_md_kw >= 200 && input.estimated_md_kw <= 400) {
      urgency += 15;
    } else if (input.estimated_md_kw >= 100 && input.estimated_md_kw <= 600) {
      urgency += 10;
    } else if (input.estimated_md_kw > 600) {
      urgency += 5;
    }
  }

  // Ownership = faster decision cycle
  if (input.ownership_status === "owner") urgency += 10;
  else if (input.ownership_status === "lease_long") urgency += 5;

  // Single tenant = no structural blocker
  if (input.tenant_structure === "single") urgency += 5;

  urgency = Math.min(urgency, 30);

  const priority = fit + urgency;

  return {
    fit_score: fit,
    urgency_score: urgency,
    priority_score: priority,
  };
}

// ================================================================
// COMBINED: Full ATAP scoring pipeline
// ================================================================

export function scoreProspect(input: AtapScoringInput): AtapScoringResult {
  const eligibility = checkAtapEligibility(input);
  const score = calculateSolarScore(input);

  // Recommended kWp band based on MD (if available)
  let recommended_kwp_band: string | null = null;
  if (input.estimated_md_kw !== null) {
    const md = input.estimated_md_kw;
    // Solar ATAP: system capacity ≤ 100% of MD, capped at 1MW
    const maxCapacity = Math.min(md, 1000);
    // Optimal sizing: 75-85% of MD to minimize forfeiture
    const optLow = Math.round(maxCapacity * 0.75);
    const optHigh = Math.round(maxCapacity * 0.85);
    recommended_kwp_band = `${optLow}–${optHigh} kWp`;
  }

  return {
    eligibility,
    score,
    recommended_kwp_band,
  };
}

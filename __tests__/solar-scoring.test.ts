import { calculateSolarScore, checkAtapEligibility, scoreProspect } from "@/lib/scoring/solar";
import type { AtapScoringInput } from "@/lib/scoring/types";

/** Helper to create a full input with defaults */
function makeInput(overrides: Partial<AtapScoringInput> = {}): AtapScoringInput {
  return {
    sector: null,
    zone: null,
    estimated_md_kw: null,
    tenant_structure: null,
    operating_hours: null,
    estimated_roof_sqft: null,
    tnb_bill_band: null,
    ownership_status: null,
    ...overrides,
  };
}

describe("Solar Scoring — calculateSolarScore", () => {
  test("manufacturing in Klang with high MD scores high", () => {
    const score = calculateSolarScore(
      makeInput({
        sector: "manufacturing",
        zone: "Klang",
        estimated_md_kw: 300,
        tnb_bill_band: "50k",
        operating_hours: "day_dominant",
        ownership_status: "owner",
        tenant_structure: "single",
        estimated_roof_sqft: 30000,
      })
    );

    // Fit: sector 15 + zone 10 + bill 8 + roof 6 + hours 7 = 46
    // Urgency: MD sweet spot 15 + owner 10 + single 5 = 30
    expect(score.fit_score).toBeGreaterThanOrEqual(40);
    expect(score.urgency_score).toBe(30);
    expect(score.priority_score).toBeGreaterThanOrEqual(70);
  });

  test("null inputs score baseline zero", () => {
    const score = calculateSolarScore(makeInput());
    expect(score.fit_score).toBe(0);
    expect(score.urgency_score).toBe(0);
    expect(score.priority_score).toBe(0);
  });

  test("sector-only gives partial fit", () => {
    const score = calculateSolarScore(makeInput({ sector: "food_processing" }));
    expect(score.fit_score).toBe(14); // food_processing = 14
  });
});

describe("Solar Scoring — checkAtapEligibility", () => {
  test("multi-tenant is ineligible", () => {
    const result = checkAtapEligibility(makeInput({ tenant_structure: "multi" }));
    expect(result.eligible).toBe(false);
    expect(result.disqualify_reasons.length).toBeGreaterThan(0);
  });

  test("single-tenant owner is eligible", () => {
    const result = checkAtapEligibility(
      makeInput({ tenant_structure: "single", ownership_status: "owner" })
    );
    expect(result.eligible).toBe(true);
    expect(result.disqualify_reasons).toHaveLength(0);
  });

  test("MD over 1MW generates warning", () => {
    const result = checkAtapEligibility(makeInput({ estimated_md_kw: 1500 }));
    expect(result.eligible).toBe(true); // warning, not disqualifying
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("24hr operation generates forfeiture warning", () => {
    const result = checkAtapEligibility(makeInput({ operating_hours: "24hr" }));
    expect(result.warnings.some((w) => w.includes("forfeiture"))).toBe(true);
  });
});

describe("Solar Scoring — scoreProspect (combined)", () => {
  test("returns recommended kWp band for known MD", () => {
    const result = scoreProspect(makeInput({ estimated_md_kw: 400 }));
    expect(result.recommended_kwp_band).not.toBeNull();
    expect(result.recommended_kwp_band).toContain("kWp");
  });

  test("returns null kWp band when MD unknown", () => {
    const result = scoreProspect(makeInput());
    expect(result.recommended_kwp_band).toBeNull();
  });
});

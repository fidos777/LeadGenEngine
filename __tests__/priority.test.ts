import { rankLeads } from "@/lib/leads/priority";

/** Helper to create a company object with ATAP fields */
function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Co",
    sector: null as string | null,
    zone: null as string | null,
    estimated_md_kw: null as number | null,
    tenant_structure: null as string | null,
    operating_hours: null as string | null,
    estimated_roof_sqft: null as number | null,
    tnb_bill_band: null as string | null,
    ownership_status: null as string | null,
    ...overrides,
  };
}

const mockLeads = [
  {
    id: "1",
    status: "identified" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({
      name: "ABC Mfg",
      sector: "manufacturing",
      zone: "Klang",
      estimated_md_kw: 300,
      ownership_status: "owner",
      tenant_structure: "single",
      operating_hours: "day_dominant",
    }),
  },
  {
    id: "2",
    status: "outreached" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "XYZ Eng", sector: "engineering", zone: "Rawang" }),
  },
  {
    id: "3",
    status: "closed_won" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "Won Co", sector: "manufacturing", zone: "Klang" }),
  },
  {
    id: "4",
    status: "qualified" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "Qual Co" }),
  },
  {
    id: "5",
    status: "responded" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "Resp Co", sector: "manufacturing", zone: "Rawang" }),
  },
  {
    id: "6",
    status: "identified" as const,
    opportunity_type: "solar",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "Ident Co", sector: "engineering", zone: "Shah Alam" }),
  },
  {
    id: "7",
    status: "identified" as const,
    opportunity_type: "fire",
    updated_at: "2024-01-01T00:00:00Z",
    companies: makeCompany({ name: "Fire Co", sector: "manufacturing", zone: "Klang" }),
  },
];

describe("Lead Priority Ranking", () => {
  test("excludes non-actionable statuses", () => {
    const ranked = rankLeads(mockLeads);
    const statuses = ranked.map((l) => l.status);

    expect(statuses).not.toContain("closed_won");
    expect(statuses).not.toContain("closed_lost");
  });

  test("returns max 10 leads by default", () => {
    const ranked = rankLeads(mockLeads);
    expect(ranked.length).toBeLessThanOrEqual(10);
  });

  test("respects custom limit", () => {
    const ranked = rankLeads(mockLeads, 3);
    expect(ranked.length).toBeLessThanOrEqual(3);
  });

  test("sorts eligible leads by priority_score descending", () => {
    const ranked = rankLeads(mockLeads);
    const scores = ranked.map(
      (l) => l.atap_result?.score.priority_score ?? 0
    );

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  test("highest scoring lead is first (manufacturing + Klang + owner + MD 300)", () => {
    const ranked = rankLeads(mockLeads);
    expect(ranked[0].id).toBe("1");
  });
});

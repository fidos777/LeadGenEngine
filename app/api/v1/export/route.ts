import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/getAuthContext";
import { canAccess } from "@/lib/auth/permissions";

/**
 * GET /api/v1/export
 *
 * Exports Band A companies as clean CSV.
 * Query params:
 *   band: 'A' | 'B' | 'Warm' | 'Park' (default: 'A')
 *   format: 'csv' | 'json' (default: 'csv')
 *
 * Output columns: company_name, address, website, phone, fit_score, atap_eligible, last_scored_at
 */

type ExportRow = {
  company_name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  fit_score: number;
  atap_eligible: boolean;
  last_scored_at: string;
};

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: ExportRow[]): string {
  const headers = [
    "company_name",
    "address",
    "website",
    "phone",
    "fit_score",
    "atap_eligible",
    "last_scored_at",
  ];

  const csvRows = [headers.join(",")];

  for (const row of rows) {
    csvRows.push(
      [
        escapeCSV(row.company_name),
        escapeCSV(row.address),
        escapeCSV(row.website),
        escapeCSV(row.phone),
        row.fit_score.toString(),
        row.atap_eligible ? "Yes" : "No",
        escapeCSV(row.last_scored_at),
      ].join(",")
    );
  }

  return csvRows.join("\n");
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "leads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const band = req.nextUrl.searchParams.get("band") || "A";
  const format = req.nextUrl.searchParams.get("format") || "csv";

  if (!["A", "B", "Warm", "Park"].includes(band)) {
    return NextResponse.json(
      { error: "Invalid band. Must be A, B, Warm, or Park" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  // Get latest score per company with the specified band
  // Using a subquery to get the most recent score for each company
  const { data: scores, error: scoresError } = await supabase
    .from("lead_score_history")
    .select(
      `
      company_id,
      fit_score,
      atap_eligible,
      scored_at
    `
    )
    .eq("score_band", band)
    .order("scored_at", { ascending: false });

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  if (!scores || scores.length === 0) {
    if (format === "json") {
      return NextResponse.json({ data: [], count: 0 });
    }
    return new NextResponse("company_name,address,website,phone,fit_score,atap_eligible,last_scored_at\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="band-${band}-companies.csv"`,
      },
    });
  }

  // Dedupe by company_id, keeping most recent score
  const companyScoreMap = new Map<
    string,
    { fit_score: number; atap_eligible: boolean; scored_at: string }
  >();

  for (const score of scores) {
    if (!companyScoreMap.has(score.company_id)) {
      companyScoreMap.set(score.company_id, {
        fit_score: score.fit_score,
        atap_eligible: score.atap_eligible,
        scored_at: score.scored_at,
      });
    }
  }

  const companyIds = Array.from(companyScoreMap.keys());

  // Fetch company details
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, address, google_maps_url, phone")
    .in("id", companyIds);

  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 });
  }

  // Build export rows
  const exportRows: ExportRow[] = (companies || []).map((company) => {
    const scoreData = companyScoreMap.get(company.id)!;
    return {
      company_name: company.name,
      address: company.address,
      website: company.google_maps_url, // Using Google Maps URL as website proxy
      phone: company.phone,
      fit_score: scoreData.fit_score,
      atap_eligible: scoreData.atap_eligible,
      last_scored_at: new Date(scoreData.scored_at).toISOString().split("T")[0],
    };
  });

  // Sort by fit_score descending
  exportRows.sort((a, b) => b.fit_score - a.fit_score);

  if (format === "json") {
    return NextResponse.json({ data: exportRows, count: exportRows.length });
  }

  // CSV response
  const csv = toCSV(exportRows);
  const filename = `band-${band}-companies-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

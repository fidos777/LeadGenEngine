import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EnrichmentPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch companies with enrichment status
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, sector, zone, registration_no, atap_eligible, composite_score, score_tier")
    .order("composite_score", { ascending: false });

  const total = companies?.length ?? 0;
  const withSSM = companies?.filter((c) => c.registration_no).length ?? 0;
  const withScore = companies?.filter((c) => c.composite_score && c.composite_score > 0).length ?? 0;
  const tierA = companies?.filter((c) => c.score_tier === "A").length ?? 0;
  const tierB = companies?.filter((c) => c.score_tier === "B").length ?? 0;

  // Fetch contacts (enriched director data)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, company_id, full_name, name, role, authority_level, phone")
    .order("authority_level", { ascending: false });

  const companiesWithContacts = new Set(contacts?.map((c) => c.company_id) ?? []);
  const directorCount = contacts?.filter((c) => (c.authority_level ?? 0) >= 4).length ?? 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">SSM Enrichment Engine</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Director registry data enrichment · Decision-maker identification
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border border-neutral-800 bg-neutral-950 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            Companies in DB
          </div>
          <div className="text-4xl font-bold text-amber-500">{total}</div>
          <div className="text-xs text-neutral-500 mt-2">{withSSM} with SSM registration</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            Directors Found
          </div>
          <div className="text-4xl font-bold text-emerald-500">{directorCount}</div>
          <div className="text-xs text-neutral-500 mt-2">
            Authority level 4-5 (decision makers)
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            Scored Companies
          </div>
          <div className="text-4xl font-bold text-neutral-100">{withScore}</div>
          <div className="text-xs text-neutral-500 mt-2">
            {tierA} Tier A · {tierB} Tier B
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            Contact Coverage
          </div>
          <div className="text-4xl font-bold text-neutral-100">
            {total > 0 ? `${Math.round((companiesWithContacts.size / total) * 100)}%` : "—"}
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            {companiesWithContacts.size} of {total} companies have contacts
          </div>
        </div>
      </div>

      {/* Enrichment Pipeline Table */}
      <div className="border border-neutral-800 bg-neutral-950 mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            Enrichment Pipeline — All Companies
          </span>
          <div className="flex gap-2">
            <span className="text-xs text-neutral-600 border border-neutral-800 px-3 py-1">
              Filter: All
            </span>
            <span className="text-xs text-amber-500 border border-amber-500/30 px-3 py-1 cursor-pointer">
              Run SSM Lookup
            </span>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 sticky top-0 bg-neutral-950">
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  Company
                </th>
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  SSM Reg
                </th>
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  Director
                </th>
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  ATAP
                </th>
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  Score
                </th>
                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {(companies ?? []).map((company) => {
                const contact = contacts?.find(
                  (c) => c.company_id === company.id && (c.authority_level ?? 0) >= 4
                );
                const hasContact = companiesWithContacts.has(company.id);

                return (
                  <tr
                    key={company.id}
                    className="border-b border-neutral-800/50 hover:bg-neutral-900"
                  >
                    <td className="px-5 py-3">
                      <div className="text-neutral-200 font-medium">{company.name}</div>
                      <div className="text-neutral-600 text-xs mt-0.5">
                        {company.zone} · {company.sector}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {company.registration_no ? (
                        <span className="text-emerald-500 text-xs font-mono">
                          {company.registration_no}
                        </span>
                      ) : (
                        <span className="text-neutral-700 text-xs">Not found</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {contact ? (
                        <div>
                          <div className="text-neutral-200 text-xs">
                            {contact.full_name || contact.name}
                          </div>
                          <div className="text-neutral-600 text-xs">{contact.role}</div>
                        </div>
                      ) : hasContact ? (
                        <span className="text-yellow-500 text-xs">Contact (non-director)</span>
                      ) : (
                        <span className="text-neutral-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {company.atap_eligible === true ? (
                        <span className="text-emerald-500 text-xs font-medium">✓ PASS</span>
                      ) : company.atap_eligible === false ? (
                        <span className="text-red-500 text-xs font-medium">✗ FAIL</span>
                      ) : (
                        <span className="text-neutral-700 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-mono ${
                          (company.composite_score ?? 0) >= 70
                            ? "text-amber-500"
                            : (company.composite_score ?? 0) >= 50
                            ? "text-yellow-500"
                            : "text-neutral-600"
                        }`}
                      >
                        {company.composite_score ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 ${
                          company.score_tier === "A"
                            ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                            : company.score_tier === "B"
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/25"
                            : company.score_tier === "D"
                            ? "bg-red-500/10 text-red-500 border border-red-500/25"
                            : "bg-neutral-800 text-neutral-500 border border-neutral-700"
                        }`}
                      >
                        {company.score_tier || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {total === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-neutral-600 text-sm">
                    No companies in database. Run the demo seed script or import CSV data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrichment workflow hint */}
      <div className="border-l-2 border-amber-500 bg-amber-500/5 pl-5 py-4 text-xs text-neutral-400 leading-relaxed">
        <strong className="text-amber-500">Enrichment Workflow:</strong>{" "}
        Discovery → SSM Registration Lookup → Director Extraction → Phone Verification → ATAP Scoring → Tier Assignment.
        Companies without SSM registration numbers can be searched manually at{" "}
        <span className="text-neutral-300">ssm.com.my</span>.
      </div>
    </div>
  );
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

// Zone configuration — maps to discovery_results/ JSON files
const ZONES = [
  { id: "klang", name: "Klang Industrial Belt", file: "zone_01_klang_raw.json", status: "complete" as const },
  { id: "shah_alam", name: "Shah Alam Sek. 23-27", file: null, status: "pending" as const },
  { id: "subang", name: "Subang Industrial Park", file: null, status: "pending" as const },
  { id: "petaling_jaya", name: "Petaling Jaya", file: null, status: "pending" as const },
  { id: "puchong", name: "Puchong Industrial", file: null, status: "pending" as const },
  { id: "port_klang", name: "Port Klang Corridor", file: null, status: "pending" as const },
  { id: "rawang", name: "Rawang Industrial", file: null, status: "pending" as const },
  { id: "kapar", name: "Kapar / Meru", file: null, status: "pending" as const },
  { id: "seri_kembangan", name: "Seri Kembangan", file: null, status: "pending" as const },
];

type ZoneEntry = {
  title: string;
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  categories?: string[];
  categoryName?: string;
  website?: string;
};

async function loadZoneData(filename: string): Promise<ZoneEntry[]> {
  try {
    const filePath = path.join(process.cwd(), "discovery_results", filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as ZoneEntry[];
  } catch {
    return [];
  }
}

export default async function DiscoveryPage() {
  // Load scraped zone data
  const klangData = await loadZoneData("zone_01_klang_raw.json");
  const totalScraped = klangData.length;

  // Get company counts from Supabase
  const supabase = await createSupabaseServerClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, zone, atap_eligible");

  const totalCompanies = companies?.length ?? 0;
  const atapEligible = companies?.filter((c) => c.atap_eligible === true).length ?? 0;
  const atapIneligible = companies?.filter((c) => c.atap_eligible === false).length ?? 0;

  // Count by zone
  const zoneCounts = new Map<string, { total: number; eligible: number }>();
  for (const c of companies ?? []) {
    const zone = c.zone ?? "Unknown";
    const existing = zoneCounts.get(zone) || { total: 0, eligible: 0 };
    existing.total++;
    if (c.atap_eligible) existing.eligible++;
    zoneCounts.set(zone, existing);
  }

  // Sector breakdown from scraped data
  const sectorCounts = new Map<string, number>();
  for (const entry of klangData) {
    const cat = entry.categoryName || "Unknown";
    sectorCounts.set(cat, (sectorCounts.get(cat) || 0) + 1);
  }
  const topSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Territory Discovery</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Selangor Industrial Zone Mapping · {ZONES.length} Target Zones
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Factories Scraped"
          value={totalScraped.toString()}
          meta="Klang zone (raw Apify data)"
          accent="amber"
        />
        <KpiCard
          label="Companies in DB"
          value={totalCompanies.toString()}
          meta={`${atapEligible} ATAP eligible`}
        />
        <KpiCard
          label="ATAP Pass Rate"
          value={totalCompanies > 0 ? `${Math.round((atapEligible / totalCompanies) * 100)}%` : "—"}
          meta={`${atapIneligible} filtered out`}
        />
        <KpiCard
          label="Zones Active"
          value={`${ZONES.filter((z) => z.status === "complete").length}/${ZONES.length}`}
          meta={`${ZONES.filter((z) => z.status === "pending").length} pending`}
        />
      </div>

      {/* Zone Grid */}
      <div className="border border-neutral-800 bg-neutral-950 mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            Selangor Industrial Zones
          </span>
          <span className="text-xs text-amber-500 cursor-pointer">+ Add Zone</span>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          {ZONES.map((zone) => {
            const counts = zoneCounts.get(zone.name) || zoneCounts.get(zone.id);
            const isComplete = zone.status === "complete" || (counts && counts.total > 0);

            return (
              <div
                key={zone.id}
                className={`border p-5 ${
                  isComplete
                    ? "border-neutral-700 bg-neutral-900"
                    : "border-neutral-800 bg-neutral-950 opacity-50"
                }`}
              >
                {!isComplete && (
                  <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
                    Pending
                  </div>
                )}
                <div className="text-sm font-medium text-neutral-200">{zone.name}</div>
                <div className="text-3xl font-bold text-neutral-100 mt-2">
                  {zone.file ? totalScraped : counts?.total ?? "—"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {isComplete ? "Factories mapped" : "Est. 20-60 factories"}
                </div>
                {isComplete && (
                  <div className="text-xs text-emerald-500 mt-3">
                    ✓ {zone.file ? "Raw data loaded" : `${counts?.eligible ?? 0} ATAP eligible`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two columns: Scraped Data + Sector Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent scraped entries */}
        <div className="border border-neutral-800 bg-neutral-950">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-neutral-500">
              Klang Zone — Raw Scrape ({totalScraped} entries)
            </span>
            <span className="text-xs text-amber-500 cursor-pointer">Import to DB →</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                    Company
                  </th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                    Category
                  </th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-neutral-600 px-5 py-3">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody>
                {klangData.slice(0, 20).map((entry, i) => (
                  <tr key={i} className="border-b border-neutral-800/50 hover:bg-neutral-900">
                    <td className="px-5 py-3">
                      <div className="text-neutral-200 font-medium">{entry.title}</div>
                      <div className="text-neutral-600 text-xs mt-0.5">{entry.city}</div>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{entry.categoryName}</td>
                    <td className="px-5 py-3 text-neutral-400 text-xs font-mono">
                      {entry.phone || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalScraped > 20 && (
              <div className="px-5 py-3 text-xs text-neutral-600 text-center">
                + {totalScraped - 20} more entries
              </div>
            )}
          </div>
        </div>

        {/* Sector breakdown */}
        <div className="border border-neutral-800 bg-neutral-950">
          <div className="px-5 py-4 border-b border-neutral-800">
            <span className="text-xs uppercase tracking-widest text-neutral-500">
              Sector Distribution — Klang Zone
            </span>
          </div>
          <div className="p-5">
            {topSectors.map(([sector, count]) => (
              <div key={sector} className="flex items-center gap-4 mb-4">
                <div className="text-xs text-neutral-400 w-40 truncate">{sector}</div>
                <div className="flex-1 bg-neutral-800 h-5 relative">
                  <div
                    className="bg-amber-500/30 h-full"
                    style={{ width: `${(count / totalScraped) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs text-neutral-300">
                    {count}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 w-12 text-right">
                  {Math.round((count / totalScraped) * 100)}%
                </div>
              </div>
            ))}

            <div className="mt-6 border-l-2 border-amber-500 bg-amber-500/5 pl-4 py-3 text-xs text-neutral-300 leading-relaxed">
              <strong className="text-amber-500">Data source:</strong> Apify Google Maps scraper.
              Cost: RM 0.06/factory. Next zone (Shah Alam) ready to scrape on demand.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  accent?: "amber" | "green";
}) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 relative overflow-hidden">
      {accent && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${
            accent === "amber" ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
      )}
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">{label}</div>
      <div
        className={`text-4xl font-bold ${
          accent === "amber"
            ? "text-amber-500"
            : accent === "green"
            ? "text-emerald-500"
            : "text-neutral-100"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-2">{meta}</div>
    </div>
  );
}

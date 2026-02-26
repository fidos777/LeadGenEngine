import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { canAccess } from "@/lib/auth/permissions";
import {
  PipelineSnapshot,
  RevenueAtRisk,
  ConversionMetricsBar,
  TopLeadsTable,
} from "@/components/control";

// Internal API fetch helper (server-side with cookie forwarding)
async function fetchAPI<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// API response types
type LeadsCountResponse = {
  counts: Record<string, number>;
  total: number;
};

type AtRiskResponse = {
  qualified_overdue: { id: string }[];
  outreached_stale: { id: string }[];
  reverted: { id: string }[];
  meta: { generated_at: string };
};

type ConversionResponse = {
  conversion_rates: {
    identified_to_outreached: number;
    outreached_to_responded: number;
    responded_to_qualified: number;
    qualified_to_appointment: number;
    appointment_to_closed_won: number;
  };
  totals: Record<string, number>;
};

type PriorityLead = {
  id: string;
  status: string;
  opportunity_type: string;
  updated_at: string;
  companies: {
    name: string;
    sector: string | null;
    zone: string | null;
  } | null;
  score: {
    priority_score: number;
    fit_score: number;
    urgency_score: number;
  } | null;
};

export default async function ControlPanelPage() {
  const role = await getUserRoleUnsafe();

  if (!role) {
    redirect("/login");
  }

  if (!canAccess(role, "leads", "read")) {
    redirect("/unauthorized");
  }

  // Parallel API calls — UI consumes Layer 1, does not recompute
  const [countsData, atRiskData, conversionData, priorityData] =
    await Promise.all([
      fetchAPI<LeadsCountResponse>("/api/v1/leads?count=true"),
      fetchAPI<AtRiskResponse>("/api/v1/leads/at-risk"),
      fetchAPI<ConversionResponse>("/api/v1/metrics/conversion"),
      fetchAPI<PriorityLead[]>("/api/v1/leads/priority"),
    ]);

  // Default fallbacks
  const counts = countsData?.counts ?? {
    identified: 0,
    outreached: 0,
    qualified: 0,
    appointment_booked: 0,
  };

  const atRisk = {
    qualifiedOverdue: atRiskData?.qualified_overdue.length ?? 0,
    outreachedStale: atRiskData?.outreached_stale.length ?? 0,
    reverted: atRiskData?.reverted.length ?? 0,
  };

  const conversion = conversionData?.conversion_rates ?? {
    identified_to_outreached: 0,
    outreached_to_responded: 0,
    responded_to_qualified: 0,
    qualified_to_appointment: 0,
    appointment_to_closed_won: 0,
  };

  const priorityLeads = priorityData ?? [];

  // Dropoffs = closed_lost from totals
  const dropoffsLast7d = conversionData?.totals?.closed_lost ?? 0;

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Control Panel</h1>
          <span className="text-xs text-neutral-500">
            {new Date().toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Top Row: Pipeline + At Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PipelineSnapshot
            identified={counts.identified}
            outreached={counts.outreached}
            qualified={counts.qualified}
            booked={counts.appointment_booked}
          />
          <RevenueAtRisk
            qualifiedOverdueCount={atRisk.qualifiedOverdue}
            outreachedStaleCount={atRisk.outreachedStale}
            revertedCount={atRisk.reverted}
          />
        </div>

        {/* Middle: Conversion Bar */}
        <ConversionMetricsBar
          identifiedToOutreached={conversion.identified_to_outreached}
          outreachedToQualified={conversion.outreached_to_responded}
          qualifiedToBooked={conversion.qualified_to_appointment}
          avgDaysToQualified={0}
          dropoffsLast7d={dropoffsLast7d}
        />

        {/* Bottom: Top Leads */}
        <TopLeadsTable
          leads={priorityLeads.map((lead) => ({
            id: lead.id,
            status: lead.status as import("@/lib/leads/status").LeadStatus,
            opportunity_type: lead.opportunity_type,
            companies: lead.companies,
            score: lead.score,
            updated_at: lead.updated_at,
          }))}
        />
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { type LeadStatus } from "@/lib/leads/status";

// Thresholds (days)
const QUALIFIED_OVERDUE_DAYS = 3;
const OUTREACHED_STALE_DAYS = 5;

// Status order for detecting reversions
const STATUS_ORDER: Record<LeadStatus, number> = {
  identified: 0,
  outreached: 1,
  responded: 2,
  qualified: 3,
  atap_screened: 4,
  appointment_booked: 5,
  survey_complete: 6,
  closed_won: 7,
  closed_lost: 7,
};

function daysSince(date: string): number {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const role = await getUserRoleUnsafe();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(role, "leads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const clientId = req.nextUrl.searchParams.get("client_id");

  // Type for leads with company relation
  type LeadWithCompany = {
    id: string;
    status: string;
    updated_at: string;
    company_id: string;
    companies: { name: string; zone: string | null; sector: string | null } | null;
  };

  // Fetch leads with companies and latest activity
  let query = supabase
    .from("leads")
    .select("id, status, updated_at, company_id, companies(name, zone, sector)");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: leadsRaw, error: leadsError } = await query;
  const leads = leadsRaw as LeadWithCompany[] | null;

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  // Fetch activities for reversion detection
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("lead_id, action, metadata, created_at")
    .eq("action", "status_changed")
    .order("created_at", { ascending: false });

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 });
  }

  // Build last activity map
  const lastActivityMap = new Map<string, string>();
  for (const activity of activities || []) {
    if (!lastActivityMap.has(activity.lead_id)) {
      lastActivityMap.set(activity.lead_id, activity.created_at);
    }
  }

  // Detect reversions (status went backward)
  const reversions: {
    id: string;
    company_name: string;
    previous_status: LeadStatus;
    current_status: LeadStatus;
    reverted_at: string;
  }[] = [];

  for (const activity of activities || []) {
    const meta = activity.metadata as { from?: string; to?: string } | null;
    if (!meta?.from || !meta?.to) continue;

    const fromOrder = STATUS_ORDER[meta.from as LeadStatus];
    const toOrder = STATUS_ORDER[meta.to as LeadStatus];

    // Reversion = moved backward (excluding closed states)
    if (
      fromOrder !== undefined &&
      toOrder !== undefined &&
      toOrder < fromOrder &&
      meta.to !== "closed_lost"
    ) {
      const lead = leads?.find((l) => l.id === activity.lead_id);
      if (lead) {
        reversions.push({
          id: lead.id,
          company_name: lead.companies?.name ?? "Unknown",
          previous_status: meta.from as LeadStatus,
          current_status: meta.to as LeadStatus,
          reverted_at: activity.created_at,
        });
      }
    }
  }

  // Qualified overdue (> 3 days, no recent activity)
  const qualifiedOverdue = (leads || [])
    .filter((lead) => {
      if (lead.status !== "qualified") return false;
      const lastActivity = lastActivityMap.get(lead.id) || lead.updated_at;
      return daysSince(lastActivity) > QUALIFIED_OVERDUE_DAYS;
    })
    .map((lead) => ({
      id: lead.id,
      company_name: lead.companies?.name ?? "Unknown",
      zone: lead.companies?.zone ?? null,
      sector: lead.companies?.sector ?? null,
      status: lead.status as LeadStatus,
      days_in_stage: daysSince(lead.updated_at),
      last_activity_at: lastActivityMap.get(lead.id) || null,
      priority_score: null,
    }));

  // Outreached stale (> 5 days)
  const outreachedStale = (leads || [])
    .filter((lead) => {
      if (lead.status !== "outreached") return false;
      return daysSince(lead.updated_at) > OUTREACHED_STALE_DAYS;
    })
    .map((lead) => ({
      id: lead.id,
      company_name: lead.companies?.name ?? "Unknown",
      zone: lead.companies?.zone ?? null,
      sector: lead.companies?.sector ?? null,
      status: lead.status as LeadStatus,
      days_in_stage: daysSince(lead.updated_at),
      last_activity_at: lastActivityMap.get(lead.id) || null,
      priority_score: null,
    }));

  return NextResponse.json({
    qualified_overdue: qualifiedOverdue,
    outreached_stale: outreachedStale,
    reverted: reversions,
    meta: {
      generated_at: new Date().toISOString(),
      client_scope: clientId || null,
    },
  });
}

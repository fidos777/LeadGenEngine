import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { canAccess } from "@/lib/auth/permissions";
import { evaluateLead } from "@/lib/assist";
import type { LeadStatus } from "@/lib/leads/status";

// Read-only advisory endpoint
// No mutations. Pure analysis.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getUserRoleUnsafe();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(role, "leads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  // Fetch lead core data
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, status, updated_at, qualification_json")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch activities (ordered newest first for analysis)
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("action, metadata, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  if (activitiesError) {
    return NextResponse.json(
      { error: activitiesError.message },
      { status: 500 }
    );
  }

  // Compute historical average for this stage (optional enhancement)
  // For v1, we compute from all leads in the same status
  let avgStageDuration: number | null = null;

  try {
    // Get leads that have transitioned OUT of current status
    const { data: stageHistory } = await supabase
      .from("activities")
      .select("lead_id, metadata, created_at")
      .eq("action", "status_changed")
      .not("metadata->from", "is", null);

    if (stageHistory && stageHistory.length > 0) {
      // Filter transitions FROM the current status
      const transitionsFromStatus = stageHistory.filter(
        (a) => (a.metadata as { from?: string })?.from === lead.status
      );

      if (transitionsFromStatus.length >= 3) {
        // Need at least 3 data points for meaningful average
        // For each transition, we'd need the entry time (when they entered this status)
        // This is a simplified version - full implementation would track entry times
        // For now, skip historical average in v1
        avgStageDuration = null;
      }
    }
  } catch {
    // Non-critical - continue without historical data
    avgStageDuration = null;
  }

  // Run deterministic evaluation
  const result = evaluateLead({
    lead_id: lead.id,
    status: lead.status as LeadStatus,
    updated_at: lead.updated_at,
    qualification: lead.qualification_json as Record<string, boolean> | null,
    activities: (activities || []).map((a) => ({
      action: a.action,
      metadata: a.metadata as Record<string, unknown> | null,
      created_at: a.created_at,
    })),
    avg_stage_duration: avgStageDuration,
  });

  return NextResponse.json(result);
}

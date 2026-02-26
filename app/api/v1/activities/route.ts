import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import type { LeadActivity } from "@/types/lead-detail";

// READ-ONLY endpoint
// All mutations go through /api/v1/leads/[id]/execute

export async function GET(req: NextRequest) {
  const role = await getUserRoleUnsafe();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(role, "leads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const leadId = req.nextUrl.searchParams.get("lead_id");

  if (!leadId) {
    return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("activities")
    .select("id, lead_id, action, metadata, actor_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activities: LeadActivity[] = (data || []).map((a) => ({
    id: a.id,
    lead_id: a.lead_id,
    action: a.action as LeadActivity["action"],
    metadata: a.metadata,
    created_at: a.created_at,
    actor_id: a.actor_id,
  }));

  return NextResponse.json(activities);
}

// POST deprecated - use /api/v1/leads/[id]/execute instead
export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated. Use POST /api/v1/leads/[id]/execute for atomic execution.",
    },
    { status: 410 } // Gone
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/getAuthContext";
import { canAccess } from "@/lib/auth/permissions";
import { canTransition, type LeadStatus } from "@/lib/leads/transitions";
import type { QualificationChecklist } from "@/types/lead-detail";

type ExecutePayload = {
  activity: {
    outcome: string;
    gatekeeper_outcome?: string;
    intel_gathered?: string;
    interest_level?: number;
    follow_up_needed?: boolean;
    follow_up_date?: string;
  };
  new_status?: LeadStatus;
  qualification_update?: QualificationChecklist;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "leads", "write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as ExecutePayload;

  if (!body.activity || !body.activity.outcome) {
    return NextResponse.json(
      { error: "Activity with outcome required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Pre-validate transition at API level (DB also enforces)
  if (body.new_status) {
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const currentStatus = lead.status as LeadStatus;

    if (!canTransition(currentStatus, body.new_status)) {
      return NextResponse.json(
        { error: `Invalid transition: ${currentStatus} → ${body.new_status}` },
        { status: 400 }
      );
    }

    // Pre-validate qualification gate at API level for better error messages
    if (body.new_status === "qualified") {
      const qualification = body.qualification_update;
      if (!qualification) {
        return NextResponse.json(
          { error: "Qualification checklist required for qualified status" },
          { status: 400 }
        );
      }

      const requiredFields = [
        "owner_present",
        "own_building",
        "roof_suitable",
        "sufficient_tnb",
        "budget_confirmed",
        "timeline_valid",
        "decision_maker_identified",
        "compliance_checked",
      ] as const;

      const missingFields = requiredFields.filter(
        (field) => !qualification[field]
      );

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Qualification gate incomplete",
            missing_fields: missingFields,
          },
          { status: 400 }
        );
      }
    }
  }

  // Execute atomic RPC with actor attribution + qualification
  const { data, error } = await supabase.rpc("execute_lead_action", {
    p_lead_id: id,
    p_actor_id: auth.userId,
    p_activity_metadata: body.activity,
    p_new_status: body.new_status ?? null,
    p_qualification: body.qualification_update ?? null,
  });

  if (error) {
    // Parse DB error for better client messages
    if (error.message.includes("Qualification gate incomplete")) {
      return NextResponse.json(
        { error: "Qualification gate incomplete. Cannot transition to qualified." },
        { status: 400 }
      );
    }
    if (error.message.includes("Invalid transition")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { getAuthContext } from "@/lib/auth/getAuthContext";
import { type LeadStatus } from "@/lib/leads/status";
import { calculateSolarScore } from "@/lib/scoring/solar";
import type {
  LeadDetailResponse,
  LeadScore,
  LeadActivity,
} from "@/types/lead-detail";

// Derive score band from priority_score
function getScoreBand(priorityScore: number): LeadScore["band"] {
  if (priorityScore >= 80) return "A";
  if (priorityScore >= 60) return "B";
  if (priorityScore >= 40) return "Warm";
  return "Park";
}

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

  // Type for lead with relations
  type LeadRow = {
    id: string;
    status: string;
    opportunity_type: string;
    notes: string | null;
    qualification_json: Record<string, boolean> | null;
    created_at: string;
    updated_at: string;
    companies: {
      id: string;
      name: string;
      sector: string | null;
      zone: string | null;
      registration_no: string | null;
      estimated_md_kw: number | null;
      tenant_structure: string | null;
      operating_hours: string | null;
      estimated_roof_sqft: number | null;
      tnb_bill_band: string | null;
      ownership_status: string | null;
    } | null;
    contacts: {
      id: string;
      full_name: string | null;
      role: string | null;
      phone: string | null;
      email: string | null;
      source: string | null;
    } | null;
  };

  // Fetch lead with relations
  const { data: leadRaw, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, status, opportunity_type, notes, qualification_json, created_at, updated_at, companies(id, name, sector, zone, registration_no, estimated_md_kw, tenant_structure, operating_hours, estimated_roof_sqft, tnb_bill_band, ownership_status), contacts(id, full_name, role, phone, email, source)"
    )
    .eq("id", id)
    .single();

  const lead = leadRaw as LeadRow | null;

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch activities with actor attribution
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, lead_id, action, metadata, actor_id, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  if (activitiesError) {
    return NextResponse.json(
      { error: activitiesError.message },
      { status: 500 }
    );
  }

  // Compute score (API owns scoring)
  const company = lead.companies;

  let score: LeadScore | null = null;
  if (lead.opportunity_type === "solar" && company) {
    const baseScore = calculateSolarScore({
      sector: company.sector ?? null,
      zone: company.zone ?? null,
      estimated_md_kw: company.estimated_md_kw ?? null,
      tenant_structure: (company.tenant_structure as "single" | "multi" | "unknown") ?? null,
      operating_hours: (company.operating_hours as "day_dominant" | "shift" | "24hr" | "unknown") ?? null,
      estimated_roof_sqft: company.estimated_roof_sqft ?? null,
      tnb_bill_band: company.tnb_bill_band ?? null,
      ownership_status: (company.ownership_status as "owner" | "tenant" | "lease_long" | "unknown") ?? null,
    });
    score = {
      ...baseScore,
      conversion_score: 0,
      band: getScoreBand(baseScore.priority_score),
    };
  }

  // Build response
  const response: LeadDetailResponse = {
    id: lead.id,
    status: lead.status as LeadStatus,
    opportunity_type: lead.opportunity_type,
    notes: lead.notes,
    created_at: lead.created_at,
    updated_at: lead.updated_at,

    company: company
      ? {
          id: company.id,
          name: company.name,
          sector: company.sector,
          zone: company.zone,
          tnb_band: null,
          ownership_type: null,
          roof_type: null,
          bursa_listed: null,
          registration_no: company.registration_no,
        }
      : null,

    contact: lead.contacts
      ? {
          id: lead.contacts.id,
          full_name: lead.contacts.full_name,
          role: lead.contacts.role,
          phone: lead.contacts.phone,
          email: lead.contacts.email,
          source: lead.contacts.source,
        }
      : null,

    score,

    qualification: lead.qualification_json
      ? {
          owner_present: !!lead.qualification_json.owner_present,
          own_building: !!lead.qualification_json.own_building,
          roof_suitable: !!lead.qualification_json.roof_suitable,
          sufficient_tnb: !!lead.qualification_json.sufficient_tnb,
          budget_confirmed: !!lead.qualification_json.budget_confirmed,
          timeline_valid: !!lead.qualification_json.timeline_valid,
          decision_maker_identified: !!lead.qualification_json.decision_maker_identified,
          compliance_checked: !!lead.qualification_json.compliance_checked,
          complete:
            !!lead.qualification_json.owner_present &&
            !!lead.qualification_json.own_building &&
            !!lead.qualification_json.roof_suitable &&
            !!lead.qualification_json.sufficient_tnb &&
            !!lead.qualification_json.budget_confirmed &&
            !!lead.qualification_json.timeline_valid &&
            !!lead.qualification_json.decision_maker_identified &&
            !!lead.qualification_json.compliance_checked,
        }
      : null,

    activities: (activities || []).map(
      (a) =>
        ({
          id: a.id,
          lead_id: a.lead_id,
          action: a.action,
          metadata: a.metadata,
          created_at: a.created_at,
          actor_id: a.actor_id,
        }) as LeadActivity
    ),
  };

  return NextResponse.json(response);
}

// PATCH for notes only - status changes go through /execute
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "leads", "write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const body = await req.json();

  // Status changes must go through /execute for atomic audit trail
  if (body.status) {
    return NextResponse.json(
      {
        error:
          "Status changes must use POST /api/v1/leads/[id]/execute for atomic execution with audit trail.",
      },
      { status: 400 }
    );
  }

  // Only allow notes update via PATCH
  const allowedFields = ["notes"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update. Only 'notes' allowed via PATCH." },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

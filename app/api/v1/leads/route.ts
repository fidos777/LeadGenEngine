import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { getAuthContext } from "@/lib/auth/getAuthContext";
import { calculateSolarScore } from "@/lib/scoring/solar";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/status";

export async function GET(req: NextRequest) {
  const role = await getUserRoleUnsafe();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(role, "leads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  // Query params
  const clientId = req.nextUrl.searchParams.get("client_id");
  const status = req.nextUrl.searchParams.get("status");
  const countOnly = req.nextUrl.searchParams.get("count") === "true";

  // Type for full lead query with relations
  type LeadRow = {
    id: string;
    status: string;
    opportunity_type: string;
    companies: { sector: string | null; zone: string | null } | null;
    [key: string]: unknown;
  };

  // Type for count-only query
  type LeadCountRow = {
    id: string;
    status: string;
  };

  // Count mode: minimal query
  if (countOnly) {
    let countQuery = supabase.from("leads").select("id, status");
    if (clientId) {
      countQuery = countQuery.eq("client_id", clientId);
    }
    if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
      countQuery = countQuery.eq("status", status);
    }

    const { data, error } = await countQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const s of LEAD_STATUSES) {
      counts[s] = 0;
    }
    for (const lead of (data as LeadCountRow[]) || []) {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    }
    return NextResponse.json({
      counts,
      total: data?.length ?? 0,
    });
  }

  // Full mode: query with relations
  let fullQuery = supabase.from("leads").select("*");
  if (clientId) {
    fullQuery = fullQuery.eq("client_id", clientId);
  }
  if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
    fullQuery = fullQuery.eq("status", status);
  }
  fullQuery = fullQuery.order("created_at", { ascending: false });

  const { data, error } = await fullQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch companies and contacts separately for type safety
  const leadIds = (data || []).map((l) => l.id);
  const companyIds = [...new Set((data || []).map((l) => l.company_id).filter(Boolean))];

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, sector, zone")
    .in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);

  const companyMap = new Map((companies || []).map((c) => [c.id, c]));

  // After fetching companies, also fetch contacts
  const contactIds = [...new Set((data || []).map((l) => l.contact_id).filter(Boolean))];

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, phone")
    .in("id", contactIds.length > 0 ? contactIds : ["00000000-0000-0000-0000-000000000000"]);

  const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

  const scored = (data || []).map((lead) => {
    const company = companyMap.get(lead.company_id) || null;
    const contact = contactMap.get(lead.contact_id) || null;
    const score =
      lead.opportunity_type === "solar"
        ? calculateSolarScore({
            sector: company?.sector ?? null,
            zone: company?.zone ?? null,
          })
        : null;

    return {
      ...lead,
      companies: company,
      contacts: contact,
      score,
    };
  });

  return NextResponse.json(scored);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "leads", "write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const { company_id, contact_id, opportunity_type, notes, client_id } = body;

  if (!company_id || !opportunity_type) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Use RPC for atomic creation with activity logging
  const { data, error } = await supabase.rpc("create_lead_with_activity", {
    p_company_id: company_id,
    p_contact_id: contact_id ?? null,
    p_client_id: client_id ?? null,
    p_opportunity_type: opportunity_type,
    p_notes: notes ?? null,
    p_actor_id: auth.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

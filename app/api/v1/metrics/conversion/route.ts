import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";

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

  let query = supabase.from("leads").select("id, status, created_at");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count leads by status
  const identified = leads.filter((l) => l.status === "identified").length;
  const outreached = leads.filter((l) => l.status === "outreached").length;
  const responded = leads.filter((l) => l.status === "responded").length;
  const qualified = leads.filter((l) => l.status === "qualified").length;
  const appointment = leads.filter(
    (l) => l.status === "appointment_booked"
  ).length;
  const closedWon = leads.filter((l) => l.status === "closed_won").length;
  const closedLost = leads.filter((l) => l.status === "closed_lost").length;

  // Conversion rates (safe division)
  const safeRate = (from: number, to: number) =>
    from === 0 ? 0 : Math.round((to / from) * 100);

  return NextResponse.json({
    conversion_rates: {
      identified_to_outreached: safeRate(identified, outreached),
      outreached_to_responded: safeRate(outreached, responded),
      responded_to_qualified: safeRate(responded, qualified),
      qualified_to_appointment: safeRate(qualified, appointment),
      appointment_to_closed_won: safeRate(appointment, closedWon),
    },
    totals: {
      identified,
      outreached,
      responded,
      qualified,
      appointment_booked: appointment,
      closed_won: closedWon,
      closed_lost: closedLost,
      total: leads.length,
    },
  });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/auth/permissions";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { rankLeads } from "@/lib/leads/priority";

export async function GET() {
  const role = await getUserRoleUnsafe();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(role, "leads", "read")) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      companies (*)
    `);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Fetch failed" },
      { status: 500 }
    );
  }

  const ranked = rankLeads(data);

  return NextResponse.json(ranked);
}

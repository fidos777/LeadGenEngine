import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/services/discovery";
import { canAccess } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/getAuthContext";

export async function POST(req: Request) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "companies", "write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.zone || !body.opportunity_type) {
      return NextResponse.json(
        { error: "zone and opportunity_type required" },
        { status: 400 }
      );
    }

    const result = await runDiscovery({
      zone: body.zone,
      opportunity_type: body.opportunity_type,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

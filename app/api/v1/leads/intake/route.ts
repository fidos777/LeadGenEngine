import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/v1/leads/intake
 *
 * Public endpoint — no auth required.
 * Receives inbound lead submissions from the PowerRoof landing page contact form.
 *
 * Expected body:
 *   company_name: string (required)
 *   contact_name: string (required)
 *   phone: string
 *   email: string
 *   segments: string (e.g. "industrial", "commercial")
 *   target: string (e.g. "Selangor")
 *   notes: string
 *   source: string (e.g. "powerroof_landing")
 */

// Basic rate-limit: track submissions per IP in memory (resets on server restart)
const recentSubmissions = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // max 5 submissions per hour per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const submissions = recentSubmissions.get(ip) || [];
  const recent = submissions.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recentSubmissions.set(ip, recent);
  return recent.length >= RATE_LIMIT_MAX;
}

function recordSubmission(ip: string): void {
  const submissions = recentSubmissions.get(ip) || [];
  submissions.push(Date.now());
  recentSubmissions.set(ip, submissions);
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const companyName = String(body.company_name || "").trim();
  const contactName = String(body.contact_name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const segments = String(body.segments || "").trim();
  const target = String(body.target || "").trim();
  const notes = String(body.notes || "").trim();
  const source = String(body.source || "powerroof_landing").trim();

  // Validate required fields
  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
    );
  }
  if (!contactName) {
    return NextResponse.json(
      { error: "Contact name is required" },
      { status: 400 }
    );
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: "At least one contact method (phone or email) is required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // 1. Upsert company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .upsert(
      {
        name: companyName,
        sector: segments || null,
        zone: target || null,
        phone: phone || null,
      },
      { onConflict: "name" }
    )
    .select("id")
    .single();

  if (companyError || !company) {
    // Fallback: try insert without upsert (name may not have unique constraint)
    const { data: insertedCompany, error: insertError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        sector: segments || null,
        zone: target || null,
        phone: phone || null,
      })
      .select("id")
      .single();

    if (insertError || !insertedCompany) {
      return NextResponse.json(
        { error: "Failed to create company record" },
        { status: 500 }
      );
    }

    // Continue with the inserted company
    return await createLeadAndContact(
      supabase,
      insertedCompany.id,
      { contactName, phone, email, notes, source },
      ip
    );
  }

  return await createLeadAndContact(
    supabase,
    company.id,
    { contactName, phone, email, notes, source },
    ip
  );
}

async function createLeadAndContact(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  companyId: string,
  details: {
    contactName: string;
    phone: string;
    email: string;
    notes: string;
    source: string;
  },
  ip: string
) {
  // 2. Create contact
  const { data: contact } = await supabase
    .from("contacts")
    .insert({
      company_id: companyId,
      full_name: details.contactName,
      phone: details.phone || null,
      email: details.email || null,
      notes: `Inbound via ${details.source}`,
    })
    .select("id")
    .single();

  // 3. Create lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      contact_id: contact?.id ?? null,
      status: "identified",
      opportunity_type: "solar",
      notes: details.notes
        ? `[Inbound — ${details.source}] ${details.notes}`
        : `[Inbound — ${details.source}]`,
    })
    .select("id, status")
    .single();

  if (leadError || !lead) {
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }

  // 4. Log activity
  await supabase.from("activities").insert({
    lead_id: lead.id,
    activity_type: "system",
    performed_by: "system",
    notes: `Inbound lead from ${details.source}. Contact: ${details.contactName}. IP: ${ip}`,
    metadata: {
      source: details.source,
      contact_name: details.contactName,
      phone: details.phone,
      email: details.email,
    },
  });

  // Record rate-limit
  recordSubmission(ip);

  return NextResponse.json(
    {
      success: true,
      lead_id: lead.id,
      message: "Thank you. We will contact you within 24 hours.",
    },
    { status: 201 }
  );
}

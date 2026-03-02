import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/getAuthContext";
import { canAccess } from "@/lib/auth/permissions";

const POWROOF_ACTOR_ID = "vZLIIEKh7bybv6ZYr";

/**
 * POST /api/v1/sync/apify
 *
 * Pulls latest Apify actor run dataset, maps to companies schema,
 * upserts on google_maps_id, writes sync log entry.
 *
 * Body:
 *   actorId: string (e.g., "apify/google-maps-scraper")
 *   datasetId?: string (optional - uses latest run if not provided)
 */

type ApifyDatasetItem = {
  placeId?: string;
  title?: string;
  categoryName?: string;
  categories?: string[];
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  url?: string;
  totalScore?: number;
  reviewsCount?: number;
  location?: { lat: number; lng: number };
};

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

// Normalize sector from Google Maps categories
function normalizeSector(categories: string[], categoryName?: string): string {
  const combined = [...categories, categoryName || ""].join(" ").toLowerCase();

  if (combined.includes("food") || combined.includes("beverage")) return "food_processing";
  if (combined.includes("plastic") || combined.includes("rubber")) return "plastics";
  if (combined.includes("electronic") || combined.includes("semiconductor")) return "electronics";
  if (combined.includes("auto") || combined.includes("vehicle")) return "automotive";
  if (combined.includes("cold") || combined.includes("frozen") || combined.includes("refrigerat")) return "cold_chain";
  if (combined.includes("logistic") || combined.includes("warehouse") || combined.includes("storage")) return "logistics";
  if (combined.includes("engineering") || combined.includes("machining") || combined.includes("metal")) return "engineering";
  if (combined.includes("commercial") || combined.includes("office")) return "commercial";
  return "manufacturing";
}

// Extract zone from city/state
function extractZone(city?: string, state?: string): string | null {
  if (city) return city;
  if (state) return state;
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccess(auth.role, "leads", "write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    return NextResponse.json(
      { error: "APIFY_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  let body: { actorId?: string; datasetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const actorId = body.actorId || POWROOF_ACTOR_ID;
  const { datasetId } = body;

  const supabase = createSupabaseAdminClient();
  const syncStartedAt = new Date().toISOString();

  try {
    // Get dataset ID from latest run if not provided
    let targetDatasetId = datasetId;

    if (!targetDatasetId && actorId) {
      const runsRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?status=SUCCEEDED&limit=1`,
        { headers: { Authorization: `Bearer ${apifyToken}` } }
      );

      if (!runsRes.ok) {
        throw new Error(`Failed to fetch actor runs: ${runsRes.status}`);
      }

      const runsData = await runsRes.json();
      if (!runsData.data?.items?.[0]?.defaultDatasetId) {
        throw new Error("No successful runs found for actor");
      }

      targetDatasetId = runsData.data.items[0].defaultDatasetId;
    }

    // Fetch dataset items
    const datasetRes = await fetch(
      `https://api.apify.com/v2/datasets/${targetDatasetId}/items?format=json`,
      { headers: { Authorization: `Bearer ${apifyToken}` } }
    );

    if (!datasetRes.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetRes.status}`);
    }

    const items: ApifyDatasetItem[] = await datasetRes.json();

    const result: SyncResult = {
      total: items.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Process each item
    for (const item of items) {
      if (!item.placeId || !item.title) {
        result.skipped++;
        continue;
      }

      const companyData = {
        name: item.title,
        google_maps_id: item.placeId,
        google_maps_url: item.url || null,
        sector: normalizeSector(item.categories || [], item.categoryName),
        zone: extractZone(item.city, item.state),
        address: item.address || null,
        phone: item.phone || null,
        review_count: item.reviewsCount || null,
        // Preserve defaults for ATAP fields
        tenant_structure: "unknown",
        operating_hours: "unknown",
        ownership_status: "unknown",
      };

      // Check if company exists by google_maps_id
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("google_maps_id", item.placeId)
        .limit(1)
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            name: companyData.name,
            google_maps_url: companyData.google_maps_url,
            sector: companyData.sector,
            zone: companyData.zone,
            address: companyData.address,
            phone: companyData.phone,
            review_count: companyData.review_count,
          })
          .eq("google_maps_id", item.placeId);

        if (updateError) {
          console.error(`Update error for ${item.title}:`, updateError.message);
          result.errors++;
        } else {
          result.updated++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from("companies")
          .insert(companyData);

        if (insertError) {
          console.error(`Insert error for ${item.title}:`, insertError.message);
          result.errors++;
        } else {
          result.inserted++;
        }
      }
    }

    // Write sync log
    await supabase.from("sync_logs").insert({
      source: "apify",
      dataset_id: targetDatasetId,
      actor_id: actorId || null,
      started_at: syncStartedAt,
      completed_at: new Date().toISOString(),
      total_items: result.total,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      triggered_by: auth.userId,
    });

    return NextResponse.json({
      success: true,
      datasetId: targetDatasetId,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log failed sync attempt
    await supabase.from("sync_logs").insert({
      source: "apify",
      dataset_id: datasetId || null,
      actor_id: actorId || null,
      started_at: syncStartedAt,
      completed_at: new Date().toISOString(),
      total_items: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      error_message: message,
      triggered_by: auth.userId,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

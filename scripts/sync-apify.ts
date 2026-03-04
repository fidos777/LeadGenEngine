#!/usr/bin/env npx tsx
/**
 * sync-apify.ts
 *
 * Pulls latest Apify actor run dataset, maps to companies schema,
 * upserts on google_maps_id.
 *
 * Usage:
 *   npx tsx scripts/sync-apify.ts
 *   npx tsx scripts/sync-apify.ts --dataset=<datasetId>
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   APIFY_API_TOKEN
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(__dirname, "../.env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && !process.env[key]) {
      process.env[key] = valueParts.join("=");
    }
  }
} catch {
  // .env.local might not exist, rely on shell env
}

const POWROOF_ACTOR_ID = "vZLIIEKh7bybv6ZYr";

// PowerRoof enriched dataset structure
type ApifyDatasetItem = {
  company_name: string;
  website?: string;
  phone?: string;
  address?: string;
  state?: string;
  sector?: string;
  rating?: number;
  review_count?: number;
  lat?: number;
  lng?: number;
  google_maps_id?: string | null;
  source?: string;
  scraped_at?: string;
  // Enrichment fields
  esg_mentioned?: boolean;
  sustainability_page?: boolean;
  iso_mentioned?: boolean;
  energy_keywords_found?: string[];
  expansion_signal?: boolean;
  serp_hits?: Array<{ title: string; url: string; snippet: string }>;
  confidence_score?: number;
  band?: string;
  atap_signal?: string;
};

// Map raw sector names to DB enum values
function normalizeSector(sectorRaw?: string): string {
  if (!sectorRaw) return "manufacturing";
  const sector = sectorRaw.toLowerCase();

  if (sector.includes("food") || sector.includes("beverage")) return "food_processing";
  if (sector.includes("plastic") || sector.includes("rubber") || sector.includes("glove")) return "plastics";
  if (sector.includes("electronic") || sector.includes("semiconductor")) return "electronics";
  if (sector.includes("auto") || sector.includes("vehicle")) return "automotive";
  if (sector.includes("cold") || sector.includes("frozen") || sector.includes("refrigerat")) return "cold_chain";
  if (sector.includes("logistic") || sector.includes("warehouse") || sector.includes("storage")) return "logistics";
  if (sector.includes("engineering") || sector.includes("machining") || sector.includes("metal")) return "engineering";
  if (sector.includes("commercial") || sector.includes("office")) return "commercial";
  return "manufacturing";
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (!apifyToken) {
    console.error("Missing APIFY_API_TOKEN");
    process.exit(1);
  }

  // Parse args for optional dataset ID
  const datasetArg = process.argv.find((a) => a.startsWith("--dataset="));
  let datasetId = datasetArg ? datasetArg.split("=")[1] : null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Apify Sync Starting...\n");

  // Get dataset ID from latest run if not provided
  if (!datasetId) {
    console.log(`Fetching latest run for actor ${POWROOF_ACTOR_ID}...`);

    const runsRes = await fetch(
      `https://api.apify.com/v2/acts/${POWROOF_ACTOR_ID}/runs?status=SUCCEEDED&limit=1`,
      { headers: { Authorization: `Bearer ${apifyToken}` } }
    );

    if (!runsRes.ok) {
      console.error(`Failed to fetch actor runs: ${runsRes.status}`);
      const text = await runsRes.text();
      console.error(text);
      process.exit(1);
    }

    const runsData = await runsRes.json();
    if (!runsData.data?.items?.[0]?.defaultDatasetId) {
      console.error("No successful runs found for actor");
      process.exit(1);
    }

    datasetId = runsData.data.items[0].defaultDatasetId;
    console.log(`  Found dataset: ${datasetId}`);
  }

  // Fetch dataset items
  console.log(`\nFetching dataset items...`);
  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
    { headers: { Authorization: `Bearer ${apifyToken}` } }
  );

  if (!datasetRes.ok) {
    console.error(`Failed to fetch dataset: ${datasetRes.status}`);
    const text = await datasetRes.text();
    console.error(text);
    process.exit(1);
  }

  const items: ApifyDatasetItem[] = await datasetRes.json();
  console.log(`  Loaded ${items.length} items\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    if (!item.company_name) {
      skipped++;
      continue;
    }

    const companyData = {
      name: item.company_name,
      google_maps_id: item.google_maps_id || null,
      sector: normalizeSector(item.sector),
      zone: item.state || null,
      address: item.address || null,
      phone: item.phone || null,
      review_count: item.review_count ?? null,
    };

    // Check if company exists (by google_maps_id if available, else by name)
    let existing: { id: string } | null = null;

    if (item.google_maps_id) {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("google_maps_id", item.google_maps_id)
        .limit(1)
        .single();
      existing = data;
    }

    if (!existing) {
      // Fallback to name match
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("name", item.company_name)
        .limit(1)
        .single();
      existing = data;
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          name: companyData.name,
          google_maps_id: companyData.google_maps_id,
          sector: companyData.sector,
          zone: companyData.zone,
          address: companyData.address,
          phone: companyData.phone,
          review_count: companyData.review_count,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error(`  UPDATE ERROR for ${item.company_name}:`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from("companies")
        .insert(companyData);

      if (insertError) {
        console.error(`  INSERT ERROR for ${item.company_name}:`, insertError.message);
        errors++;
      } else {
        inserted++;
      }
    }

    // Progress
    const total = inserted + updated + skipped + errors;
    if (total % 10 === 0) {
      console.log(`  Progress: ${total}/${items.length}...`);
    }
  }

  console.log("\n--- Sync Summary ---");
  console.log(`Dataset: ${datasetId}`);
  console.log(`Total items: ${items.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no placeId/title): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

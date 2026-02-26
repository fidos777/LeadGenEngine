#!/usr/bin/env npx tsx
/**
 * import-apify-csv.ts
 *
 * Imports Apify-scraped companies and enriched contacts into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-apify-csv.ts
 *
 * Expects:
 *   - all_companies_raw.csv       (company_name, website, phone, city, address, categories, category_name, zone, state)
 *   - company_contacts_enriched.csv (company_name, website, director_name, director_role, direct_phone, email, confidence, contact_type, group_level, notes)
 *
 * Both files are joined on company_name.
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ----------------------------------------------------------------
// CSV parser (minimal, handles quoted fields with commas)
// ----------------------------------------------------------------
function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || "").trim();
    });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ----------------------------------------------------------------
// Sector normalization
// ----------------------------------------------------------------
function normalizeSector(categories: string, categoryName: string): string {
  const combined = `${categories} ${categoryName}`.toLowerCase();
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

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Load CSVs
  const companiesRaw = readFileSync(
    resolve(__dirname, "../all_companies_raw.csv"),
    "utf-8"
  );
  const contactsRaw = readFileSync(
    resolve(__dirname, "../company_contacts_enriched.csv"),
    "utf-8"
  );

  const companies = parseCSV(companiesRaw);
  const contacts = parseCSV(contactsRaw);

  // Index contacts by company_name
  const contactMap = new Map<string, Record<string, string>>();
  for (const c of contacts) {
    const name = c.company_name;
    // Keep higher-confidence contact or first one found
    const existing = contactMap.get(name);
    if (
      !existing ||
      (c.confidence === "high" && existing.confidence !== "high") ||
      (c.director_name && !existing.director_name)
    ) {
      contactMap.set(name, c);
    }
  }

  console.log(`Loaded ${companies.length} companies, ${contacts.length} contacts`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of companies) {
    const companyName = row.company_name;
    if (!companyName) {
      skipped++;
      continue;
    }

    // Check for existing company (dedup by name)
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("name", companyName)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  SKIP (exists): ${companyName}`);
      skipped++;
      continue;
    }

    // Build company record
    const companyData = {
      name: companyName,
      sector: normalizeSector(row.categories || "", row.category_name || ""),
      zone: row.zone || null,
      address: row.address || null,
      phone: row.phone || null,
      google_maps_url: null as string | null,
      // ATAP fields default to unknown/null — populated during caller enrichment
      tenant_structure: "unknown",
      operating_hours: "unknown",
      ownership_status: "unknown",
      estimated_md_kw: null,
      estimated_roof_sqft: null,
      tnb_bill_band: null,
    };

    // Insert company
    const { data: companyResult, error: companyError } = await supabase
      .from("companies")
      .insert(companyData)
      .select("id")
      .single();

    if (companyError || !companyResult) {
      console.error(`  ERROR inserting company "${companyName}":`, companyError?.message);
      errors++;
      continue;
    }

    const companyId = companyResult.id;

    // Insert contact if enriched data exists
    const contactRow = contactMap.get(companyName);
    let contactId: string | null = null;

    if (contactRow && (contactRow.director_name || contactRow.email || contactRow.direct_phone)) {
      const contactData = {
        company_id: companyId,
        full_name: contactRow.director_name || "Unknown",
        role: contactRow.director_role || null,
        phone: contactRow.direct_phone || row.phone || null,
        email: contactRow.email || null,
        source: "apify_enrichment",
      };

      const { data: contactResult, error: contactError } = await supabase
        .from("contacts")
        .insert(contactData)
        .select("id")
        .single();

      if (contactError) {
        console.warn(`  WARN: contact insert failed for "${companyName}":`, contactError.message);
      } else if (contactResult) {
        contactId = contactResult.id;
      }
    }

    // Create lead (status: identified, opportunity_type: solar)
    const leadData = {
      company_id: companyId,
      contact_id: contactId,
      opportunity_type: "solar",
      status: "identified",
    };

    const { error: leadError } = await supabase.from("leads").insert(leadData);

    if (leadError) {
      console.error(`  ERROR inserting lead for "${companyName}":`, leadError.message);
      errors++;
      continue;
    }

    inserted++;
    if (inserted % 20 === 0) {
      console.log(`  Inserted ${inserted}/${companies.length}...`);
    }
  }

  console.log("\n--- Import Summary ---");
  console.log(`Total companies in CSV: ${companies.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicate/empty): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

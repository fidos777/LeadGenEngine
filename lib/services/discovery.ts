import { createSupabaseServerClient } from "@/lib/supabase/server";

type DiscoveryInput = {
  zone: string;
  opportunity_type: "solar" | "fire";
};

type DiscoveryResult = {
  companiesCreated: number;
  leadsCreated: number;
};

export async function runDiscovery(
  input: DiscoveryInput
): Promise<DiscoveryResult> {
  const supabase = await createSupabaseServerClient();

  // Temporary mock dataset (replace with Apify/SSM later)
  const mockCompanies = [
    {
      name: "ABC Manufacturing Sdn Bhd",
      sector: "manufacturing",
      zone: input.zone,
    },
    {
      name: "XYZ Engineering Works",
      sector: "engineering",
      zone: input.zone,
    },
  ];

  let companiesCreated = 0;
  let leadsCreated = 0;

  for (const company of mockCompanies) {
    // Insert company
    const { data: insertedCompany, error: companyError } = await supabase
      .from("companies")
      .insert(company)
      .select()
      .single();

    if (companyError || !insertedCompany) {
      throw new Error(
        `Company insert failed: ${companyError?.message ?? "Unknown error"}`
      );
    }

    companiesCreated++;

    // Create lead for that company
    const { data: insertedLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        company_id: insertedCompany.id,
        opportunity_type: input.opportunity_type,
      })
      .select()
      .single();

    if (leadError || !insertedLead) {
      throw new Error(`Lead insert failed: ${leadError?.message ?? "Unknown error"}`);
    }

    leadsCreated++;

    // Log discovery activity
    await supabase.from("activities").insert({
      lead_id: insertedLead.id,
      action: "discovery_created",
      metadata: {
        zone: input.zone,
        opportunity_type: input.opportunity_type,
        company_name: insertedCompany.name,
      },
    });
  }

  return { companiesCreated, leadsCreated };
}

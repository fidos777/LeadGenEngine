import type { Company, Director } from "@/types";

export interface EnrichmentResult {
  company: Company;
  directors: Director[];
  enrichedAt: Date;
}

export async function enrichFromSSM(
  _ssmNumber: string
): Promise<EnrichmentResult> {
  // TODO: Implement SSM registry lookup
  throw new Error("Not implemented");
}

export async function batchEnrich(
  _ssmNumbers: string[]
): Promise<EnrichmentResult[]> {
  // TODO: Implement batch SSM enrichment
  throw new Error("Not implemented");
}

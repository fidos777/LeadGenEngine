// types/caller.ts
import type { ObjectionCategory } from "@/lib/leads/status";

export interface CallerLead {
  id: string;
  status: string;
  opportunity_type?: string;
  company: {
    id: string;
    name: string;
    zone: string | null;
    sector: string | null;
    estimated_md_kw?: number | null;
    tenant_structure?: string | null;
    operating_hours?: string | null;
    tnb_bill_band?: string | null;
    ownership_status?: string | null;
    estimated_roof_sqft?: number | null;
  } | null;
  contact: {
    phone: string | null;
    full_name?: string | null;
    role?: string | null;
  } | null;
  company_phone?: string;
  // ATAP scoring result (computed client-side from company fields)
  atap_eligible?: boolean | null;
  atap_warnings?: string[];
  priority_score?: number;
}

export type CallerAction =
  | "call_attempted"
  | "contact_identified"
  | "not_interested"
  | "callback_scheduled"
  | "wrong_number";

export interface ContactFormData {
  name: string;
  role: string;
}

export interface ObjectionFormData {
  category: ObjectionCategory;
  notes?: string;
}

export const ZONE_PRIORITY: Record<string, number> = {
  "Klang": 1,
  "Shah Alam": 2,
  "Rawang": 3,
  "Semenyih": 4,
};

export const ZONE_OPTIONS = ["All", "Klang", "Shah Alam", "Rawang", "Semenyih", "Other"] as const;

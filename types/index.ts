// Database types matching Supabase schema v0.1

import { type LeadStatus, LEAD_STATUSES } from "@/lib/leads/status";

// Re-export from single source of truth
export { type LeadStatus, LEAD_STATUSES };

export type TenantStructure = "single" | "multi" | "unknown";
export type OperatingHours = "day_dominant" | "shift" | "24hr" | "unknown";
export type OwnershipStatus = "owner" | "tenant" | "lease_long" | "unknown";

export interface Company {
  id: string;
  name: string;
  registration_no?: string;
  sector?: string;
  zone?: string;
  // ATAP-relevant fields (migration 008)
  estimated_md_kw?: number | null;
  tenant_structure?: TenantStructure;
  operating_hours?: OperatingHours;
  estimated_roof_sqft?: number | null;
  tnb_bill_band?: string | null;
  ownership_status?: OwnershipStatus;
  google_maps_url?: string | null;
  address?: string | null;
  phone?: string | null;
  review_count?: number | null;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  full_name: string;
  role?: string;
  phone?: string;
  email?: string;
  source: string;
  created_at: string;
}

// Director from SSM registry enrichment
export interface Director {
  name: string;
  ic_no?: string;
  nationality?: string;
  appointment_date?: string;
}

export type OpportunityType = "solar" | "fire";

export interface Lead {
  id: string;
  company_id: string;
  contact_id?: string;
  client_id?: string;
  opportunity_type: string;
  status: LeadStatus;
  notes?: string;
  qualification_json?: Record<string, unknown>;
  atap_eligible?: boolean | null;
  atap_disqualify_reason?: string | null;
  objection_category?: string | null;
  created_at: string;
  updated_at: string;
}

// Activity log
export interface Activity {
  id: string;
  lead_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Extended types with relations
export interface LeadWithCompany extends Lead {
  company: Company;
}

export interface LeadWithContact extends Lead {
  contact?: Contact;
}

export interface LeadFull extends Lead {
  company: Company;
  contact?: Contact;
}

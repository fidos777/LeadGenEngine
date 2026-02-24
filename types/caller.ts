// types/caller.ts
export interface CallerLead {
  id: string;
  status: string;
  company: {
    id: string;
    name: string;
    zone: string | null;
    sector: string | null;
  } | null;
  contact: {
    phone: string | null;
  } | null;
  company_phone?: string;
}

export type CallerAction = "call_attempted" | "contact_identified" | "not_interested";

export interface ContactFormData {
  name: string;
  role: string;
}

export const ZONE_PRIORITY: Record<string, number> = {
  "Klang": 1,
  "Shah Alam": 2,
  "Rawang": 3,
  "Semenyih": 4,
};

export const ZONE_OPTIONS = ["All", "Klang", "Shah Alam", "Rawang", "Semenyih", "Other"] as const;

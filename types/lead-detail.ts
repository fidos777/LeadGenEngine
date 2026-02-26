// types/lead-detail.ts
// Single source of truth for Lead Detail UI contract
// UI never recomputes — all values arrive pre-computed from API

import type { LeadStatus } from "@/lib/leads/status";

/**
 * Scoring model returned by Layer 1 API.
 * UI never recomputes these.
 */
export interface LeadScore {
  fit_score: number;
  urgency_score: number;
  conversion_score: number;
  priority_score: number;
  band: "A" | "B" | "Warm" | "Park";
}

/**
 * Company intelligence block.
 * Read-only in Lead Detail.
 */
export interface LeadCompanyProfile {
  id: string;
  name: string;
  sector: string | null;
  zone: string | null;

  // Energy & suitability
  tnb_band: "LOW" | "MID" | "HIGH" | null;
  ownership_type: "own_building" | "rent" | null;
  roof_type: "metal" | "rc_flat" | "tile" | "unknown" | null;

  // Corporate signals
  bursa_listed: boolean | null;
  registration_no: string | null;
}

/**
 * Contact / decision maker block.
 */
export interface LeadContactProfile {
  id: string | null;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
}

/**
 * Qualification checklist state (for UI enforcement).
 * This is not stored raw in DB — it may be derived
 * from activities or stored in JSONB in future.
 */
export interface QualificationChecklist {
  owner_present: boolean;
  own_building: boolean;
  roof_suitable: boolean;
  sufficient_tnb: boolean;
  budget_confirmed: boolean;
  timeline_valid: boolean;
  decision_maker_identified: boolean;
  compliance_checked: boolean;

  /**
   * Convenience derived value (API may return this).
   */
  complete: boolean;
}

/**
 * Immutable activity log item.
 */
export interface LeadActivity {
  id: string;
  lead_id: string;
  action:
    | "lead_created"
    | "discovery_created"
    | "status_changed"
    | "activity_logged"
    | "qualification_updated";
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
}

/**
 * Full Lead Detail API Response
 * Single source of truth for UI rendering.
 */
export interface LeadDetailResponse {
  id: string;
  status: LeadStatus;
  opportunity_type: string;
  notes: string | null;

  created_at: string;
  updated_at: string;

  // Intelligence
  company: LeadCompanyProfile | null;
  contact: LeadContactProfile | null;

  // Scoring
  score: LeadScore | null;

  // Qualification
  qualification: QualificationChecklist | null;

  // Timeline
  activities: LeadActivity[];
}

/**
 * Activity form submission payload
 */
export type ActivityOutcome =
  | "spoke"
  | "voicemail"
  | "gatekeeper"
  | "no_answer"
  | "whatsapp_sent";

export type GatekeeperOutcome =
  | "bypassed"
  | "blocked"
  | "name_obtained"
  | "not_applicable";

export interface ActivityLogPayload {
  lead_id: string;
  outcome: ActivityOutcome;
  gatekeeper_outcome: GatekeeperOutcome | null;
  intel_gathered: string | null;
  interest_level: 1 | 2 | 3 | 4 | 5 | null;
  follow_up_needed: boolean;
  follow_up_date: string | null;
  new_status: LeadStatus | null;
}

/**
 * Status transition payload
 */
export interface StatusTransitionPayload {
  status: LeadStatus;
  qualification?: Partial<QualificationChecklist>;
}

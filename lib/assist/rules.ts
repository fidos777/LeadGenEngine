// lib/assist/rules.ts
// Static system constants for deterministic advisory layer
// No DB access. No side effects. Pure configuration.

import type { LeadStatus } from "@/lib/leads/status";

/**
 * Maximum days a lead should remain in each stage before flagging.
 * 0 = terminal stage, no threshold applies.
 */
export const STAGE_THRESHOLDS: Record<LeadStatus, number> = {
  identified: 2,
  outreached: 5,
  responded: 3,
  qualified: 5,
  atap_screened: 3,
  appointment_booked: 7,
  survey_complete: 5,
  closed_won: 0,
  closed_lost: 0,
};

/**
 * Qualification fields required before advancing to 'qualified' status.
 * Matches DB-level enforcement in execute_lead_action RPC.
 */
export const REQUIRED_QUALIFICATION_FIELDS = [
  "owner_present",
  "own_building",
  "roof_suitable",
  "sufficient_tnb",
  "budget_confirmed",
  "timeline_valid",
  "decision_maker_identified",
  "compliance_checked",
] as const;

/**
 * Stage progression order for regression detection.
 * Lower index = earlier stage.
 * Terminal states share highest index.
 */
export const STAGE_ORDER: LeadStatus[] = [
  "identified",
  "outreached",
  "responded",
  "qualified",
  "atap_screened",
  "appointment_booked",
  "survey_complete",
  "closed_won",
  "closed_lost",
];

/**
 * Days without activity before flagging as stalled.
 */
export const NO_ACTIVITY_THRESHOLD_DAYS = 3;

/**
 * Multiplier for historical average comparison.
 * If days_in_stage > avg * this multiplier, flag as at_risk.
 */
export const AVERAGE_DURATION_MULTIPLIER = 1.5;

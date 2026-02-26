// Single source of truth for lead statuses
// All other files import from here
// Matches DB enum: lead_status

export const LEAD_STATUSES = [
  "identified",
  "outreached",
  "responded",
  "qualified",
  "atap_screened",
  "appointment_booked",
  "survey_complete",
  "closed_won",
  "closed_lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Terminal statuses (no further transitions allowed)
export const TERMINAL_STATUSES: LeadStatus[] = ["closed_won", "closed_lost"];

// Actionable statuses (eligible for priority ranking)
export const ACTIONABLE_STATUSES: LeadStatus[] = [
  "identified",
  "outreached",
  "responded",
  "qualified",
  "atap_screened",
];

// Valid transitions map (mirrors DB RPC)
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  identified: ["outreached", "closed_lost"],
  outreached: ["responded", "closed_lost"],
  responded: ["qualified", "closed_lost"],
  qualified: ["atap_screened", "closed_lost"],
  atap_screened: ["appointment_booked", "closed_lost"],
  appointment_booked: ["survey_complete", "closed_won", "closed_lost"],
  survey_complete: ["closed_won", "closed_lost"],
  closed_won: [],
  closed_lost: [],
};

// Status display labels
export const STATUS_LABELS: Record<LeadStatus, string> = {
  identified: "Identified",
  outreached: "Outreached",
  responded: "Responded",
  qualified: "Qualified",
  atap_screened: "ATAP Screened",
  appointment_booked: "Appointment Booked",
  survey_complete: "Survey Complete",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// Objection categories for caller rejection tracking
export const OBJECTION_CATEGORIES = [
  "not_interested_general",
  "already_evaluated_solar",
  "moving_relocating",
  "board_approval_pending",
  "budget_frozen",
  "wrong_contact",
  "multi_tenant_structure",
  "not_building_owner",
  "tariff_renegotiation",
  "recent_installation",
  "other",
] as const;

export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export const OBJECTION_LABELS: Record<ObjectionCategory, string> = {
  not_interested_general: "Not interested (general)",
  already_evaluated_solar: "Already evaluated solar",
  moving_relocating: "Moving / relocating factory",
  board_approval_pending: "Board approval pending",
  budget_frozen: "Budget frozen this cycle",
  wrong_contact: "Wrong contact / gatekeeper",
  multi_tenant_structure: "Multi-tenant structure",
  not_building_owner: "Not building owner",
  tariff_renegotiation: "Renegotiating TNB tariff",
  recent_installation: "Recent solar installation",
  other: "Other",
};

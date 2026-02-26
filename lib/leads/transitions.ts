import { type LeadStatus, VALID_TRANSITIONS as STATUS_TRANSITIONS } from "./status";

// Use the canonical transitions from status.ts
const VALID_TRANSITIONS = STATUS_TRANSITIONS;

export function canTransition(
  from: LeadStatus,
  to: LeadStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Re-export for convenience
export type { LeadStatus } from "./status";

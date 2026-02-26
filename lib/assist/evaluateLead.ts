// lib/assist/evaluateLead.ts
// Deterministic lead health evaluation engine
// No DB access. No side effects. Pure computation.

import {
  STAGE_THRESHOLDS,
  REQUIRED_QUALIFICATION_FIELDS,
  STAGE_ORDER,
  NO_ACTIVITY_THRESHOLD_DAYS,
  AVERAGE_DURATION_MULTIPLIER,
} from "./rules";
import type { LeadStatus } from "@/lib/leads/status";

interface Activity {
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface EvaluateLeadInput {
  lead_id: string;
  status: LeadStatus;
  updated_at: string;
  qualification: Record<string, boolean> | null;
  activities: Activity[];
  avg_stage_duration: number | null;
}

export type RiskLevel = "healthy" | "stalled" | "at_risk";
export type PriorityLevel = "low" | "medium" | "high";

export interface LeadAssistResponse {
  lead_id: string;
  status: LeadStatus;
  days_in_stage: number;
  avg_stage_duration: number | null;
  risk: RiskLevel;
  priority: PriorityLevel;
  missing_qualification: string[];
  suggestions: string[];
  diagnostics: {
    last_activity_at: string | null;
    last_status_change_at: string | null;
    recent_regression: boolean;
  };
}

function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function escalatePriority(
  current: PriorityLevel,
  candidate: PriorityLevel
): PriorityLevel {
  const order: PriorityLevel[] = ["low", "medium", "high"];
  const currentIdx = order.indexOf(current);
  const candidateIdx = order.indexOf(candidate);
  return candidateIdx > currentIdx ? candidate : current;
}

export function evaluateLead(input: EvaluateLeadInput): LeadAssistResponse {
  const now = new Date();
  const updatedAt = new Date(input.updated_at);
  const daysInStage = daysBetween(updatedAt, now);

  let risk: RiskLevel = "healthy";
  let priority: PriorityLevel = "low";
  const suggestions: string[] = [];

  // ----------------------------
  // 1. Stage Threshold Rule
  // ----------------------------
  const threshold = STAGE_THRESHOLDS[input.status];

  if (threshold > 0 && daysInStage > threshold) {
    risk = "stalled";
    priority = escalatePriority(priority, "high");
    suggestions.push(
      `Lead has been in ${input.status.replace(/_/g, " ")} for ${daysInStage} days (threshold: ${threshold})`
    );
  }

  // ----------------------------
  // 2. Qualification Gap Rule
  // ----------------------------
  const qualificationApplicable =
    input.status === "responded" || input.status === "qualified";

  const missingQualification = qualificationApplicable
    ? REQUIRED_QUALIFICATION_FIELDS.filter(
        (field) => !input.qualification?.[field]
      )
    : [];

  if (qualificationApplicable && missingQualification.length > 0) {
    priority = escalatePriority(priority, "medium");
    suggestions.push(
      `Complete qualification checklist (${missingQualification.length} items missing)`
    );
  }

  // ----------------------------
  // 3. No Activity Rule
  // ----------------------------
  const lastActivity = input.activities[0];
  let lastActivityAt: string | null = null;

  if (lastActivity) {
    lastActivityAt = lastActivity.created_at;
    const daysSinceActivity = daysBetween(
      new Date(lastActivity.created_at),
      now
    );

    if (daysSinceActivity > NO_ACTIVITY_THRESHOLD_DAYS) {
      if (risk === "healthy") risk = "stalled";
      priority = escalatePriority(priority, "medium");
      suggestions.push(
        `No activity in ${daysSinceActivity} days - follow up recommended`
      );
    }
  } else {
    // No activities at all (shouldn't happen with proper audit)
    priority = escalatePriority(priority, "medium");
    suggestions.push("No activities recorded for this lead");
  }

  // ----------------------------
  // 4. Regression Detection Rule
  // ----------------------------
  const statusChanges = input.activities.filter(
    (a) => a.action === "status_changed"
  );

  const regressionDetected = statusChanges.some((a) => {
    const fromStatus = a.metadata?.from as LeadStatus | undefined;
    const toStatus = a.metadata?.to as LeadStatus | undefined;

    if (!fromStatus || !toStatus) return false;

    const fromIndex = STAGE_ORDER.indexOf(fromStatus);
    const toIndex = STAGE_ORDER.indexOf(toStatus);

    // Regression = moved backward (excluding closed_lost which is terminal)
    return toIndex < fromIndex && toStatus !== "closed_lost";
  });

  if (regressionDetected) {
    risk = "at_risk";
    priority = escalatePriority(priority, "high");
    suggestions.push("Stage regression detected - investigate cause");
  }

  // ----------------------------
  // 5. Historical Average Rule
  // ----------------------------
  if (
    input.avg_stage_duration !== null &&
    daysInStage > input.avg_stage_duration * AVERAGE_DURATION_MULTIPLIER
  ) {
    risk = "at_risk";
    priority = escalatePriority(priority, "high");
    suggestions.push(
      `Duration exceeds historical average (${input.avg_stage_duration.toFixed(1)} days)`
    );
  }

  // ----------------------------
  // 6. Terminal State Check
  // ----------------------------
  if (input.status === "closed_won" || input.status === "closed_lost") {
    risk = "healthy";
    priority = "low";
    suggestions.length = 0; // Clear suggestions for terminal states
  }

  // Find last status change
  const lastStatusChange = statusChanges[0];

  return {
    lead_id: input.lead_id,
    status: input.status,
    days_in_stage: daysInStage,
    avg_stage_duration: input.avg_stage_duration,
    risk,
    priority,
    missing_qualification: missingQualification,
    suggestions,
    diagnostics: {
      last_activity_at: lastActivityAt,
      last_status_change_at: lastStatusChange?.created_at ?? null,
      recent_regression: regressionDetected,
    },
  };
}

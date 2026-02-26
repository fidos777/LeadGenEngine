"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@/lib/leads/status";
import { canTransition } from "@/lib/leads/transitions";

interface ExecutionControllerProps {
  leadId: string;
  currentStatus: LeadStatus;
  qualificationComplete: boolean;
}

const TRANSITION_LABELS: Partial<Record<LeadStatus, string>> = {
  outreached: "Mark Outreached",
  responded: "Mark Responded",
  qualified: "Mark Qualified",
  appointment_booked: "Book Appointment",
  closed_won: "Close Won",
  closed_lost: "Close Lost",
};

const FORWARD_STATUSES: LeadStatus[] = [
  "outreached",
  "responded",
  "qualified",
  "appointment_booked",
  "closed_won",
];

export function ExecutionController({
  leadId,
  currentStatus,
  qualificationComplete,
}: ExecutionControllerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Get valid forward transitions
  const validTransitions = FORWARD_STATUSES.filter((status) =>
    canTransition(currentStatus, status)
  );

  // Check if closed_lost is valid (always available except for terminal states)
  const canCloseLost = canTransition(currentStatus, "closed_lost");

  const isTerminal =
    currentStatus === "closed_won" || currentStatus === "closed_lost";

  async function executeTransition(newStatus: LeadStatus) {
    setError(null);

    // Qualification gate check (UI-level, DB also enforces)
    if (newStatus === "qualified" && !qualificationComplete) {
      setError("Cannot qualify: Qualification checklist incomplete");
      return;
    }

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: {
            type: "status_transition",
            initiated_by: "ui",
          },
          new_status: newStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Execution failed");
        return;
      }

      // Re-fetch page data
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  if (isTerminal) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Actions</h3>
        <p className="text-neutral-500 text-sm">
          This lead is closed. No further actions available.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h3 className="text-sm font-medium text-neutral-400 mb-3">Actions</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {/* Forward transitions */}
        {validTransitions.map((status) => {
          const disabled =
            isPending || (status === "qualified" && !qualificationComplete);

          return (
            <button
              key={status}
              onClick={() => executeTransition(status)}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
                disabled
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {isPending ? "Processing..." : TRANSITION_LABELS[status]}
            </button>
          );
        })}

        {/* Qualification gate warning */}
        {validTransitions.includes("qualified") && !qualificationComplete && (
          <p className="text-xs text-amber-400 mt-1">
            Complete qualification checklist to enable
          </p>
        )}

        {/* Close Lost - always visible if valid */}
        {canCloseLost && (
          <button
            onClick={() => executeTransition("closed_lost")}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm font-medium rounded transition-colors bg-neutral-800 hover:bg-red-900 text-neutral-300 hover:text-red-400 border border-neutral-700 hover:border-red-700"
          >
            {isPending ? "Processing..." : "Close Lost"}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-800">
        <p className="text-xs text-neutral-500">
          Current:{" "}
          <span className="text-white capitalize">
            {currentStatus.replace(/_/g, " ")}
          </span>
        </p>
      </div>
    </div>
  );
}

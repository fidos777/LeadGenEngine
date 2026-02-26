"use client";

import type { LeadStatus } from "@/lib/leads/status";
import type { LeadScore } from "@/types/lead-detail";

interface LeadHeaderProps {
  companyName: string | null;
  status: LeadStatus;
  score: LeadScore | null;
  opportunityType: string;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  identified: "bg-slate-500",
  outreached: "bg-blue-500",
  responded: "bg-cyan-500",
  qualified: "bg-emerald-500",
  atap_screened: "bg-teal-500",
  appointment_booked: "bg-amber-500",
  survey_complete: "bg-orange-500",
  closed_won: "bg-green-600",
  closed_lost: "bg-red-500",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
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

const BAND_COLORS: Record<LeadScore["band"], string> = {
  A: "text-emerald-400 border-emerald-400",
  B: "text-blue-400 border-blue-400",
  Warm: "text-amber-400 border-amber-400",
  Park: "text-neutral-400 border-neutral-400",
};

export function LeadHeader({
  companyName,
  status,
  score,
  opportunityType,
}: LeadHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-800">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">
          {companyName ?? "Unknown Company"}
        </h1>
        <span
          className={`px-2 py-1 text-xs font-medium text-white rounded ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="px-2 py-1 text-xs text-neutral-400 bg-neutral-800 rounded">
          {opportunityType.toUpperCase()}
        </span>
      </div>

      {score && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-neutral-500">Priority Score</div>
            <div className="text-lg font-semibold text-white">
              {score.priority_score}
            </div>
          </div>
          <div
            className={`px-3 py-1 text-sm font-medium border rounded ${BAND_COLORS[score.band]}`}
          >
            {score.band}
          </div>
        </div>
      )}
    </div>
  );
}

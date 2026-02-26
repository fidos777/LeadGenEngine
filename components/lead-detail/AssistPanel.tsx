"use client";

import type { LeadAssistResponse } from "@/lib/assist";

interface AssistPanelProps {
  assist: LeadAssistResponse | null;
  loading?: boolean;
}

const RISK_COLORS: Record<LeadAssistResponse["risk"], string> = {
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  stalled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
};

const RISK_LABELS: Record<LeadAssistResponse["risk"], string> = {
  healthy: "Healthy",
  stalled: "Stalled",
  at_risk: "At Risk",
};

const PRIORITY_COLORS: Record<LeadAssistResponse["priority"], string> = {
  low: "text-neutral-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

export function AssistPanel({ assist, loading }: AssistPanelProps) {
  if (loading) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">
          Lead Health
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-neutral-800 rounded w-24" />
          <div className="h-4 bg-neutral-800 rounded w-full" />
          <div className="h-4 bg-neutral-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!assist) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">
          Lead Health
        </h3>
        <p className="text-neutral-500 text-sm">Unable to load health data</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-400">Lead Health</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[assist.risk]}`}
        >
          {RISK_LABELS[assist.risk]}
        </span>
      </div>

      {/* Stage Duration */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-neutral-500">Days in Stage</span>
          <span className={`text-lg font-semibold ${PRIORITY_COLORS[assist.priority]}`}>
            {assist.days_in_stage}
          </span>
        </div>
        {assist.avg_stage_duration !== null && (
          <div className="text-xs text-neutral-500">
            Average: {assist.avg_stage_duration.toFixed(1)} days
          </div>
        )}
      </div>

      {/* Suggestions */}
      {assist.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {assist.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-neutral-300"
              >
                <span className="text-amber-400 mt-0.5">!</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Qualification */}
      {assist.missing_qualification.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">
            Missing Qualification
          </h4>
          <ul className="space-y-1">
            {assist.missing_qualification.map((field) => (
              <li
                key={field}
                className="text-xs text-amber-400 flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {field.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnostics */}
      <div className="pt-3 border-t border-neutral-800">
        <h4 className="text-xs font-medium text-neutral-500 mb-2">
          Diagnostics
        </h4>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Last Activity</dt>
            <dd className="text-neutral-300">
              {assist.diagnostics.last_activity_at
                ? new Date(assist.diagnostics.last_activity_at).toLocaleDateString(
                    "en-MY",
                    { month: "short", day: "numeric" }
                  )
                : "None"}
            </dd>
          </div>
          {assist.diagnostics.recent_regression && (
            <div className="flex justify-between">
              <dt className="text-red-400">Regression</dt>
              <dd className="text-red-400">Detected</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

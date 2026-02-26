// components/caller/AtapBadge.tsx
"use client";

import type { CallerLead } from "@/types/caller";

interface AtapBadgeProps {
  lead: CallerLead;
}

/**
 * Compact ATAP intelligence display for caller cards.
 * Shows eligibility status, key data points, and priority score.
 */
export function AtapBadge({ lead }: AtapBadgeProps) {
  const company = lead.company;
  if (!company) return null;

  const md = company.estimated_md_kw;
  const bill = company.tnb_bill_band;
  const tenant = company.tenant_structure;
  const hours = company.operating_hours;
  const eligible = lead.atap_eligible;

  // Don't render if no ATAP data at all
  const hasData = md || bill || (tenant && tenant !== "unknown") || (hours && hours !== "unknown");
  if (!hasData && eligible === undefined && eligible === null) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* ATAP eligibility pill */}
      {eligible !== null && eligible !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              eligible
                ? "bg-green-900/40 text-green-400 border border-green-800/50"
                : "bg-red-900/30 text-red-400 border border-red-800/50"
            }`}
          >
            {eligible ? "ATAP Eligible" : "ATAP Ineligible"}
          </span>
          {lead.priority_score !== undefined && lead.priority_score > 0 && (
            <span className="text-[10px] text-gray-500 font-mono">
              P{lead.priority_score}
            </span>
          )}
        </div>
      )}

      {/* Data chips */}
      <div className="flex flex-wrap gap-1">
        {md && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800/80 rounded text-gray-400 border border-gray-700/50">
            {md}kW MD
          </span>
        )}
        {bill && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800/80 rounded text-gray-400 border border-gray-700/50">
            {bill}
          </span>
        )}
        {hours && hours !== "unknown" && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800/80 rounded text-gray-400 border border-gray-700/50">
            {hours === "day_dominant" ? "Day ops" : hours === "24hr" ? "24hr" : "Shift"}
          </span>
        )}
        {tenant && tenant !== "unknown" && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${
              tenant === "multi"
                ? "bg-red-900/20 text-red-400 border-red-800/50"
                : "bg-gray-800/80 text-gray-400 border-gray-700/50"
            }`}
          >
            {tenant === "single" ? "Single tenant" : "Multi-tenant"}
          </span>
        )}
      </div>

      {/* Warnings */}
      {lead.atap_warnings && lead.atap_warnings.length > 0 && (
        <div className="space-y-0.5">
          {lead.atap_warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-[10px] text-amber-500/80 leading-tight">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

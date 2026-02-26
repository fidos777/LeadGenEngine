"use client";

import type { QualificationChecklist as QualificationData } from "@/types/lead-detail";

interface QualificationChecklistProps {
  qualification: QualificationData | null;
}

const CHECKLIST_ITEMS: {
  key: keyof Omit<QualificationData, "complete">;
  label: string;
}[] = [
  { key: "owner_present", label: "Owner Present" },
  { key: "own_building", label: "Owns Building" },
  { key: "roof_suitable", label: "Roof Suitable" },
  { key: "sufficient_tnb", label: "Sufficient TNB" },
  { key: "budget_confirmed", label: "Budget Confirmed" },
  { key: "timeline_valid", label: "Timeline Valid" },
  { key: "decision_maker_identified", label: "Decision Maker Identified" },
  { key: "compliance_checked", label: "Compliance Checked" },
];

export function QualificationChecklist({
  qualification,
}: QualificationChecklistProps) {
  const completedCount = qualification
    ? CHECKLIST_ITEMS.filter((item) => qualification[item.key]).length
    : 0;

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-400">Qualification</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            qualification?.complete
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {qualification?.complete ? "Complete" : `${completedCount}/8`}
        </span>
      </div>

      {!qualification ? (
        <p className="text-neutral-500 text-sm">
          No qualification data available
        </p>
      ) : (
        <ul className="space-y-1.5">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span
                className={`w-4 h-4 flex items-center justify-center rounded-sm text-xs ${
                  qualification[item.key]
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-neutral-800 text-neutral-600"
                }`}
              >
                {qualification[item.key] ? "✓" : ""}
              </span>
              <span
                className={`text-sm ${
                  qualification[item.key] ? "text-white" : "text-neutral-500"
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

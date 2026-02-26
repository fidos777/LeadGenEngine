"use client";

import Link from "next/link";

type RevenueAtRiskProps = {
  qualifiedOverdueCount: number;
  outreachedStaleCount: number;
  revertedCount: number;
};

export function RevenueAtRisk({
  qualifiedOverdueCount,
  outreachedStaleCount,
  revertedCount,
}: RevenueAtRiskProps) {
  const risks = [
    {
      label: "Qualified >3d",
      count: qualifiedOverdueCount,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      filter: "qualified_overdue",
    },
    {
      label: "Outreached stale",
      count: outreachedStaleCount,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      filter: "outreached_stale",
    },
    {
      label: "Reverted",
      count: revertedCount,
      color: "text-red-400",
      bg: "bg-red-400/10",
      filter: "reverted",
    },
  ];

  const totalAtRisk =
    qualifiedOverdueCount + outreachedStaleCount + revertedCount;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-neutral-400">
          Revenue At Risk
        </h2>
        {totalAtRisk > 0 && (
          <span className="text-xs font-medium text-red-400">
            {totalAtRisk} total
          </span>
        )}
      </div>
      <div className="space-y-2">
        {risks.map((risk) => (
          <Link
            key={risk.filter}
            href={`/pipeline?risk=${risk.filter}`}
            className={`flex items-center justify-between ${risk.bg} hover:opacity-80 rounded-md px-3 py-2 transition-opacity`}
          >
            <span className="text-sm text-neutral-300">{risk.label}</span>
            <span className={`text-lg font-bold ${risk.color}`}>
              {risk.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

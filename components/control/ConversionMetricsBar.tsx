"use client";

import Link from "next/link";

type ConversionMetricsBarProps = {
  identifiedToOutreached: number;
  outreachedToQualified: number;
  qualifiedToBooked: number;
  avgDaysToQualified: number;
  dropoffsLast7d: number;
};

export function ConversionMetricsBar({
  identifiedToOutreached,
  outreachedToQualified,
  qualifiedToBooked,
  avgDaysToQualified,
  dropoffsLast7d,
}: ConversionMetricsBarProps) {
  const metrics = [
    { label: "I→O", value: `${identifiedToOutreached}%` },
    { label: "O→Q", value: `${outreachedToQualified}%` },
    { label: "Q→B", value: `${qualifiedToBooked}%` },
    { label: "Avg I→Q", value: `${avgDaysToQualified}d` },
    {
      label: "Dropoffs (7d)",
      value: dropoffsLast7d.toString(),
      highlight: dropoffsLast7d > 0,
    },
  ];

  return (
    <Link
      href="/metrics"
      className="block bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:bg-neutral-800/50 transition-colors"
    >
      <h2 className="text-sm font-medium text-neutral-400 mb-3">
        Conversion Metrics
      </h2>
      <div className="flex items-center justify-between">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div
              className={`text-xl font-bold ${
                metric.highlight ? "text-red-400" : "text-white"
              }`}
            >
              {metric.value}
            </div>
            <div className="text-xs text-neutral-500 mt-1">{metric.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}

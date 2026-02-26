"use client";

import Link from "next/link";

type PipelineSnapshotProps = {
  identified: number;
  outreached: number;
  qualified: number;
  booked: number;
};

export function PipelineSnapshot({
  identified,
  outreached,
  qualified,
  booked,
}: PipelineSnapshotProps) {
  const stages = [
    { label: "Identified", count: identified, status: "identified" },
    { label: "Outreached", count: outreached, status: "outreached" },
    { label: "Qualified", count: qualified, status: "qualified" },
    { label: "Booked", count: booked, status: "appointment_booked" },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-sm font-medium text-neutral-400 mb-3">
        Pipeline Snapshot
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage) => (
          <Link
            key={stage.status}
            href={`/pipeline?status=${stage.status}`}
            className="bg-neutral-800 hover:bg-neutral-700 rounded-md p-3 text-center transition-colors"
          >
            <div className="text-2xl font-bold text-white">{stage.count}</div>
            <div className="text-xs text-neutral-400 mt-1">{stage.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

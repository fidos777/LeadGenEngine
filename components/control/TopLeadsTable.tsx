"use client";

import Link from "next/link";
import { type LeadStatus } from "@/lib/leads/status";

type RankedLead = {
  id: string;
  status: LeadStatus;
  opportunity_type: string;
  companies: {
    name: string;
    sector: string | null;
    zone: string | null;
  } | null;
  score: {
    priority_score: number;
    fit_score: number;
    urgency_score: number;
  } | null;
  updated_at: string;
};

type TopLeadsTableProps = {
  leads: RankedLead[];
};

function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-green-500/20 text-green-400";
  if (score >= 60) return "bg-blue-500/20 text-blue-400";
  if (score >= 40) return "bg-amber-500/20 text-amber-400";
  return "bg-neutral-500/20 text-neutral-400";
}

function getDaysInStage(updatedAt: string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDaysBadgeColor(days: number): string {
  if (days >= 5) return "text-red-400";
  if (days >= 3) return "text-amber-400";
  return "text-neutral-400";
}

function getRecommendedAction(status: LeadStatus): string {
  switch (status) {
    case "identified":
      return "Initiate outreach";
    case "outreached":
      return "Follow up";
    case "responded":
      return "Qualify lead";
    case "qualified":
      return "Book appointment";
    default:
      return "-";
  }
}

export function TopLeadsTable({ leads }: TopLeadsTableProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-400">
          Top 10 Priority Leads
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-neutral-500 border-b border-neutral-800">
              <th className="text-left px-4 py-2 font-medium">Company</th>
              <th className="text-left px-4 py-2 font-medium">Sector</th>
              <th className="text-center px-4 py-2 font-medium">Score</th>
              <th className="text-center px-4 py-2 font-medium">Status</th>
              <th className="text-center px-4 py-2 font-medium">Days</th>
              <th className="text-left px-4 py-2 font-medium">
                Recommended Action
              </th>
              <th className="text-center px-4 py-2 font-medium">View</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No leads to display
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const days = getDaysInStage(lead.updated_at);
                const score = lead.score?.priority_score ?? 0;

                return (
                  <tr
                    key={lead.id}
                    className="border-b border-neutral-800 hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {lead.companies?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {lead.companies?.sector ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getScoreBadgeColor(
                          score
                        )}`}
                      >
                        {score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-neutral-300 capitalize">
                        {lead.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-medium ${getDaysBadgeColor(
                          days
                        )}`}
                      >
                        {days}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {getRecommendedAction(lead.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

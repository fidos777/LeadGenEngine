"use client";

import type { LeadActivity } from "@/types/lead-detail";

interface ActivityTimelineProps {
  activities: LeadActivity[];
}

const ACTION_LABELS: Record<LeadActivity["action"], string> = {
  lead_created: "Lead Created",
  discovery_created: "Discovery Created",
  status_changed: "Status Changed",
  activity_logged: "Activity Logged",
  qualification_updated: "Qualification Updated",
};

const ACTION_COLORS: Record<LeadActivity["action"], string> = {
  lead_created: "bg-blue-500",
  discovery_created: "bg-purple-500",
  status_changed: "bg-amber-500",
  activity_logged: "bg-cyan-500",
  qualification_updated: "bg-emerald-500",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetadata(
  action: LeadActivity["action"],
  metadata: Record<string, unknown> | null
): string | null {
  if (!metadata) return null;

  switch (action) {
    case "status_changed":
      return `${metadata.from} → ${metadata.to}`;
    case "activity_logged":
      if (metadata.outcome) {
        return `Outcome: ${String(metadata.outcome).replace(/_/g, " ")}`;
      }
      return null;
    case "qualification_updated":
      const updates = Object.entries(metadata)
        .filter(([_, v]) => v === true)
        .map(([k]) => k.replace(/_/g, " "));
      return updates.length > 0 ? `Checked: ${updates.join(", ")}` : null;
    default:
      return null;
  }
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Timeline</h3>
        <p className="text-neutral-500 text-sm">No activities recorded</p>
      </div>
    );
  }

  // Display in reverse chronological order (newest first)
  const sortedActivities = [...activities].reverse();

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h3 className="text-sm font-medium text-neutral-400 mb-4">Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-neutral-700" />

        <ul className="space-y-4">
          {sortedActivities.map((activity) => {
            const metadataText = formatMetadata(
              activity.action,
              activity.metadata
            );

            return (
              <li key={activity.id} className="relative pl-6">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${ACTION_COLORS[activity.action]}`}
                />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {ACTION_LABELS[activity.action]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>

                  {metadataText && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {metadataText}
                    </p>
                  )}

                  {activity.actor_id && (
                    <p className="text-xs text-neutral-600 mt-0.5 font-mono">
                      by {activity.actor_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { Icon, type IconName } from "../lib/iconRegistry";

interface ActivityFeedProps {
  activities: any[];
}

type Tone = "muted" | "info" | "success" | "error" | "accent" | "warning";

const activityConfig: Record<string, { iconName: IconName; tone: Tone }> = {
  task_created:              { iconName: "activity.task_created",       tone: "accent" },
  task_updated:              { iconName: "activity.task_updated",       tone: "info" },
  task_completed:            { iconName: "activity.idea_approved",      tone: "success" },
  message_sent:              { iconName: "activity.comment_added",      tone: "muted" },
  document_created:          { iconName: "activity.task_created",       tone: "warning" },
  agent_heartbeat:           { iconName: "activity.agent_heartbeat",    tone: "error" },
  project_created:           { iconName: "activity.idea_created",       tone: "accent" },
  status_change:             { iconName: "activity.status_change",      tone: "info" },
  idea_submitted:            { iconName: "activity.idea_scouted",       tone: "warning" },
  idea_scouted:              { iconName: "activity.idea_scouted",       tone: "warning" },
  idea_created:              { iconName: "activity.idea_created",       tone: "accent" },
  idea_approved:             { iconName: "activity.idea_approved",      tone: "success" },
  idea_rejected:             { iconName: "activity.idea_rejected",      tone: "error" },
  idea_archived:             { iconName: "activity.idea_archived",      tone: "muted" },
  build_started:             { iconName: "activity.build_started",      tone: "info" },
  build_completed:           { iconName: "activity.build_completed",    tone: "success" },
  build_failed:              { iconName: "activity.build_failed",       tone: "error" },
  build_triggered_manually:  { iconName: "activity.build_triggered_manually", tone: "accent" },
  comment_added:             { iconName: "activity.comment_added",      tone: "muted" },
  vote:                      { iconName: "activity.vote",               tone: "success" },
};

const DEFAULT_CONFIG = { iconName: "activity.default" as IconName, tone: "muted" as Tone };

function stripLeadingEmoji(message: string): string {
  // Defensive — historical activity rows still carry a leading emoji+space.
  // Strip the first run of pictographic chars + whitespace.
  return message.replace(/^[\p{Extended_Pictographic}‍️]+\s*/u, "");
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="card card-pad-sm">
      <div className="space-y-0 max-h-[600px] overflow-y-auto scrollbar-thin">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <span className="timeline-dot mx-auto mb-3" aria-hidden>
              <Icon name="activity.default" size={14} />
            </span>
            <p className="text-body mb-1">No recent activity</p>
            <p className="text-small">Activity will appear here as the team works</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const cfg = activityConfig[activity.type] ?? DEFAULT_CONFIG;
            const isRecent = Date.now() - activity._creationTime < 60000;
            const cleanMessage = stripLeadingEmoji(activity.message ?? "");

            return (
              <div
                key={activity._id}
                className={`py-3 -mx-2 px-2 rounded-lg transition-colors duration-200 hover:bg-[var(--bg-secondary)] animate-fade-in-up ${
                  index !== activities.length - 1 ? "border-b border-[var(--border-light)]" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-3">
                  <span
                    className={`timeline-dot timeline-dot--${cfg.tone}`}
                    aria-hidden
                  >
                    <Icon name={cfg.iconName} size={14} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                      {cleanMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-caption"
                        style={{ color: isRecent ? "var(--success-600)" : "var(--text-muted)" }}
                      >
                        {formatTime(activity._creationTime)}
                      </span>
                      {activity.task && (
                        <span className="text-caption truncate max-w-[160px]">· {activity.task.title}</span>
                      )}
                      {activity.agent && (
                        <span className="text-caption">· {activity.agent.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid var(--border-light)" }}>
          <button
            type="button"
            className="text-caption"
            style={{ color: "var(--accent-700)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            View all activity
            <Icon name="entity.next" size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

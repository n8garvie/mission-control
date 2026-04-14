interface ActivityFeedProps {
  activities: any[];
}

const activityConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  task_created: { 
    icon: "✨", 
    color: "var(--accent-500)",
    bgColor: "var(--accent-50)",
  },
  task_updated: { 
    icon: "📝", 
    color: "var(--info-500)",
    bgColor: "var(--info-50)",
  },
  task_completed: { 
    icon: "✅", 
    color: "var(--success-500)",
    bgColor: "var(--success-50)",
  },
  message_sent: { 
    icon: "💬", 
    color: "var(--text-secondary)",
    bgColor: "var(--bg-tertiary)",
  },
  document_created: { 
    icon: "📄", 
    color: "var(--warning-500)",
    bgColor: "var(--warning-50)",
  },
  agent_heartbeat: { 
    icon: "💓", 
    color: "var(--error-500)",
    bgColor: "var(--error-50)",
  },
  project_created: { 
    icon: "🚀", 
    color: "var(--accent-500)",
    bgColor: "var(--accent-50)",
  },
  status_change: { 
    icon: "🔄", 
    color: "var(--info-500)",
    bgColor: "var(--info-50)",
  },
  idea_submitted: {
    icon: "💡",
    color: "var(--warning-500)",
    bgColor: "var(--warning-50)",
  },
  idea_approved: {
    icon: "👍",
    color: "var(--success-500)",
    bgColor: "var(--success-50)",
  },
};

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
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getActivityStyle = (type: string) => {
    return activityConfig[type] || { 
      icon: "📌", 
      color: "var(--text-muted)",
      bgColor: "var(--bg-tertiary)",
    };
  };

  return (
    <div className="card p-4">
      <div className="space-y-0 max-h-[600px] overflow-y-auto scrollbar-thin">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl">
              📭
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">No recent activity</p>
            <p className="text-xs text-[var(--text-muted)]">Activity will appear here as the team works</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const style = getActivityStyle(activity.type);
            const isRecent = Date.now() - activity._creationTime < 60000; // Less than 1 minute
            
            return (
              <div
                key={activity._id}
                className={`group py-3 ${index !== activities.length - 1 ? 'border-b border-[var(--border-light)]' : ''} animate-fade-in-up hover:bg-[var(--bg-secondary)] -mx-2 px-2 rounded-lg transition-colors duration-200`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ 
                      backgroundColor: style.bgColor,
                      color: style.color,
                    }}
                  >
                    {style.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium ${isRecent ? 'text-[var(--success-500)]' : 'text-[var(--text-muted)]'}`}>
                        {formatTime(activity._creationTime)}
                      </span>
                      {activity.task && (
                        <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[120px]">
                          · {activity.task.title}
                        </span>
                      )}
                      {activity.agent && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          · {activity.agent.emoji} {activity.agent.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer */}
      {activities.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--border-light)] text-center">
          <button className="text-xs font-medium text-[var(--accent-600)] hover:text-[var(--accent-700)] transition-colors">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
}

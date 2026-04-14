import { Doc } from "../../convex/_generated/dataModel";

interface TaskCardProps {
  task: any;
  agents: Doc<"agents">[];
  onClick: () => void;
}

const priorityColors: Record<string, { bg: string; border: string }> = {
  critical: { bg: "var(--error-50)", border: "var(--error-500)" },
  high: { bg: "var(--warning-50)", border: "var(--warning-500)" },
  medium: { bg: "var(--info-50)", border: "var(--info-500)" },
  low: { bg: "var(--bg-tertiary)", border: "var(--text-muted)" },
};

export default function TaskCard({ task, agents, onClick }: TaskCardProps) {
  const priority = priorityColors[task.priority] || priorityColors.medium;
  
  // Find assignee details
  const assigneeDetails = task.assigneeIds?.map((id: string) => 
    agents.find(a => a._id === id)
  ).filter(Boolean);

  // Format relative time
  const getRelativeTime = (date: number) => {
    const now = Date.now();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className="card card-interactive p-4 cursor-pointer group"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: priority.border,
      }}
    >
      {/* Header with tags */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-600)] transition-colors">
          {task.title}
        </h4>
      </div>
      
      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--text-tertiary)] mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag: string) => (
            <span 
              key={tag}
              className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-[10px] rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-1.5 py-0.5 text-[var(--text-muted)] text-[10px]">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignees + Meta */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
        <div className="flex items-center gap-2">
          {assigneeDetails && assigneeDetails.length > 0 ? (
            <div className="flex -space-x-1.5">
              {assigneeDetails.slice(0, 3).map((assignee: any) => (
                <div 
                  key={assignee._id} 
                  className="w-6 h-6 rounded-md flex items-center justify-center text-sm border-2 border-white shadow-sm"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                  title={assignee.name}
                >
                  {assignee.emoji}
                </div>
              ))}
              {assigneeDetails.length > 3 && (
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium border-2 border-white bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  +{assigneeDetails.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)] italic">Unassigned</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {/* Comments indicator */}
          {task.commentCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{task.commentCount}</span>
            </div>
          )}
          
          {/* Time */}
          <span className="text-[10px]">
            {task.updatedAt ? getRelativeTime(task.updatedAt) : getRelativeTime(task._creationTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

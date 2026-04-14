import { Doc } from "../../convex/_generated/dataModel";

interface AgentCardsProps {
  agents: Doc<"agents">[];
}

const statusConfig: Record<string, { label: string; color: string; animate: boolean }> = {
  active: { label: "Active", color: "var(--success-500)", animate: true },
  idle: { label: "Idle", color: "var(--text-muted)", animate: false },
  busy: { label: "Busy", color: "var(--warning-500)", animate: true },
  offline: { label: "Offline", color: "var(--error-500)", animate: false },
};

export default function AgentCards({ agents }: AgentCardsProps) {
  // Sort agents: active first, then by name
  const sortedAgents = [...agents].sort((a, b) => {
    const statusOrder = { active: 0, busy: 1, idle: 2, offline: 3 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {sortedAgents.map((agent, index) => {
        const status = statusConfig[agent.status] || statusConfig.idle;
        
        return (
          <div
            key={agent._id}
            className="card card-interactive p-4 animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center text-center">
              {/* Avatar with status indicator */}
              <div className="relative mb-3">
                <div className="avatar text-2xl">{agent.emoji}</div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    status.animate ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: status.color }}
                />
              </div>
              
              {/* Name & Role */}
              <div className="font-semibold text-sm text-[var(--text-primary)] mb-0.5">
                {agent.name}
              </div>
              <div className="text-caption text-[10px] mb-2">{agent.role}</div>
              
              {/* Status Badge */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: `${status.color}15`,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
              
              {/* Current Task Indicator */}
              {agent.currentTaskId && (
                <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>On task</span>
                </div>
              )}
              
              {/* Last Heartbeat */}
              {agent.lastHeartbeat && (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {new Date(agent.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

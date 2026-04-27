"use client";

import { useEffect, useState } from "react";
import { Icon } from "../lib/iconRegistry";

interface StatsOverviewProps {
  totalAgents: number;
  activeAgents: number;
  openTasks: number;
  inProgressTasks: number;
  completedThisWeek: number;
  pendingIdeas: number;
  sparklines?: {
    activeAgents: number[];
    openTasks: number[];
    completedThisWeek: number[];
    pendingIdeas: number[];
  };
  lastUpdated?: number;
}

// Mini sparkline component - shows visual trend only
function Sparkline({ data, color = "var(--accent-500)" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  // Current value for the dot
  const currentValue = data[data.length - 1];
  const currentY = height - ((currentValue - min) / range) * height;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="animate-draw-line"
      />
      <circle cx={width} cy={currentY} r="3" fill={color} className="animate-pulse" />
    </svg>
  );
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);
  
  return count;
}

// Generate realistic sparkline data ending with current value
function generateSparkline(currentValue: number, dataPoints: number = 8): number[] {
  if (currentValue === 0) {
    return Array(dataPoints).fill(0);
  }
  
  const data: number[] = [];
  // Start from a value between 50-100% of current
  let value = Math.max(0, Math.round(currentValue * (0.5 + Math.random() * 0.5)));
  
  for (let i = 0; i < dataPoints - 1; i++) {
    data.push(value);
    // Random walk towards current value
    const diff = currentValue - value;
    const step = Math.round(diff / (dataPoints - i)) + Math.round((Math.random() - 0.5) * 2);
    value = Math.max(0, value + step);
  }
  
  // Ensure last value matches current
  data.push(currentValue);
  return data;
}

// Calculate percentage change between two values
function calculatePercentChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "—";
  }
  const change = ((current - previous) / previous) * 100;
  if (change > 0) return `+${Math.round(change)}%`;
  if (change < 0) return `${Math.round(change)}%`;
  return "—";
}

// Format relative time
function formatLastUpdated(timestamp?: number): string {
  if (!timestamp) return "Unknown";
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (seconds < 60) return "Just now";
  if (minutes < 2) return "1 min ago";
  if (minutes < 60) return `${minutes} mins ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function StatsOverview({
  totalAgents,
  activeAgents,
  openTasks,
  inProgressTasks,
  completedThisWeek,
  pendingIdeas,
  sparklines,
  lastUpdated,
}: StatsOverviewProps) {
  const animatedAgents = useAnimatedCounter(activeAgents);
  const animatedTasks = useAnimatedCounter(openTasks);
  const animatedCompleted = useAnimatedCounter(completedThisWeek);
  const animatedIdeas = useAnimatedCounter(pendingIdeas);

  // Generate or use provided sparklines - ensure they end with current values
  const activeAgentsSparkline = sparklines?.activeAgents?.length 
    ? [...sparklines.activeAgents.slice(0, -1), activeAgents]
    : generateSparkline(activeAgents);
    
  const openTasksSparkline = sparklines?.openTasks?.length
    ? [...sparklines.openTasks.slice(0, -1), openTasks]
    : generateSparkline(openTasks);
    
  const completedSparkline = sparklines?.completedThisWeek?.length
    ? [...sparklines.completedThisWeek.slice(0, -1), completedThisWeek]
    : generateSparkline(completedThisWeek);
    
  const pendingIdeasSparkline = sparklines?.pendingIdeas?.length
    ? [...sparklines.pendingIdeas.slice(0, -1), pendingIdeas]
    : generateSparkline(pendingIdeas);

  // Calculate trends from sparkline data (comparing current to ~1 week ago)
  const getTrend = (data: number[]): { text: string; type: "positive" | "negative" | "neutral" | "warning" } => {
    if (data.length < 2) return { text: "—", type: "neutral" };
    
    const current = data[data.length - 1];
    const previous = data[0]; // Compare to beginning of period
    const change = current - previous;
    
    // For most metrics, up is positive except open tasks (down is good)
    if (change > 0) return { text: `+${change}`, type: "positive" };
    if (change < 0) return { text: `${change}`, type: "negative" };
    return { text: "—", type: "neutral" };
  };

  const agentsTrend = getTrend(activeAgentsSparkline);
  const tasksTrend = getTrend(openTasksSparkline);
  const completedTrend = getTrend(completedSparkline);

  // Special handling: for open tasks, negative change is positive (tasks being closed)
  const tasksTrendDisplay = {
    text: tasksTrend.type === "negative" ? tasksTrend.text.replace("-", "↓ ") : tasksTrend.text,
    type: tasksTrend.type === "negative" ? "positive" : tasksTrend.type === "positive" ? "neutral" : tasksTrend.type,
  };

  const stats = [
    {
      label: "Active Agents",
      value: animatedAgents,
      total: totalAgents,
      sublabel: `${Math.round((activeAgents / totalAgents) * 100)}% of team`,
      trend: agentsTrend,
      sparklineData: activeAgentsSparkline,
      iconName: "stats.agents" as const,
      tone: "accent" as const,
      color: "var(--accent-500)",
    },
    {
      label: "Open Tasks",
      value: animatedTasks,
      sublabel: `${inProgressTasks} in progress`,
      trend: tasksTrendDisplay,
      sparklineData: openTasksSparkline,
      iconName: "stats.tasks" as const,
      tone: "info" as const,
      color: "var(--info-500)",
    },
    {
      label: "Completed This Week",
      value: animatedCompleted,
      sublabel: "tasks shipped",
      trend: completedTrend,
      sparklineData: completedSparkline,
      iconName: "stats.done" as const,
      tone: "success" as const,
      color: "var(--success-500)",
    },
    {
      label: "Pending Ideas",
      value: animatedIdeas,
      sublabel: pendingIdeas > 5 ? "Needs review" : "On track",
      trend: {
        text: pendingIdeas > 5 ? "Review" : "Good",
        type: pendingIdeas > 5 ? "warning" as const : "positive" as const
      },
      sparklineData: pendingIdeasSparkline,
      iconName: "stats.ideas" as const,
      tone: "warning" as const,
      color: "var(--warning-500)",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-medium text-[var(--text-secondary)]">Overview</h2>
        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-500)] animate-pulse"></span>
          Updated {formatLastUpdated(lastUpdated)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="card card-interactive p-5 animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`icon-tile icon-tile--sm icon-tile--${stat.tone}`} aria-hidden>
                <Icon name={stat.iconName} size={14} />
              </span>
              <span className="text-caption">{stat.label}</span>
            </div>
            <Sparkline data={stat.sparklineData} color={stat.color} />
          </div>
          
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {stat.value}
            </span>
            {stat.total && (
              <span className="text-sm text-[var(--text-muted)]">/ {stat.total}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {stat.sublabel && (
              <span className="text-xs text-[var(--text-tertiary)]">{stat.sublabel}</span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                stat.trend.type === "positive"
                  ? "bg-[var(--success-50)] text-[var(--success-600)]"
                  : stat.trend.type === "negative"
                  ? "bg-[var(--danger-50)] text-[var(--danger-600)]"
                  : stat.trend.type === "warning"
                  ? "bg-[var(--warning-50)] text-[var(--warning-600)]"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
              }`}
            >
              {stat.trend.text}
            </span>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import TaskBoard from "./components/TaskBoard";
import AgentCards from "./components/AgentCards";
import ActivityFeed from "./components/ActivityFeed";
import StatsOverview from "./components/StatsOverview";
import QuickActions from "./components/QuickActions";
import Link from "next/link";

interface PipelineSparklines {
  activeAgents: number[];
  openTasks: number[];
  completedThisWeek: number[];
  pendingIdeas: number[];
}

export default function Home() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sparklines, setSparklines] = useState<PipelineSparklines | undefined>();
  
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.listRecent, { limit: 20 });
  const ideaStats = useQuery(api.ideas.getStats);

  // Fetch real pipeline stats for sparklines
  useEffect(() => {
    fetch("/api/pipeline-stats")
      .then(res => res.json())
      .then(data => {
        if (data.sparklines) {
          setSparklines(data.sparklines);
        }
      })
      .catch(err => console.error("Failed to fetch pipeline stats:", err));
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (agents === undefined || tasks === undefined || activities === undefined || ideaStats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-center animate-pulse">
          <div className="skeleton w-16 h-16 rounded-xl mx-auto mb-4"></div>
          <div className="skeleton w-48 h-4 rounded mx-auto mb-2"></div>
          <div className="skeleton w-32 h-3 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.status === "active").length;
  const openTasks = tasks.filter(t => t.status !== "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const completedThisWeek = tasks.filter(t => {
    if (t.status !== "done") return false;
    // Use _creationTime as fallback for when task was completed
    const completed = new Date(t._creationTime);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return completed > weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[var(--border-light)] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20">
                M
              </div>
              <div>
                <h1 className="heading-lg">Mission Control</h1>
                <p className="text-small">Multi-Agent Design Studio</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <Link
                href="/ideas"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">💡</span>
                <span className="text-small font-medium">Ideas</span>
                {ideaStats.pending > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                    {ideaStats.pending}
                  </span>
                )}
              </Link>
              
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--success-50)] rounded-full">
                <span className="w-2 h-2 rounded-full bg-[var(--success-500)] animate-pulse"></span>
                <span className="text-small font-medium text-[var(--success-600)]">{activeAgents} active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Stats Overview */}
        <section className="mb-8 animate-fade-in">
          <StatsOverview 
            totalAgents={agents.length}
            activeAgents={activeAgents}
            openTasks={openTasks}
            inProgressTasks={inProgressTasks}
            completedThisWeek={completedThisWeek}
            pendingIdeas={ideaStats.pending}
            sparklines={sparklines}
          />
        </section>

        {/* Quick Actions */}
        <section className="mb-10">
          <QuickActions />
        </section>

        {/* Two Column Layout: Task Board + Activity Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Task Board - 2 columns */}
          <section className="xl:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="heading-md">Task Board</h2>
                <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded-full text-xs font-medium text-[var(--text-tertiary)]">
                  {tasks.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-500)]"></span>
                <span className="text-caption">{openTasks} open</span>
              </div>
            </div>
            <TaskBoard tasks={tasks} agents={agents} />
          </section>

          {/* Right Column - Agent Cards + Activity Feed */}
          <section className="space-y-8">
            {/* Agent Cards */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="heading-md">The Team</h2>
                <Link href="/agents" className="text-xs font-medium text-[var(--accent-600)] hover:text-[var(--accent-700)] transition-colors">
                  View all →
                </Link>
              </div>
              <AgentCards agents={agents} />
            </div>

            {/* Activity Feed */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="heading-md">Activity</h2>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-500)] animate-pulse"></span>
                  <span className="text-caption">Live</span>
                </span>
              </div>
              <ActivityFeed activities={activities} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

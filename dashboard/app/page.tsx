"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";

const buildStages = [
  { key: 'not_started', label: 'Not Started', color: 'bg-gray-400', icon: '⚪' },
  { key: 'agents_spawning', label: 'Spawning', color: 'bg-yellow-500', icon: '🚀' },
  { key: 'agents_working', label: 'Working', color: 'bg-blue-500', icon: '🔨' },
  { key: 'building_locally', label: 'Building', color: 'bg-purple-500', icon: '💻' },
  { key: 'pushing_to_github', label: 'GitHub', color: 'bg-indigo-500', icon: '📦' },
  { key: 'deploying_to_vercel', label: 'Deploying', color: 'bg-orange-500', icon: '🚢' },
  { key: 'completed', label: 'Live', color: 'bg-green-500', icon: '🚀' },
  { key: 'failed', label: 'Failed', color: 'bg-red-500', icon: '❌' },
];

export default function Home() {
  const ideas = useQuery(api.ideas.list);
  const stats = useQuery(api.ideas.getStats);

  if (ideas === undefined || stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  // Get counts for each build stage
  const stageCounts = buildStages.reduce((acc, stage) => {
    acc[stage.key] = ideas.filter((idea: any) => idea.buildStage === stage.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-base sm:text-lg font-bold">
                M
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Mission Control</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Unified Pipeline + Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href="/pipeline"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                <span>💡</span>
                <span className="hidden sm:inline">Pipeline</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Pipeline Overview</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
            {buildStages.map((stage) => {
              const count = stageCounts[stage.key] || 0;
              return (
                <div key={stage.key} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col items-center sm:items-start mb-1">
                    <span className="text-xl sm:text-2xl">{stage.icon}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left">{count}</div>
                  <div className="text-xs text-gray-500 text-center sm:text-left mt-1">{stage.label}</div>
                  <div className={`h-1 mt-2 sm:mt-3 rounded-full ${stage.color} ${count > 0 ? 'opacity-100' : 'opacity-20'}`}></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pipeline vs Dashboard Stats */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pipeline Stats */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 Pipeline</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Scouted</span>
                <span className="font-semibold">{stats?.pipeline?.scouted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reviewing</span>
                <span className="font-semibold">{stats?.pipeline?.reviewing || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Approved</span>
                <span className="font-semibold text-green-600">{stats?.pipeline?.approved || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rejected</span>
                <span className="font-semibold text-red-600">{stats?.pipeline?.rejected || 0}</span>
              </div>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Dashboard</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Backlog</span>
                <span className="font-semibold">{stats?.dashboard?.backlog || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">In Progress</span>
                <span className="font-semibold text-blue-600">{stats?.dashboard?.inProgress || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Built</span>
                <span className="font-semibold text-purple-600">{stats?.dashboard?.built || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Deployed</span>
                <span className="font-semibold text-green-600">{stats?.dashboard?.deployed || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Ideas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Ideas</h2>
            <span className="text-sm text-gray-500">{ideas.length} total</span>
          </div>
          
          <div className="space-y-3">
            {ideas.slice(0, 10).map((idea: any) => (
              <div 
                key={idea._id} 
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{idea.title}</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                        {idea.buildStage?.replace(/_/g, ' ') || 'not started'}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                        {idea.taskStatus}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{idea.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {idea.deployedUrl && (
                      <a 
                        href={idea.deployedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        🚀 Live
                      </a>
                    )}
                    {idea.githubRepoUrl && !idea.deployedUrl && (
                      <a 
                        href={idea.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        📦 GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {ideas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Ideas Yet</h3>
              <p className="text-gray-500">Scout will discover ideas automatically</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

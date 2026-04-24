"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";

// Unified pipeline stages - one continuous flow from idea to deployed product
const pipelineStages = [
  { key: 'scouted', label: 'Scouted', color: 'bg-gray-400', icon: '💡', description: 'New ideas awaiting review' },
  { key: 'approved', label: 'Approved', color: 'bg-blue-400', icon: '✅', description: 'Ready to build' },
  { key: 'agents_spawning', label: 'Spawning', color: 'bg-yellow-500', icon: '🚀', description: 'Starting agent sessions' },
  { key: 'agents_working', label: 'Building', color: 'bg-blue-500', icon: '🔨', description: 'Agents coding the product' },
  { key: 'building_locally', label: 'Testing', color: 'bg-purple-500', icon: '💻', description: 'Local build & verification' },
  { key: 'pushing_to_github', label: 'Committing', color: 'bg-indigo-500', icon: '📦', description: 'Pushing to GitHub' },
  { key: 'deploying_to_vercel', label: 'Deploying', color: 'bg-orange-500', icon: '🚢', description: 'Deploying to Vercel' },
  { key: 'completed', label: 'Live', color: 'bg-green-500', icon: '🚀', description: 'Product is live!' },
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

  // Get counts for each pipeline stage
  const stageCounts = pipelineStages.reduce((acc, stage) => {
    if (stage.key === 'scouted') {
      acc[stage.key] = ideas.filter((idea: any) => idea.pipelineStatus === 'scouted').length;
    } else if (stage.key === 'approved') {
      acc[stage.key] = ideas.filter((idea: any) => 
        idea.pipelineStatus === 'approved' && 
        (!idea.buildStage || idea.buildStage === 'not_started')
      ).length;
    } else {
      acc[stage.key] = ideas.filter((idea: any) => idea.buildStage === stage.key).length;
    }
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
                href="/ideas"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                <span>💡</span>
                <span className="hidden sm:inline">Ideas</span>
              </Link>
              <Link
                href="/pipeline"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Pipeline</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Unified Pipeline Overview */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Unified Pipeline</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
            {pipelineStages.map((stage) => {
              const count = stageCounts[stage.key] || 0;
              return (
                <div key={stage.key} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
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

        {/* Quick Stats Summary */}
        <section className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Pipeline Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-700">{stats?.pipeline?.scouted || 0}</div>
                <div className="text-sm text-gray-500 mt-1">To Review</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {(stats?.pipeline?.approved || 0) + (stats?.dashboard?.inProgress || 0)}
                </div>
                <div className="text-sm text-gray-500 mt-1">In Progress</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{stats?.dashboard?.built || 0}</div>
                <div className="text-sm text-gray-500 mt-1">Built</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{stats?.dashboard?.deployed || 0}</div>
                <div className="text-sm text-gray-500 mt-1">Live</div>
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
                      {idea.pipelineStatus === 'scouted' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">
                          💡 Scouted
                        </span>
                      ) : idea.buildStage && idea.buildStage !== 'not_started' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                          🔨 {idea.buildStage.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                          📋 Approved
                        </span>
                      )}
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

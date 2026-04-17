"use client";

import { useQuery } from "convex/react";
import { api } from "./convex/_generated/api";
import Link from "next/link";

const stages = [
  { key: 'pending', label: 'Pending', color: 'bg-gray-400', icon: '⏳' },
  { key: 'approved', label: 'Approved', color: 'bg-blue-500', icon: '✅' },
  { key: 'building', label: 'Building', color: 'bg-amber-500', icon: '🔨' },
  { key: 'agentComplete', label: 'Code Ready', color: 'bg-purple-500', icon: '💻' },
  { key: 'githubPushed', label: 'GitHub', color: 'bg-indigo-500', icon: '📦' },
  { key: 'vercelDeployed', label: 'Live', color: 'bg-green-500', icon: '🚀' },
];

function getStageLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    building: 'Building',
    agent_complete: 'Code Ready',
    github_pushed: 'GitHub',
    vercel_deployed: 'Live',
    failed: 'Failed',
  };
  return labels[status] || status;
}

export default function Home() {
  const builds = useQuery(api.builds.list);
  const stats = useQuery(api.builds.getStats);

  if (builds === undefined || stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading pipeline...</p>
        </div>
      </div>
    );
  }

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
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Idea → Build → Deploy Pipeline</p>
              </div>
            </div>
            
            <Link
              href="/ideas"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <span>💡</span>
              <span className="hidden sm:inline">Review Ideas</span>
              <span className="sm:hidden">Ideas</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Pipeline Stats */}
        <section className="mb-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {stages.map((stage) => {
              const count = stats[stage.key as keyof typeof stats] || 0;
              return (
                <div key={stage.key} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-2 mb-1 sm:mb-2">
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

        {/* Recent Builds */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Builds</h2>
            <span className="text-sm text-gray-500">{builds.length} total</span>
          </div>
          
          <div className="space-y-3">
            {builds.slice(0, 10).map((build) => (
              <div 
                key={build._id} 
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{build.title}</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                        {getStageLabel(build.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {build.vercelUrl && (
                      <a 
                        href={build.vercelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        🚀 Live
                      </a>
                    )}
                    {build.githubUrl && !build.vercelUrl && (
                      <a 
                        href={build.githubUrl}
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
          
          {builds.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Pipeline Empty</h3>
              <p className="text-gray-500">Approve ideas to start the build pipeline</p>
              <Link 
                href="/ideas"
                className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Review Ideas
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

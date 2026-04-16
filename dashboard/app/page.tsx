"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PipelineIdea {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'building' | 'agent_complete' | 'github_pushed' | 'vercel_deployed';
  stage: number;
  createdAt: number;
  githubUrl?: string;
  vercelUrl?: string;
  potential: string;
}

function getStageLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    building: 'Building',
    agent_complete: 'Code Ready',
    github_pushed: 'On GitHub',
    vercel_deployed: 'Live',
  };
  return labels[status] || status;
}

function getStageColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-gray-500',
    approved: 'text-blue-500',
    building: 'text-amber-500',
    agent_complete: 'text-purple-500',
    github_pushed: 'text-indigo-500',
    vercel_deployed: 'text-green-500',
  };
  return colors[status] || 'text-gray-500';
}

interface PipelineStats {
  total: number;
  pending: number;
  approved: number;
  building: number;
  agentComplete: number;
  githubPushed: number;
  vercelDeployed: number;
}

const stages = [
  { key: 'pending', label: 'Pending', color: 'bg-gray-400', icon: '⏳' },
  { key: 'approved', label: 'Approved', color: 'bg-blue-500', icon: '✅' },
  { key: 'building', label: 'Building', color: 'bg-amber-500', icon: '🔨' },
  { key: 'agentComplete', label: 'Code Ready', color: 'bg-purple-500', icon: '💻' },
  { key: 'githubPushed', label: 'GitHub', color: 'bg-indigo-500', icon: '📦' },
  { key: 'vercelDeployed', label: 'Live', color: 'bg-green-500', icon: '🚀' },
];

export default function Home() {
  const [pipeline, setPipeline] = useState<PipelineIdea[]>([]);
  const [stats, setStats] = useState<PipelineStats>({
    total: 0,
    pending: 0,
    approved: 0,
    building: 0,
    agentComplete: 0,
    githubPushed: 0,
    vercelDeployed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchPipeline = async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setPipeline(data.pipeline || []);
      setStats(data.stats || stats);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error("Failed to fetch pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPipeline, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
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
            
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">
                Updated {formatTime(lastUpdated)}
              </span>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Pipeline Stats - Mobile Optimized */}
        <section className="mb-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {stages.map((stage) => {
              const count = stats[stage.key as keyof PipelineStats] || 0;
              return (
                <div key={stage.key} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-2xl">{stage.icon}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-600 text-center sm:text-left hidden sm:block">{stage.label}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left">{count}</div>
                  <div className={`h-1 mt-2 sm:mt-3 rounded-full ${stage.color} ${count > 0 ? 'opacity-100' : 'opacity-20'}`}></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pipeline Progress Bar - Mobile Optimized */}
        <section className="mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Pipeline Flow</h2>
            <div className="relative">
              {/* Progress line - hidden on mobile, shown on sm+ */}
              <div className="hidden sm:block absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
              <div 
                className="hidden sm:block absolute top-6 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-500"
                style={{ 
                  width: stats.total > 0 
                    ? `${((stats.githubPushed + stats.vercelDeployed) / stats.total) * 100}%` 
                    : '0%' 
                }}
              ></div>
              
              {/* Stage dots - scrollable on mobile */}
              <div className="flex sm:justify-between gap-4 sm:gap-0 overflow-x-auto pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
                {stages.map((stage, i) => {
                  const count = stats[stage.key as keyof PipelineStats] || 0;
                  const isActive = count > 0;
                  return (
                    <div key={stage.key} className="flex flex-col items-center flex-shrink-0 min-w-[60px] sm:min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl mb-2 transition-all ${
                        isActive 
                          ? `${stage.color} text-white shadow-lg` 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {stage.icon}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-600 text-center leading-tight">{stage.label}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Pipeline Items */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Pipeline</h2>
            <span className="text-sm text-gray-500">{pipeline.length} total items</span>
          </div>
          
          <div className="space-y-3">
            {pipeline.slice(0, 10).map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStageColor(item.status)} bg-opacity-10`}>
                        {getStageLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {/* Stage indicators */}
                    <div className="flex items-center gap-1">
                      {stages.map((s, i) => (
                        <div 
                          key={s.key}
                          className={`w-2 h-2 rounded-full ${
                            i <= item.stage ? s.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Action links */}
                    {item.vercelUrl && (
                      <a 
                        href={item.vercelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        🚀 Live
                      </a>
                    )}
                    {item.githubUrl && !item.vercelUrl && (
                      <a 
                        href={item.githubUrl}
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
          
          {pipeline.length === 0 && (
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

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

const columns = [
  { key: "backlog", label: "Backlog", color: "bg-gray-100", borderColor: "border-gray-300" },
  { key: "assigned", label: "Assigned", color: "bg-blue-50", borderColor: "border-blue-300" },
  { key: "in_progress", label: "In Progress", color: "bg-purple-50", borderColor: "border-purple-300" },
  { key: "built", label: "Built", color: "bg-indigo-50", borderColor: "border-indigo-300" },
  { key: "deployed", label: "Deployed", color: "bg-green-50", borderColor: "border-green-300" },
  { key: "blocked", label: "Blocked", color: "bg-red-50", borderColor: "border-red-300" },
];

const buildStageIcons: Record<string, string> = {
  not_started: "⚪",
  agents_spawning: "🚀",
  agents_working: "🔨",
  building_locally: "💻",
  pushing_to_github: "📦",
  deploying_to_vercel: "🚢",
  completed: "✅",
  failed: "❌",
};

export default function DashboardPage() {
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const ideas = useQuery(api.ideas.list);
  
  // Group ideas by task status
  const ideasByStatus = columns.reduce((acc, col) => {
    acc[col.key] = ideas?.filter((idea: any) => idea.taskStatus === col.key) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-base sm:text-lg font-bold">
                M
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Mission Control Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Track builds from agents to deployment</p>
              </div>
            </div>
            
            <Link
              href="/pipeline"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <span>💡</span>
              <span className="hidden sm:inline">Pipeline</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.key} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className={`${col.color} rounded-t-lg px-4 py-3 border ${col.borderColor} border-b-0`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{col.label}</h3>
                  <span className="bg-white text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {ideasByStatus[col.key]?.length || 0}
                  </span>
                </div>
              </div>
              
              {/* Column Content */}
              <div className={`${col.color} rounded-b-lg border ${col.borderColor} border-t-0 p-3 min-h-[500px]`}>
                <div className="space-y-3">
                  {ideasByStatus[col.key]?.map((idea: any) => (
                    <div 
                      key={idea._id}
                      onClick={() => setSelectedIdea(idea)}
                      className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {/* Title */}
                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{idea.title}</h4>
                      
                      {/* Build Stage */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{buildStageIcons[idea.buildStage] || "⚪"}</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {idea.buildStage?.replace(/_/g, " ") || "not started"}
                        </span>
                      </div>

                      {/* Agent Spawns */}
                      {idea.agentSpawns && idea.agentSpawns.length > 0 && (
                        <div className="space-y-1 mb-3">
                          {idea.agentSpawns.slice(0, 3).map((spawn: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className={`
                                w-2 h-2 rounded-full
                                ${spawn.status === "completed" ? "bg-green-500" :
                                  spawn.status === "working" ? "bg-blue-500" :
                                  spawn.status === "spawned" ? "bg-purple-500" :
                                  spawn.status === "failed" ? "bg-red-500" :
                                  spawn.status === "manual_intervention_required" ? "bg-amber-500" :
                                  "bg-gray-300"}
                              `} />
                              <span className="text-gray-600">{spawn.agentName || spawn.agentId}</span>
                              <span className="text-gray-400 capitalize">{spawn.status.replace(/_/g, " ")}</span>
                            </div>
                          ))}
                          {idea.agentSpawns.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{idea.agentSpawns.length - 3} more agents
                            </div>
                          )}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        {idea.githubRepoUrl && (
                          <a 
                            href={idea.githubRepoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            GitHub
                          </a>
                        )}
                        {idea.deployedUrl && (
                          <a 
                            href={idea.deployedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Live
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedIdea(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedIdea.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedIdea.buildStage?.replace(/_/g, " ")} • {selectedIdea.taskStatus}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedIdea(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-6">{selectedIdea.description}</p>

              {/* Agent Spawns Detail */}
              {selectedIdea.agentSpawns && selectedIdea.agentSpawns.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Agent Status</h3>
                  <div className="space-y-3">
                    {selectedIdea.agentSpawns.map((spawn: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{spawn.agentName || spawn.agentId}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            spawn.status === "completed" ? "bg-green-100 text-green-700" :
                            spawn.status === "working" ? "bg-blue-100 text-blue-700" :
                            spawn.status === "failed" ? "bg-red-100 text-red-700" :
                            spawn.status === "manual_intervention_required" ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {spawn.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        
                        {spawn.spawnCommand && (
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="text-gray-400">Command:</span> {spawn.spawnCommand}
                          </div>
                        )}
                        
                        {spawn.sessionKey && (
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="text-gray-400">Session:</span> {spawn.sessionKey}
                          </div>
                        )}
                        
                        {spawn.spawnError && (
                          <div className="text-xs text-red-600 mt-2">
                            Error: {spawn.spawnError}
                          </div>
                        )}
                        
                        {spawn.status === "manual_intervention_required" && spawn.spawnCommand && (
                          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-xs text-amber-800 mb-1">Manual action required:</p>
                            <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto">
                              {spawn.spawnCommand}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                {selectedIdea.outputLocation && (
                  <div className="text-sm">
                    <span className="text-gray-500">Output:</span>{" "}
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {selectedIdea.outputLocation}
                    </code>
                  </div>
                )}
                {selectedIdea.githubRepoUrl && (
                  <a 
                    href={selectedIdea.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View on GitHub →
                  </a>
                )}
                {selectedIdea.deployedUrl && (
                  <a 
                    href={selectedIdea.deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline"
                  >
                    View Live Site →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

const potentialColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-purple-100 text-purple-600",
  moonshot: "bg-amber-100 text-amber-600",
};

const potentialLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  moonshot: "🚀 Moonshot",
};

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<"scouted" | "approved" | "rejected">("scouted");
  const ideas = useQuery(api.ideas.listByPipelineStatus, { status: activeTab });
  const approveIdea = useMutation(api.ideas.approve);
  const rejectIdea = useMutation(api.ideas.reject);
  const archiveIdea = useMutation(api.ideas.archive);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleApprove = async (ideaId: string) => {
    setIsLoading(ideaId);
    try {
      await approveIdea({ ideaId: ideaId as any, approvedBy: "nathan" });
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async (ideaId: string) => {
    setIsLoading(ideaId);
    try {
      await rejectIdea({ ideaId: ideaId as any, reason: "Rejected from pipeline" });
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleArchive = async (ideaId: string) => {
    setIsLoading(ideaId);
    try {
      await archiveIdea({ ideaId: ideaId as any });
    } catch (error) {
      console.error("Failed to archive:", error);
    } finally {
      setIsLoading(null);
    }
  };

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
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Idea Pipeline</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Review and approve ideas for building</p>
              </div>
            </div>
            
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Overview</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs - Simplified: Scouted → Approved/Rejected */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["scouted", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Ideas Grid */}
        {ideas === undefined ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading ideas...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-3">💡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No {activeTab} ideas</h3>
            <p className="text-gray-500">
              {activeTab === "scouted" 
                ? "Scout will discover ideas automatically"
                : `No ideas in ${activeTab} status`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea: any) => (
              <div key={idea._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${potentialColors[idea.potential]}`}>
                          {potentialLabels[idea.potential]}
                        </span>
                        {idea.discoverySource && (
                          <span className="text-xs text-gray-500">
                            via {idea.discoverySource}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-tight">{idea.title}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{idea.description}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 w-20 flex-shrink-0">Target:</span>
                      <span className="text-gray-700">{idea.targetAudience}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 w-20 flex-shrink-0">MVP:</span>
                      <span className="text-gray-700 line-clamp-2">{idea.mvpScope}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {idea.tags.slice(0, 5).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {activeTab === "scouted" && (
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleApprove(idea._id)}
                        disabled={isLoading === idea._id}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {isLoading === idea._id ? "..." : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(idea._id)}
                        disabled={isLoading === idea._id}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isLoading === idea._id ? "..." : "✕ Reject"}
                      </button>
                    </div>
                  )}

                  {activeTab === "approved" && (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 py-2 px-4 rounded-lg">
                      <span>✓ Approved</span>
                      <span className="text-gray-400">|</span>
                      <span>Ready to Build</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  Scouted {new Date(idea.scoutedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

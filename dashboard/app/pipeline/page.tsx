"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "../lib/iconRegistry";
import { BuildNowButton } from "../components/BuildNowButton";

const potentialTone: Record<string, "muted" | "info" | "accent" | "warning"> = {
  low: "muted",
  medium: "info",
  high: "accent",
  moonshot: "warning",
};

const potentialLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  moonshot: "Moonshot",
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
      await approveIdea({ ideaId: ideaId as any });
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
              <Link href="/" className="icon-tile" aria-label="Mission Control home">
                <Icon name="brand.logo" size={20} />
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Idea Pipeline</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Review and approve ideas for building</p>
              </div>
            </div>
            
            <Link href="/" className="btn btn-secondary" aria-label="Overview">
              <Icon name="entity.stats" size={16} />
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
          <div className="card card-pad text-center">
            <span className="icon-tile mx-auto mb-3" aria-hidden>
              <Icon name="nav.ideas" size={20} />
            </span>
            <h3 className="heading-md mb-1">No {activeTab} ideas</h3>
            <p className="text-body">
              {activeTab === "scouted"
                ? "Scout will discover ideas overnight."
                : `No ideas in ${activeTab} status.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea: any) => (
              <div key={idea._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`status-dot status-dot--${potentialTone[idea.potential] ?? "muted"}`}>
                          {idea.potential === "moonshot" && <Icon name="entity.moonshot" size={12} />}
                          {potentialLabels[idea.potential]}
                        </span>
                        {idea.discoverySource && (
                          <span className="text-caption">via {idea.discoverySource}</span>
                        )}
                      </div>
                      <h3 className="heading-md leading-tight">{idea.title}</h3>
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

                  {activeTab === "scouted" && (
                    <div className="flex gap-2 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
                      <button
                        onClick={() => handleApprove(idea._id)}
                        disabled={isLoading === idea._id}
                        className="btn btn-primary flex-1"
                        aria-label="Approve idea"
                      >
                        <Icon name="pipelineStatus.approved" size={16} />
                        <span>{isLoading === idea._id ? "…" : "Approve"}</span>
                      </button>
                      <button
                        onClick={() => handleReject(idea._id)}
                        disabled={isLoading === idea._id}
                        className="btn btn-secondary flex-1"
                        aria-label="Reject idea"
                      >
                        <Icon name="pipelineStatus.rejected" size={16} />
                        <span>{isLoading === idea._id ? "…" : "Reject"}</span>
                      </button>
                    </div>
                  )}

                  {activeTab === "approved" && (
                    <div className="flex items-center justify-between gap-2 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
                      <span className="status-dot status-dot--success">Approved</span>
                      <BuildNowButton
                        ideaId={idea._id}
                        pipelineStatus={idea.pipelineStatus}
                        buildStage={idea.buildStage}
                        compact
                      />
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

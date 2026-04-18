"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface Idea {
  _id: Id<"ideas">;
  title: string;
  description: string;
  targetAudience: string;
  mvpScope: string;
  potential: "low" | "medium" | "high" | "moonshot";
  pipelineStatus: "scouted" | "reviewing" | "approved" | "rejected" | "archived";
  taskStatus: "backlog" | "inbox" | "assigned" | "in_progress" | "built" | "deployed" | "blocked";
  buildStage?: "not_started" | "agents_spawning" | "agents_working" | "building_locally" | "pushing_to_github" | "deploying_to_vercel" | "completed" | "failed";
  createdAt: number;
  approvedAt?: number;
  deployedUrl?: string;
  githubRepoUrl?: string;
  source?: string;
  tags?: string[];
}

interface IdeaCardProps {
  idea: Idea;
  onAction?: () => void;
}

const potentialColors = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-purple-100 text-purple-600",
  moonshot: "bg-amber-100 text-amber-600",
};

const potentialLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  moonshot: "🚀 Moonshot",
};

const pipelineStatusConfig = {
  scouted: {
    badge: "bg-gray-100 text-gray-600",
    label: "Scouted",
    icon: "🔍",
  },
  reviewing: {
    badge: "bg-blue-100 text-blue-600",
    label: "Reviewing",
    icon: "👀",
  },
  approved: {
    badge: "bg-green-100 text-green-600",
    label: "Approved",
    icon: "✅",
  },
  rejected: {
    badge: "bg-red-100 text-red-600",
    label: "Rejected",
    icon: "❌",
  },
  archived: {
    badge: "bg-gray-100 text-gray-500",
    label: "Archived",
    icon: "📦",
  },
};

const buildStageConfig: Record<string, { label: string; icon: string; color: string }> = {
  not_started: { label: "Not Started", icon: "⚪", color: "text-gray-400" },
  agents_spawning: { label: "Spawning Agents", icon: "🚀", color: "text-yellow-500" },
  agents_working: { label: "Agents Working", icon: "🔨", color: "text-blue-500" },
  building_locally: { label: "Building", icon: "💻", color: "text-purple-500" },
  pushing_to_github: { label: "GitHub", icon: "📦", color: "text-indigo-500" },
  deploying_to_vercel: { label: "Deploying", icon: "🚢", color: "text-orange-500" },
  completed: { label: "Live", icon: "✅", color: "text-green-500" },
  failed: { label: "Failed", icon: "❌", color: "text-red-500" },
};

export default function IdeaCard({ idea, onAction }: IdeaCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const approveIdea = useMutation(api.ideas.approve);
  const rejectIdea = useMutation(api.ideas.reject);
  const removeIdea = useMutation(api.ideas.remove);

  const status = pipelineStatusConfig[idea.pipelineStatus];
  const buildStage = idea.buildStage 
    ? buildStageConfig[idea.buildStage] 
    : buildStageConfig.not_started;
  
  const createdDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approveIdea({ ideaId: idea._id, approvedBy: "nathan" });
      onAction?.();
    } catch (error) {
      console.error("Failed to approve idea:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await rejectIdea({ ideaId: idea._id, reason: "Rejected from dashboard" });
      onAction?.();
    } catch (error) {
      console.error("Failed to reject idea:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await removeIdea({ ideaId: idea._id, reason: "User deleted from dashboard" });
      onAction?.();
    } catch (error) {
      console.error("Failed to delete idea:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionButton = () => {
    switch (idea.pipelineStatus) {
      case "scouted":
        return (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? "..." : "✓ Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {isLoading ? "..." : "✕ Reject"}
            </button>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 py-2 px-4 rounded-lg">
            <span>✓ Approved</span>
            <span className="text-gray-400">|</span>
            <span>Ready for Dashboard</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">
            <span>✕ Rejected</span>
          </div>
        );
      case "archived":
        return (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-100 py-2 px-4 rounded-lg">
            <span>📦 Archived</span>
          </div>
        );
      default:
        if (idea.deployedUrl) {
          return (
            <a
              href={idea.deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              🚀 View Live Site
            </a>
          );
        } else if (idea.githubRepoUrl) {
          return (
            <a
              href={idea.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              📦 View on GitHub
            </a>
          );
        } else {
          return (
            <div className="flex items-center justify-center gap-2 text-sm text-purple-600 bg-purple-50 py-2 px-4 rounded-lg">
              <span>{buildStage.icon} {buildStage.label}</span>
            </div>
          );
        }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.badge}`}>
                {status.icon} {status.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${potentialColors[idea.potential]}`}>
                {potentialLabels[idea.potential]}
              </span>
              {idea.source && (
                <span className="text-xs text-gray-500">
                  via {idea.source}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 leading-tight">{idea.title}</h3>
          </div>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Delete idea"
          >
            ✕
          </button>
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
            {idea.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-3 border-t border-gray-100">
          {getActionButton()}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Scouted {createdDate}</span>
        {idea.approvedAt && (
          <span>
            Approved {new Date(idea.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

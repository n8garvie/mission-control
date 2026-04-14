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
  status: "pending" | "approved" | "building" | "done";
  createdAt: number;
  approvedAt?: number;
  deployedUrl?: string;
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

const statusConfig = {
  pending: {
    badge: "badge-pending",
    label: "Pending",
    icon: "⏳",
    borderColor: "border-l-4 border-l-gray-400",
  },
  approved: {
    badge: "badge-approved",
    label: "Approved",
    icon: "✅",
    borderColor: "border-l-4 border-l-blue-500",
  },
  building: {
    badge: "badge-building",
    label: "Building",
    icon: "🔨",
    borderColor: "border-l-4 border-l-amber-500",
  },
  done: {
    badge: "badge-done",
    label: "Deployed",
    icon: "🚀",
    borderColor: "border-l-4 border-l-green-500",
  },
};

export default function IdeaCard({ idea, onAction }: IdeaCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const approveIdea = useMutation(api.ideas.approve);
  const markBuilding = useMutation(api.ideas.markBuilding);
  const markDone = useMutation(api.ideas.markDone);
  const removeIdea = useMutation(api.ideas.remove);

  const status = statusConfig[idea.status];
  const createdDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approveIdea({ ideaId: idea._id });
      onAction?.();
    } catch (error) {
      console.error("Failed to approve idea:", error);
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
    switch (idea.status) {
      case "pending":
        return (
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="btn btn-primary text-sm w-full"
          >
            {isLoading ? "Approving..." : "✅ Approve & Build"}
          </button>
        );
      case "approved":
        return (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 py-2 px-4 rounded">
            <span>⏳ Queued for overnight build</span>
          </div>
        );
      case "building":
        return (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 py-2 px-4 rounded">
            <span className="animate-pulse">🔨 Building...</span>
          </div>
        );
      case "done":
        return (
          <a
            href={idea.deployedUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary text-sm w-full text-center"
          >
            🚀 View Deployment
          </a>
        );
    }
  };

  return (
    <div className={`card overflow-hidden ${status.borderColor}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${status.badge}`}>
                {status.icon} {status.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${potentialColors[idea.potential]}`}>
                {potentialLabels[idea.potential]}
              </span>
              {idea.source && (
                <span className="text-caption text-xs">
                  via {idea.source}
                </span>
              )}
            </div>
            <h3 className="heading-md text-base leading-tight">{idea.title}</h3>
          </div>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-[var(--text-muted)] hover:text-[var(--error-500)] transition-colors p-1"
            title="Delete idea"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-body text-sm mb-4 line-clamp-3">{idea.description}</p>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-caption text-xs uppercase w-24 flex-shrink-0">Target:</span>
            <span className="text-small text-[var(--text-secondary)]">{idea.targetAudience}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-caption text-xs uppercase w-24 flex-shrink-0">MVP Scope:</span>
            <span className="text-small text-[var(--text-secondary)]">{idea.mvpScope}</span>
          </div>
        </div>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Deployed URL */}
        {idea.deployedUrl && (
          <div className="mb-4 p-2 bg-[var(--success-50)] rounded border border-[var(--success-500)] border-opacity-20">
            <span className="text-caption text-xs block mb-1">Deployed to:</span>
            <a
              href={idea.deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent-600)] hover:underline truncate block"
            >
              {idea.deployedUrl}
            </a>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-3 border-t border-[var(--border-light)]">
          {getActionButton()}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-light)] flex items-center justify-between">
        <span className="text-caption text-xs">Scouted {createdDate}</span>
        {idea.approvedAt && (
          <span className="text-caption text-xs">
            Approved {new Date(idea.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

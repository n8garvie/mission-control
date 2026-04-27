"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Icon, type IconName } from "../lib/iconRegistry";
import { BuildNowButton } from "./BuildNowButton";

interface Evidence {
  sourceUrl: string;
  sourceTitle: string;
  score: number;
  capturedAt: number;
}

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
  evidence?: Evidence[];
  discoverySources?: string[];
  lastBuildError?: string;
}

interface IdeaCardProps {
  idea: Idea;
  onAction?: () => void;
}

const potentialTone: Record<Idea["potential"], "muted" | "info" | "accent" | "warning"> = {
  low: "muted",
  medium: "info",
  high: "accent",
  moonshot: "warning",
};

const pipelineStatusConfig: Record<
  Idea["pipelineStatus"],
  { label: string; iconName: IconName; tone: "muted" | "info" | "success" | "error" | "accent" }
> = {
  scouted:   { label: "Scouted",   iconName: "pipelineStatus.scouted",  tone: "muted" },
  reviewing: { label: "Reviewing", iconName: "pipelineStatus.reviewing", tone: "info" },
  approved:  { label: "Approved",  iconName: "pipelineStatus.approved", tone: "success" },
  rejected:  { label: "Rejected",  iconName: "pipelineStatus.rejected", tone: "error" },
  archived:  { label: "Archived",  iconName: "pipelineStatus.archived", tone: "muted" },
};

const buildStageConfig: Record<string, { label: string; iconName: IconName; tone: "muted" | "info" | "success" | "error" | "accent" | "warning" }> = {
  not_started:         { label: "Not started",     iconName: "buildStage.not_started",         tone: "muted" },
  agents_spawning:     { label: "Spawning agents", iconName: "buildStage.agents_spawning",     tone: "warning" },
  agents_working:      { label: "Agents working",  iconName: "buildStage.agents_working",      tone: "info" },
  building_locally:    { label: "Building",        iconName: "buildStage.building_locally",    tone: "accent" },
  pushing_to_github:   { label: "Committing",      iconName: "buildStage.pushing_to_github",   tone: "info" },
  deploying_to_vercel: { label: "Deploying",       iconName: "buildStage.deploying_to_vercel", tone: "warning" },
  completed:           { label: "Live",            iconName: "buildStage.completed",           tone: "success" },
  failed:              { label: "Failed",          iconName: "buildStage.failed",              tone: "error" },
};

export default function IdeaCard({ idea, onAction }: IdeaCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const approveIdea = useMutation(api.ideas.approve);
  const rejectIdea = useMutation(api.ideas.reject);
  const removeIdea = useMutation(api.ideas.remove);

  const status = pipelineStatusConfig[idea.pipelineStatus];
  const stageKey = idea.buildStage ?? "not_started";
  const stage = buildStageConfig[stageKey] ?? buildStageConfig.not_started;

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

  const renderActionRow = () => {
    if (idea.pipelineStatus === "scouted") {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="btn btn-primary flex-1"
            aria-label="Approve idea"
          >
            <Icon name="pipelineStatus.approved" size={16} />
            <span>{isLoading ? "…" : "Approve"}</span>
          </button>
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="btn btn-secondary flex-1"
            aria-label="Reject idea"
          >
            <Icon name="pipelineStatus.rejected" size={16} />
            <span>{isLoading ? "…" : "Reject"}</span>
          </button>
        </div>
      );
    }

    if (idea.pipelineStatus === "approved") {
      return (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="status-dot status-dot--success">Approved</span>
          <BuildNowButton
            ideaId={idea._id}
            pipelineStatus={idea.pipelineStatus}
            buildStage={idea.buildStage}
            compact
          />
        </div>
      );
    }

    if (idea.pipelineStatus === "rejected") {
      return <span className="status-dot status-dot--error">Rejected</span>;
    }

    if (idea.pipelineStatus === "archived") {
      return <span className="status-dot status-dot--muted">Archived</span>;
    }

    if (idea.deployedUrl) {
      return (
        <a
          href={idea.deployedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full"
        >
          <Icon name="stage.live" size={16} />
          <span>View live site</span>
        </a>
      );
    }
    if (idea.githubRepoUrl) {
      return (
        <a
          href={idea.githubRepoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary w-full"
        >
          <Icon name="buildStage.pushing_to_github" size={16} />
          <span>View on GitHub</span>
        </a>
      );
    }
    return (
      <span className={`status-dot status-dot--${stage.tone}`}>
        <Icon name={stage.iconName} size={14} />
        {stage.label}
      </span>
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="card-pad">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`status-dot status-dot--${status.tone}`}>
                <Icon name={status.iconName} size={12} />
                {status.label}
              </span>
              <span className={`status-dot status-dot--${potentialTone[idea.potential]}`}>
                {idea.potential === "moonshot" && <Icon name="entity.moonshot" size={12} />}
                {idea.potential.charAt(0).toUpperCase() + idea.potential.slice(1)}
              </span>
              {idea.source && (
                <span className="text-caption">via {idea.source}</span>
              )}
            </div>
            <h3 className="heading-md leading-tight">{idea.title}</h3>
          </div>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="btn btn-ghost p-1"
            title="Delete idea"
            aria-label="Delete idea"
          >
            <Icon name="pipelineStatus.rejected" size={16} />
          </button>
        </div>

        <p className="text-body mb-4" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {idea.description}
        </p>

        <div className="space-y-2 mb-4">
          <DetailRow label="Target" value={idea.targetAudience} />
          <DetailRow label="MVP" value={idea.mvpScope} clamp />
        </div>

        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {idea.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-caption"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "0.375rem",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {idea.evidence && idea.evidence.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setEvidenceOpen((v) => !v)}
              className="status-dot status-dot--muted"
              aria-expanded={evidenceOpen}
              aria-label={`Toggle ${idea.evidence.length} sources`}
            >
              <Icon name="entity.search" size={12} />
              {evidenceOpen ? "Hide" : "Show"} {idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}
            </button>
            {evidenceOpen && (
              <ul className="mt-2 space-y-1">
                {idea.evidence.map((ev, i) => (
                  <li key={i} className="text-small">
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="status-dot status-dot--accent"
                      style={{ fontSize: "0.8125rem" }}
                    >
                      <Icon name="entity.next" size={12} />
                      {ev.sourceTitle}
                      {ev.score > 0 && <span className="text-caption ml-1">· {ev.score}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {idea.lastBuildError && (
          <div className="status-dot status-dot--error mb-3">
            <Icon name="entity.warning" size={12} />
            {idea.lastBuildError.length > 120 ? idea.lastBuildError.substring(0, 120) + "…" : idea.lastBuildError}
          </div>
        )}

        <div className="pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          {renderActionRow()}
        </div>
      </div>

      <div
        className="px-5 py-3 flex items-center justify-between text-caption"
        style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-light)" }}
      >
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

function DetailRow({ label, value, clamp = false }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-body">
      <span className="text-caption w-16 flex-shrink-0 mt-0.5">{label}</span>
      <span
        style={
          clamp
            ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--text-secondary)" }
            : { color: "var(--text-secondary)" }
        }
      >
        {value}
      </span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Icon } from "../lib/iconRegistry";

interface BuildNowButtonProps {
  ideaId: Id<"ideas">;
  pipelineStatus: string;
  buildStage?: string;
  variant?: "primary" | "secondary";
  /** When true, render compactly (e.g. on a list IdeaCard). */
  compact?: boolean;
}

export function BuildNowButton({
  ideaId,
  pipelineStatus,
  buildStage,
  variant = "primary",
  compact = false,
}: BuildNowButtonProps) {
  const triggerBuild = useMutation(api.ideas.triggerBuild);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"queued" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stage = buildStage ?? "not_started";
  const eligible =
    pipelineStatus === "approved" &&
    (stage === "not_started" || stage === "failed" || stage === "completed");

  if (!eligible) return null;

  const handleClick = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await triggerBuild({ ideaId });
      setResult("queued");
      // Reset after a few seconds so the user can re-click if needed.
      setTimeout(() => setResult(null), 5000);
    } catch (err) {
      setResult("error");
      setErrorMsg(err instanceof Error ? err.message : "Build trigger failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result === "queued") {
    return (
      <span className="status-dot status-dot--success" aria-live="polite">
        Queued — picking up within ~2 min
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} ${compact ? "px-3 py-1.5 text-xs" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
        aria-label={stage === "failed" ? "Retry build" : "Build now"}
      >
        <Icon name="buildStage.agents_spawning" size={compact ? 14 : 16} />
        <span>{submitting ? "Queueing…" : stage === "failed" ? "Retry build" : "Build now"}</span>
      </button>
      {result === "error" && errorMsg && (
        <span className="status-dot status-dot--error" role="alert">
          {errorMsg}
        </span>
      )}
    </div>
  );
}

/**
 * Header-level "Build all approved" button that fires every approved-and-idle
 * idea in one shot. Renders a confirmation modal first so this isn't a
 * single-click footgun.
 */
export function BuildAllApprovedButton({ approvedCount }: { approvedCount: number }) {
  const triggerBuildAll = useMutation(api.ideas.triggerBuildAll);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{ queued: number; totalApproved: number } | null>(null);

  if (approvedCount === 0) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await triggerBuildAll({});
      setSummary(res as { queued: number; totalApproved: number });
      setTimeout(() => {
        setSummary(null);
        setConfirmOpen(false);
      }, 4000);
    } catch (err) {
      setSummary({ queued: 0, totalApproved: approvedCount });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="btn btn-secondary"
        aria-label={`Build all ${approvedCount} approved ideas`}
      >
        <Icon name="buildStage.agents_spawning" size={16} />
        <span>Build all approved ({approvedCount})</span>
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6 glass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="build-all-title"
        >
          <div className="card card-pad max-w-md w-full">
            <h2 id="build-all-title" className="heading-lg mb-2">Build all approved ideas?</h2>
            <p className="text-body mb-6">
              {summary
                ? `Queued ${summary.queued} of ${summary.totalApproved}. The build-monitor cron picks them up within ~2 minutes.`
                : `${approvedCount} approved ideas will be queued for immediate build at high priority. Already-building ideas are skipped.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setConfirmOpen(false); setSummary(null); }}
                className="btn btn-ghost"
              >
                {summary ? "Close" : "Cancel"}
              </button>
              {!summary && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {submitting ? "Queueing…" : "Build all"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

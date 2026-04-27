"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../lib/iconRegistry";
import { BuildNowButton, BuildAllApprovedButton } from "../components/BuildNowButton";

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list);
  const approveIdea = useMutation(api.ideas.approve);
  const rejectIdea = useMutation(api.ideas.reject);

  const scoutedIdeas = ideas?.filter((idea: any) => idea.pipelineStatus === "scouted" || !idea.pipelineStatus) || [];
  const approvedIdeas = ideas?.filter((idea: any) => idea.pipelineStatus === "approved") || [];
  const approvedIdleCount = approvedIdeas.filter((idea: any) =>
    !idea.buildStage || idea.buildStage === "not_started" || idea.buildStage === "failed"
  ).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="btn btn-ghost" aria-label="Back to home">
                <Icon name="entity.next" size={14} className="rotate-180" />
                <span>Back</span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="icon-tile" aria-hidden>
                  <Icon name="nav.ideas" size={20} />
                </span>
                <div>
                  <h1 className="heading-lg">Idea Inbox</h1>
                  <p className="text-small">Review and approve scouted ideas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Stat label="Scouted" value={scoutedIdeas.length} tone="warning" />
              <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: "1rem" }}>
                <Stat label="Approved" value={approvedIdeas.length} tone="info" />
              </div>
              <BuildAllApprovedButton approvedCount={approvedIdleCount} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-12">
          <h2 className="heading-md mb-4 flex items-center gap-2">
            <Icon name="pipelineStatus.scouted" size={18} />
            Scouted ideas
            <span className="text-caption">({scoutedIdeas.length})</span>
          </h2>

          {scoutedIdeas.length === 0 ? (
            <div className="card card-pad text-center">
              <span className="icon-tile icon-tile--success mx-auto mb-3" aria-hidden>
                <Icon name="entity.celebrate" size={20} />
              </span>
              <h3 className="heading-md mb-1">All caught up</h3>
              <p className="text-body">No scouted ideas to review.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {scoutedIdeas.map((idea: any) => (
                <div key={idea._id} className="card card-pad">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="heading-md mb-2">{idea.title}</h3>
                      <p className="text-body mb-3">{idea.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="status-dot status-dot--accent">
                          {idea.potential} potential
                        </span>
                        {idea.targetAudience && (
                          <span className="status-dot status-dot--muted">{idea.targetAudience}</span>
                        )}
                        {idea.evidence && idea.evidence.length > 0 && (
                          <span className="status-dot status-dot--info">
                            <Icon name="entity.search" size={12} />
                            {idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveIdea({ ideaId: idea._id })}
                        className="btn btn-primary"
                        aria-label="Approve idea"
                      >
                        <Icon name="pipelineStatus.approved" size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectIdea({ ideaId: idea._id })}
                        className="btn btn-secondary"
                        aria-label="Reject idea"
                      >
                        <Icon name="pipelineStatus.rejected" size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="heading-md mb-4 flex items-center gap-2">
            <Icon name="pipelineStatus.approved" size={18} />
            Approved ideas
            <span className="text-caption">({approvedIdeas.length})</span>
          </h2>
          {approvedIdeas.length === 0 ? (
            <div className="card card-pad-sm">
              <p className="text-body">
                Approved ideas appear here. Check the{" "}
                <Link href="/dashboard" className="font-medium underline" style={{ color: "var(--accent-700)" }}>
                  Dashboard
                </Link>{" "}
                to track builds.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {approvedIdeas.map((idea: any) => (
                <div key={idea._id} className="card card-pad">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="heading-md mb-2">{idea.title}</h3>
                      <p className="text-body mb-2">{idea.description}</p>
                      {idea.lastBuildError && (
                        <span className="status-dot status-dot--error">
                          <Icon name="entity.warning" size={12} />
                          {idea.lastBuildError.length > 120
                            ? idea.lastBuildError.substring(0, 120) + "…"
                            : idea.lastBuildError}
                        </span>
                      )}
                    </div>
                    <BuildNowButton
                      ideaId={idea._id}
                      pipelineStatus={idea.pipelineStatus}
                      buildStage={idea.buildStage}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warning" | "info" }) {
  return (
    <div className="text-center px-2">
      <span
        className="heading-lg"
        style={{
          fontSize: "1.5rem",
          color: tone === "warning" ? "var(--warning-600)" : "var(--info-600)",
        }}
      >
        {value}
      </span>
      <span className="text-caption block">{label}</span>
    </div>
  );
}

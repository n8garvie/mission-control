"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../convex/_generated/api";
import { Icon } from "./lib/iconRegistry";

// Pipeline stages — single horizontal flow from idea to deployed product.
// Icons resolve through the registry; status colors come from globals.css tokens.
const pipelineStages = [
  { key: "scouted",             label: "Scouted",   icon: "stage.scouted",                      description: "New ideas awaiting review" },
  { key: "approved",            label: "Approved",  icon: "pipelineStatus.approved",            description: "Ready to build" },
  { key: "agents_spawning",     label: "Spawning",  icon: "buildStage.agents_spawning",         description: "Starting agent sessions" },
  { key: "agents_working",      label: "Building",  icon: "buildStage.agents_working",          description: "Agents coding the product" },
  { key: "building_locally",    label: "Testing",   icon: "buildStage.building_locally",        description: "Local build & verification" },
  { key: "pushing_to_github",   label: "Committing",icon: "buildStage.pushing_to_github",       description: "Pushing to GitHub" },
  { key: "deploying_to_vercel", label: "Deploying", icon: "buildStage.deploying_to_vercel",     description: "Deploying to Vercel" },
  { key: "completed",           label: "Live",      icon: "stage.live",                         description: "Product is live" },
] as const;

export default function Home() {
  const ideas = useQuery(api.ideas.list);
  const stats = useQuery(api.ideas.getStats);

  if (ideas === undefined || stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
        <div className="text-center">
          <div
            className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-4"
            style={{ borderColor: "var(--accent-500)", borderTopColor: "transparent" }}
          />
          <p className="text-body">Loading Mission Control…</p>
        </div>
      </div>
    );
  }

  const stageCounts = pipelineStages.reduce<Record<string, number>>((acc, stage) => {
    if (stage.key === "scouted") {
      acc[stage.key] = ideas.filter((idea: any) => idea.pipelineStatus === "scouted").length;
    } else if (stage.key === "approved") {
      acc[stage.key] = ideas.filter((idea: any) =>
        idea.pipelineStatus === "approved" &&
        (!idea.buildStage || idea.buildStage === "not_started")
      ).length;
    } else {
      acc[stage.key] = ideas.filter((idea: any) => idea.buildStage === stage.key).length;
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="icon-tile" aria-hidden>
                <Icon name="brand.logo" size={20} />
              </span>
              <div>
                <h1 className="heading-md" style={{ fontWeight: 600 }}>Mission Control</h1>
                <p className="text-small hidden sm:block">Pipeline + Dashboard</p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <Link
                href="/ideas"
                className="btn btn-secondary"
                aria-label="Ideas"
              >
                <Icon name="nav.ideas" size={16} />
                <span className="hidden sm:inline">Ideas</span>
              </Link>
              <Link
                href="/pipeline"
                className="btn btn-secondary"
                aria-label="Pipeline"
              >
                <Icon name="nav.pipeline" size={16} />
                <span className="hidden sm:inline">Pipeline</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-8">
          <h2 className="text-caption mb-3">Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {pipelineStages.map((stage, i) => {
              const count = stageCounts[stage.key] || 0;
              const state = count > 0 ? "current" : "upcoming";
              return (
                <div
                  key={stage.key}
                  className="card card-pad-sm"
                  data-state={state}
                  title={stage.description}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="stepper-index">{i + 1}</span>
                    <Icon name={stage.icon} size={14} aria-label={stage.label} />
                  </div>
                  <div className="heading-lg" style={{ fontSize: "1.5rem" }}>{count}</div>
                  <div className="text-small mt-0.5">{stage.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <div className="card card-pad">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="entity.stats" size={18} aria-label="Pipeline summary" />
              <h3 className="heading-md">Pipeline summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryStat label="To review" value={stats?.pipeline?.scouted || 0} tone="muted" />
              <SummaryStat
                label="In progress"
                value={(stats?.pipeline?.approved || 0) + (stats?.dashboard?.inProgress || 0)}
                tone="accent"
              />
              <SummaryStat label="Built" value={stats?.dashboard?.built || 0} tone="info" />
              <SummaryStat label="Live" value={stats?.dashboard?.deployed || 0} tone="success" />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-md">Recent ideas</h2>
            <span className="text-small">{ideas.length} total</span>
          </div>

          <div className="space-y-3">
            {ideas.slice(0, 10).map((idea: any) => (
              <div key={idea._id} className="card card-pad-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {idea.title}
                      </h3>
                      <RecentStatusChip idea={idea} />
                    </div>
                    <p className="text-small truncate">{idea.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {idea.deployedUrl && (
                      <a
                        href={idea.deployedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="status-dot status-dot--success"
                        aria-label={`View live site for ${idea.title}`}
                      >
                        <Icon name="stage.live" size={14} />
                        Live
                      </a>
                    )}
                    {idea.githubRepoUrl && !idea.deployedUrl && (
                      <a
                        href={idea.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="status-dot status-dot--accent"
                        aria-label={`View GitHub repo for ${idea.title}`}
                      >
                        <Icon name="buildStage.pushing_to_github" size={14} />
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {ideas.length === 0 && (
            <div className="card card-pad text-center">
              <div className="icon-tile mx-auto mb-3" aria-hidden>
                <Icon name="stage.scouted" size={20} />
              </div>
              <h3 className="heading-md mb-1">No ideas yet</h3>
              <p className="text-body">Scout will discover ideas overnight.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "muted" | "accent" | "info" | "success" }) {
  const toneClass = `icon-tile icon-tile--sm icon-tile--${tone === "accent" ? "" : tone}`.trim();
  return (
    <div className="text-center" style={{ background: "var(--bg-secondary)", borderRadius: "0.625rem", padding: "1rem" }}>
      <div className="heading-lg" style={{ fontSize: "1.875rem" }}>{value}</div>
      <div className="text-small mt-1">{label}</div>
    </div>
  );
}

function RecentStatusChip({ idea }: { idea: any }) {
  if (idea.pipelineStatus === "scouted") {
    return (
      <span className="status-dot status-dot--warning" style={{ flexShrink: 0 }}>
        Scouted
      </span>
    );
  }
  if (idea.buildStage && idea.buildStage !== "not_started") {
    return (
      <span className="status-dot status-dot--accent" style={{ flexShrink: 0 }}>
        {idea.buildStage.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className="status-dot status-dot--info" style={{ flexShrink: 0 }}>
      Approved
    </span>
  );
}

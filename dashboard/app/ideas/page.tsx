"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import IdeaCard from "../components/IdeaCard";
import Link from "next/link";

const statusTabs = [
  { id: "pending", label: "Pending Review", icon: "⏳" },
  { id: "approved", label: "Approved", icon: "✅" },
  { id: "building", label: "Building", icon: "🔨" },
  { id: "done", label: "Deployed", icon: "🚀" },
  { id: "all", label: "All Ideas", icon: "💡" },
];

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list);
  const stats = useQuery(api.ideas.getStats);

  if (ideas === undefined || stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-center">
          <div className="skeleton w-16 h-16 rounded-lg mx-auto mb-4"></div>
          <div className="skeleton w-48 h-4 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  // Group ideas by status
  const ideasByStatus = {
    pending: ideas.filter((i) => i.status === "pending"),
    approved: ideas.filter((i) => i.status === "approved"),
    building: ideas.filter((i) => i.status === "building"),
    done: ideas.filter((i) => i.status === "done"),
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Back
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-lg">
                  💡
                </div>
                <div>
                  <h1 className="heading-lg">Idea Pipeline</h1>
                  <p className="text-small">Nightly ideas from Scout</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</span>
                  <span className="text-caption block">Total</span>
                </div>
                <div className="w-px h-8 bg-[var(--border-light)]"></div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-amber-600">{stats.pending}</span>
                  <span className="text-caption block">Pending</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-blue-600">{stats.approved}</span>
                  <span className="text-caption block">Approved</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-purple-600">{stats.building}</span>
                  <span className="text-caption block">Building</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-600">{stats.done}</span>
                  <span className="text-caption block">Done</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Status Sections */}
        <div className="space-y-10">
          {/* Pending Review */}
          {ideasByStatus.pending.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">⏳</span>
                <h2 className="heading-md">Pending Review</h2>
                <span className="text-small bg-gray-100 px-2 py-0.5 rounded-full">
                  {ideasByStatus.pending.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ideasByStatus.pending.map((idea) => (
                  <IdeaCard key={idea._id} idea={idea} />
                ))}
              </div>
            </section>
          )}

          {/* Approved */}
          {ideasByStatus.approved.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">✅</span>
                <h2 className="heading-md">Approved</h2>
                <span className="text-small bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {ideasByStatus.approved.length}
                </span>
                <span className="text-caption ml-2">
                  Will be picked up by overnight build at 10 PM PST
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ideasByStatus.approved.map((idea) => (
                  <IdeaCard key={idea._id} idea={idea} />
                ))}
              </div>
            </section>
          )}

          {/* Building */}
          {ideasByStatus.building.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">🔨</span>
                <h2 className="heading-md">Building</h2>
                <span className="text-small bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {ideasByStatus.building.length}
                </span>
                <span className="text-caption ml-2">
                  Forge, Pixel, and Echo are on it
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ideasByStatus.building.map((idea) => (
                  <IdeaCard key={idea._id} idea={idea} />
                ))}
              </div>
            </section>
          )}

          {/* Deployed */}
          {ideasByStatus.done.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">🚀</span>
                <h2 className="heading-md">Deployed</h2>
                <span className="text-small bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {ideasByStatus.done.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ideasByStatus.done.map((idea) => (
                  <IdeaCard key={idea._id} idea={idea} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {ideas.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔭</div>
              <h3 className="heading-lg mb-2">No Ideas Yet</h3>
              <p className="text-body max-w-md mx-auto mb-6">
                Scout hasn&apos;t run its first research sprint yet. Ideas will appear here daily at 6 PM PST.
              </p>
              <div className="text-small text-[var(--text-muted)]">
                Scout monitors Reddit (r/SideProject, r/webdev, r/entrepreneur, r/watches, r/espresso, r/Porsche) and Product Hunt.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

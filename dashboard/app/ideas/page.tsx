"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

import { Id } from "../../convex/_generated/dataModel";

interface Idea {
  _id: Id<"ideas">;
  title: string;
  description: string;
  targetAudience: string;
  mvpScope: string;
  potential: "low" | "medium" | "high" | "moonshot";
  status: "pending" | "approved" | "building" | "done";
  createdAt: number;
  source?: string;
  tags?: string[];
}

const potentialColors = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-purple-100 text-purple-600",
  moonshot: "bg-amber-100 text-amber-600",
};

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list);
  const approveIdea = useMutation(api.ideas.approve);
  const removeIdea = useMutation(api.ideas.remove);
  const [approving, setApproving] = useState<string | null>(null);

  if (ideas === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const pendingIdeas = ideas.filter((i: Idea) => i.status === "pending");
  const approvedIdeas = ideas.filter((i: Idea) => i.status === "approved");

  const handleApprove = async (ideaId: string) => {
    setApproving(ideaId);
    try {
      await approveIdea({ ideaId });
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setApproving(null);
    }
  };

  const handleDelete = async (ideaId: string) => {
    if (!confirm("Delete this idea?")) return;
    try {
      await removeIdea({ ideaId, reason: "User deleted" });
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to Pipeline
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-lg">
                  💡
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Idea Inbox</h1>
                  <p className="text-sm text-gray-500">Review and approve ideas for the pipeline</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-4">
                <span className="text-2xl font-bold text-amber-600">{pendingIdeas.length}</span>
                <span className="text-xs text-gray-500 block">Pending</span>
              </div>
              <div className="text-center px-4 border-l border-gray-200">
                <span className="text-2xl font-bold text-blue-600">{approvedIdeas.length}</span>
                <span className="text-xs text-gray-500 block">Approved</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Pending Ideas */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>⏳</span>
            Pending Review
            <span className="text-sm font-normal text-gray-500">({pendingIdeas.length})</span>
          </h2>
          
          {pendingIdeas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500">No pending ideas to review</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingIdeas.map((idea: Idea) => (
                <div key={idea._id} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${potentialColors[idea.potential]}`}>
                          {idea.potential === 'moonshot' ? '🚀 Moonshot' : idea.potential.charAt(0).toUpperCase() + idea.potential.slice(1)}
                        </span>
                        {idea.source && (
                          <span className="text-xs text-gray-400">via {idea.source}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{idea.title}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(idea._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{idea.description}</p>
                  
                  <div className="space-y-1 text-xs text-gray-500 mb-4">
                    <div><span className="font-medium">Target:</span> {idea.targetAudience}</div>
                    <div><span className="font-medium">MVP:</span> {idea.mvpScope.slice(0, 60)}...</div>
                  </div>
                  
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {idea.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleApprove(idea._id)}
                    disabled={approving === idea._id}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {approving === idea._id ? "Approving..." : "✅ Approve for Build"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved Ideas */}
        {approvedIdeas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              Approved for Build
              <span className="text-sm font-normal text-gray-500">({approvedIdeas.length})</span>
            </h2>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
              <p className="text-sm text-blue-700">
                These ideas will be picked up by the overnight build system. 
                Check the <Link href="/" className="font-medium underline">pipeline dashboard</Link> for progress.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedIdeas.map((idea: Idea) => (
                <div key={idea._id} className="bg-white rounded-xl p-5 border border-gray-200 opacity-75">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500">✓</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${potentialColors[idea.potential]}`}>
                      {idea.potential === 'moonshot' ? '🚀 Moonshot' : idea.potential.charAt(0).toUpperCase() + idea.potential.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{idea.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{idea.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

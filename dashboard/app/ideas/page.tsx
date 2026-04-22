"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list);
  const approveIdea = useMutation(api.ideas.approve);
  const rejectIdea = useMutation(api.ideas.reject);
  
  // Filter ideas by pipelineStatus (not status)
  const scoutedIdeas = ideas?.filter((idea: any) => idea.pipelineStatus === 'scouted' || !idea.pipelineStatus) || [];
  const approvedIdeas = ideas?.filter((idea: any) => idea.pipelineStatus === 'approved') || [];

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
                ← Back
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-lg">
                  💡
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Idea Inbox</h1>
                  <p className="text-sm text-gray-500">Review and approve ideas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-4">
                <span className="text-2xl font-bold text-amber-600">{scoutedIdeas.length}</span>
                <span className="text-xs text-gray-500 block">Scouted</span>
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
        {/* Scouted Ideas Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔍</span>
            Scouted Ideas
            <span className="text-sm font-normal text-gray-500">({scoutedIdeas.length})</span>
          </h2>
          
          {scoutedIdeas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500">No scouted ideas to review</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {scoutedIdeas.map((idea: any) => (
                <div key={idea._id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{idea.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{idea.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">{idea.potential} potential</span>
                        {idea.targetAudience && (
                          <span className="bg-gray-100 px-2 py-1 rounded">{idea.targetAudience}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => approveIdea({ ideaId: idea._id })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => rejectIdea({ ideaId: idea._id })}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved Ideas Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>✅</span>
            Approved Ideas
            <span className="text-sm font-normal text-gray-500">({approvedIdeas.length})</span>
          </h2>
          {approvedIdeas.length === 0 ? (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-700">
                Approved ideas will appear here. Check the <Link href="/dashboard" className="font-medium underline">Dashboard</Link> to track builds.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {approvedIdeas.map((idea: any) => (
                <div key={idea._id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">{idea.title}</h3>
                  <p className="text-gray-600 text-sm">{idea.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

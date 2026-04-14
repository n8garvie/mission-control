"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

interface TaskModalProps {
  task: any;
  agents: Doc<"agents">[];
  onClose: () => void;
}

export default function TaskModal({ task, agents, onClose }: TaskModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messages = useQuery(api.messages.listByTask, { taskId: task._id });
  const createMessage = useMutation(api.messages.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      // Parse mentions (simple @Name detection)
      const mentionPattern = /@(\w+)/g;
      const matches = [...comment.matchAll(mentionPattern)];
      const mentionedNames = matches.map((m) => m[1].toLowerCase());
      const mentionedAgents = agents
        .filter((a) => mentionedNames.includes(a.name.toLowerCase()))
        .map((a) => a._id);

      await createMessage({
        taskId: task._id,
        content: comment,
        fromHuman: true,
        mentions: mentionedAgents.length > 0 ? mentionedAgents : undefined,
      });

      setComment("");
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    try {
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="heading-xl mb-3">
                {task.title}
              </h2>
              <div className="flex gap-3 items-center">
                <span className={`badge badge-${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className="text-small">
                  Priority: <span className="font-medium capitalize">{task.priority}</span>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Assignees */}
          <div className="flex gap-3 items-center">
            <span className="text-small">Assigned to:</span>
            <div className="flex gap-2">
              {task.assignees && task.assignees.length > 0 ? (
                task.assignees.map((assignee: any) => (
                  <div
                    key={assignee._id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-tertiary)] rounded-md"
                  >
                    <span>{assignee.emoji}</span>
                    <span className="text-small font-medium">{assignee.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-caption">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Body - Description & Comments */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Description */}
          <div className="mb-8">
            <h3 className="heading-md mb-3">Description</h3>
            <p className="text-body">{task.description}</p>
            {task.brief && (
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg">
                <p className="text-body">{task.brief}</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="heading-md mb-4">Comments</h3>
            <div className="space-y-4">
              {messages === undefined ? (
                <div className="text-center py-4">
                  <span className="text-caption">Loading comments...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-4">
                  <span className="text-caption">No comments yet</span>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg._id} className="flex gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg flex-shrink-0 border border-[var(--border-light)]">
                      {msg.fromHuman ? "👤" : msg.fromAgent ? msg.fromAgent.emoji : "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="heading-md text-sm">
                          {msg.fromHuman ? "Nathan" : msg.fromAgent ? msg.fromAgent.name : "System"}
                        </span>
                        <span className="text-caption">
                          {new Date(msg._creationTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-body">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer - Add Comment */}
        <div className="border-t border-[var(--border-light)] p-6 bg-[var(--bg-secondary)]">
          <div className="flex gap-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment... (use @AgentName to mention)"
              className="input flex-1 resize-none"
              rows={3}
            />
            <button
              onClick={handleSubmitComment}
              disabled={isSubmitting || !comment.trim()}
              className="btn btn-primary h-fit self-end"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
          <div className="mt-3 text-caption">
            Tip: Use @Atlas, @Muse, @Pixel, etc. to mention agents
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-[var(--border-light)] p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-small font-medium">Move to:</span>
            {["inbox", "assigned", "in_progress", "review", "done"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={task.status === status}
                  className={`btn btn-secondary text-xs ${
                    task.status === status
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

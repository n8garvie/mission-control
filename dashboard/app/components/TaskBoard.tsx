"use client";

import { useState } from "react";
import { Doc } from "../../convex/_generated/dataModel";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";

interface TaskBoardProps {
  tasks: any[];
  agents: Doc<"agents">[];
}

const columns = [
  { id: "inbox", label: "Inbox", description: "New tasks waiting" },
  { id: "assigned", label: "Assigned", description: "Ready to start" },
  { id: "in_progress", label: "In Progress", description: "Currently working" },
  { id: "review", label: "Review", description: "Pending approval" },
  { id: "done", label: "Done", description: "Completed tasks" },
];

const columnColors: Record<string, string> = {
  inbox: "var(--text-muted)",
  assigned: "var(--info-500)",
  in_progress: "var(--warning-500)",
  review: "var(--accent-500)",
  done: "var(--success-500)",
};

export default function TaskBoard({ tasks, agents }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
        {columns.map((column, index) => {
          const columnTasks = getTasksByStatus(column.id);
          const isHovered = hoveredColumn === column.id;
          const color = columnColors[column.id];
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredColumn(column.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {/* Column Header */}
              <div 
                className="flex items-center justify-between mb-3 px-1 py-2 rounded-lg transition-colors duration-200"
                style={{ backgroundColor: isHovered ? `${color}08` : "transparent" }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-sm text-[var(--text-primary)]">
                    {column.label}
                  </span>
                </div>
                <span 
                  className="text-xs font-semibold px-2 py-0.5 rounded-full transition-colors duration-200"
                  style={{ 
                    backgroundColor: isHovered ? `${color}20` : "var(--bg-tertiary)",
                    color: isHovered ? color : "var(--text-secondary)",
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Description */}
              <p className="text-[10px] text-[var(--text-muted)] mb-3 px-1 -mt-2">
                {column.description}
              </p>

              {/* Column Body */}
              <div 
                className="space-y-3 min-h-[300px] p-2 rounded-xl transition-colors duration-200"
                style={{ backgroundColor: isHovered ? "var(--bg-tertiary)" : "transparent" }}
              >
                {columnTasks.map((task, taskIndex) => (
                  <div 
                    key={task._id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${taskIndex * 50}ms` }}
                  >
                    <TaskCard
                      task={task}
                      agents={agents}
                      onClick={() => setSelectedTask(task)}
                    />
                  </div>
                ))}
                
                {/* Empty State */}
                {columnTasks.length === 0 && (
                  <div className="card p-6 text-center border-dashed border-2 border-[var(--border-light)]">
                    <span className="text-xs text-[var(--text-muted)]">No tasks</span>
                  </div>
                )}
              </div>
              
              {/* Add Task Button (visible on hover) */}
              <button
                className={`w-full mt-2 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 flex items-center justify-center gap-1 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add task
              </button>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          agents={agents}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}

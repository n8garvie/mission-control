"use client";

import { useState } from "react";
import Link from "next/link";

const quickActions = [
  {
    id: "task",
    label: "New Task",
    description: "Create and assign a task",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    href: "/tasks/new",
    color: "var(--accent-500)",
    bgColor: "var(--accent-50)",
  },
  {
    id: "idea",
    label: "Submit Idea",
    description: "Add to the pipeline",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    href: "/ideas/new",
    color: "var(--warning-500)",
    bgColor: "var(--warning-50)",
  },
  {
    id: "message",
    label: "Message Team",
    description: "Contact an agent",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    href: "/messages",
    color: "var(--info-500)",
    bgColor: "var(--info-50)",
  },
  {
    id: "report",
    label: "View Reports",
    description: "Analytics & insights",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: "/analytics",
    color: "var(--success-500)",
    bgColor: "var(--success-50)",
  },
];

export default function QuickActions() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-caption mr-2">Quick actions:</span>
      
      {quickActions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group relative"
          onMouseEnter={() => setHoveredId(action.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[var(--border-light)] rounded-lg transition-all duration-200 hover:shadow-md hover:border-[var(--border-hover)]"
            style={{
              transform: hoveredId === action.id ? "translateY(-2px)" : "translateY(0)",
            }}
          >
            <div
              className="p-1.5 rounded-md transition-colors duration-200"
              style={{
                backgroundColor: action.bgColor,
                color: action.color,
              }}
            >
              {action.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {action.label}
              </span>
              <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                {action.description}
              </span>
            </div>
          </div>
          
          {/* Tooltip for mobile */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--text-primary)] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none sm:hidden whitespace-nowrap"
          >
            {action.description}
          </div>
        </Link>
      ))}
    </div>
  );
}

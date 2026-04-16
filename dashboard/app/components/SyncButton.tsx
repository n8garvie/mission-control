"use client";

import { useState } from "react";

interface SyncButtonProps {
  onSync?: () => void;
  lastSynced?: number;
}

export default function SyncButton({ onSync, lastSynced }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus("idle");

    try {
      // Call the sync API endpoint
      const response = await fetch("/api/sync", { method: "POST" });
      
      if (response.ok) {
        setStatus("success");
        onSync?.();
        // Refresh the page after a brief delay to show new data
        setTimeout(() => window.location.reload(), 500);
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setIsSyncing(false);
      // Reset status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-tertiary)]">
        Last synced: {formatTime(lastSynced)}
      </span>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          status === "success"
            ? "bg-[var(--success-50)] text-[var(--success-600)]"
            : status === "error"
            ? "bg-[var(--danger-50)] text-[var(--danger-600)]"
            : "bg-[var(--accent-50)] text-[var(--accent-600)] hover:bg-[var(--accent-100)]"
        }`}
      >
        {isSyncing ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing...
          </>
        ) : status === "success" ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Synced!
          </>
        ) : status === "error" ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Now
          </>
        )}
      </button>
    </div>
  );
}

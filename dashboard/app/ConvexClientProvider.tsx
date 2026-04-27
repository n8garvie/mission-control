"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      console.error("NEXT_PUBLIC_CONVEX_URL not set");
      return null;
    }
    try {
      return new ConvexReactClient(url);
    } catch (e) {
      console.error("Failed to create Convex client:", e);
      return null;
    }
  }, []);

  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration Error</h2>
          <p className="text-gray-600">Convex URL not configured. Please check your environment variables.</p>
        </div>
      </div>
    );
  }

  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}

"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      console.warn("NEXT_PUBLIC_CONVEX_URL not set");
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
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

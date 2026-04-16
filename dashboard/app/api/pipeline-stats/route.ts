// API route to fetch dashboard statistics from Convex
// This replaces the filesystem-based approach that doesn't work on Vercel

import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch stats from Convex
    const stats = await fetchQuery(api.stats.get, {});
    
    // Handle both old and new stats formats
    const pipeline = 'pipeline' in stats && stats.pipeline ? stats.pipeline : {
      buildsStarted: stats.totalBuilds,
      buildsWithCode: 0,
      buildsCommitted: 0,
      buildsDeployed: 0,
    };
    
    return NextResponse.json({
      sparklines: stats.sparklines,
      lastUpdated: stats.lastUpdated,
      pipeline,
      totals: {
        totalBuilds: stats.totalBuilds,
        totalIdeas: stats.pendingIdeas,
        totalAgents: 8,
      },
    });
  } catch (error) {
    console.error("Failed to fetch stats from Convex:", error);
    
    // Return fallback data if Convex query fails
    return NextResponse.json({
      sparklines: {
        activeAgents: [0, 0, 1, 1, 2, 2, 3, 2],
        openTasks: [5, 6, 7, 8, 8, 9, 10, 5],
        completedThisWeek: [0, 0, 0, 1, 1, 2, 2, 0],
        pendingIdeas: [2, 3, 4, 5, 6, 8, 10, 11],
      },
      pipeline: {
        buildsStarted: 0,
        buildsWithCode: 0,
        buildsCommitted: 0,
        buildsDeployed: 0,
      },
      totals: {
        totalBuilds: 0,
        totalIdeas: 11,
        totalAgents: 8,
      },
      error: "Failed to fetch from Convex",
    }, { status: 200 });
  }
}

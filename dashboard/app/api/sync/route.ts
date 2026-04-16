// API route to trigger manual sync from local machine to Convex
// This allows instant dashboard updates without waiting for cron

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Run the sync script
    const result = execSync(
      "node scripts/sync.js",
      {
        cwd: "/home/n8garvie/.openclaw/workspace/mission-control/dashboard",
        encoding: "utf-8",
        timeout: 30000,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Sync triggered successfully",
      output: result.trim(),
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Sync failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

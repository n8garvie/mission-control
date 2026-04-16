// API route to fetch build deployment status directly from filesystem
// This provides real deployment data without needing Convex sync

import { NextRequest, NextResponse } from "next/server";
import { getAllBuildDeployments, getDeploymentStats } from "../../lib/build-deployments";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const buildId = searchParams.get("buildId");

    if (buildId) {
      // Return specific build info
      const { getBuildDeploymentInfo } = await import("../../lib/build-deployments");
      const info = getBuildDeploymentInfo(buildId);
      return NextResponse.json(info);
    } else {
      // Return all deployments and stats
      const deployments = getAllBuildDeployments();
      const stats = getDeploymentStats();
      
      return NextResponse.json({
        deployments,
        stats,
      });
    }
  } catch (error) {
    console.error("Failed to fetch build deployments:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch build deployments",
        deployments: [],
        stats: {
          total: 0,
          vercelDeployed: 0,
          githubOnly: 0,
          inProgress: 0,
          notStarted: 0,
        },
      },
      { status: 500 }
    );
  }
}

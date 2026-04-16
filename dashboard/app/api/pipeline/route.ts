// API route for unified pipeline data
import { NextRequest, NextResponse } from "next/server";
import { getPipelineFromBuilds, getPipelineStats } from "../../lib/pipeline";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const pipeline = getPipelineFromBuilds();
    const stats = getPipelineStats();
    
    return NextResponse.json({
      pipeline,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline:", error);
    return NextResponse.json(
      {
        pipeline: [],
        stats: {
          total: 0,
          pending: 0,
          approved: 0,
          building: 0,
          agentComplete: 0,
          githubPushed: 0,
          vercelDeployed: 0,
        },
      },
      { status: 500 }
    );
  }
}

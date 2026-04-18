import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json();
    // TODO: Implement actual approval logic with Convex
    return NextResponse.json({ success: true, ideaId });
  } catch (error) {
    console.error("Error approving idea:", error);
    return NextResponse.json({ error: "Failed to approve idea" }, { status: 500 });
  }
}

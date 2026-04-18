import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json();
    // TODO: Implement actual deletion logic with Convex
    return NextResponse.json({ success: true, ideaId });
  } catch (error) {
    console.error("Error deleting idea:", error);
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}

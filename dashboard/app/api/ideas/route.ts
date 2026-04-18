import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // For now, return empty array to prevent errors
    // In production, this should fetch from Convex
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching ideas:", error);
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

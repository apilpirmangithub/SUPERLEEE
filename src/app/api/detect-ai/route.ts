import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ error: "AI detection endpoint disabled" }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: "AI detection endpoint disabled" }, { status: 404 });
}

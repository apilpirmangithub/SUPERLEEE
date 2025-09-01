export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const target = process.env.NEXT_PUBLIC_STORY_RPC || "https://aeneid.storyrpc.io";
    const body = await req.text();
    const r = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32000, message: e?.message || "relay-failed" } }, { status: 200 });
  }
}

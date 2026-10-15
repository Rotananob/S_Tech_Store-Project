import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://stech-backend-xz6j.onrender.com";

export async function GET() {
  const startedAt = Date.now();
  try {
    const res = await fetch(`${BACKEND_URL}/api/store-status`, {
      method: "GET",
      headers: { "User-Agent": "STech-KeepAlive-Sentinel/2.0" },
      cache: "no-store",
    });

    const elapsed = Date.now() - startedAt;
    return NextResponse.json({
      ok: true,
      awake: res.ok,
      status: res.status,
      latency_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const elapsed = Date.now() - startedAt;
    return NextResponse.json(
      {
        ok: false,
        awake: false,
        error: error?.message || "Render is currently waking up",
        latency_ms: elapsed,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

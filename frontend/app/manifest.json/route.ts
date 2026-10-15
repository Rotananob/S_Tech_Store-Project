import { NextResponse } from 'next/server';
import manifestData from '../manifest';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  const manifest = manifestData();
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}

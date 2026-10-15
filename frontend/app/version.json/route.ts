import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'version.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({
    version: "1.1.0",
    build: "20261013.02",
    releaseName: "S Tech Store Official Release v1.1.0",
  });
}

import path from 'node:path';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';

// ----------------------------------------------------------------------

const THAILAND_PROVINCES_GEOJSON_FILE = path.join(
  process.cwd(),
  'public/assets/maps/thailand-provinces.geojson'
);

export const revalidate = 86400;
export const runtime = 'nodejs';

export async function GET() {
  try {
    const geoJson = await readFile(THAILAND_PROVINCES_GEOJSON_FILE, 'utf8');

    return new NextResponse(geoJson, {
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Failed to load Thailand provinces GeoJSON' },
      { status: 500 }
    );
  }
}

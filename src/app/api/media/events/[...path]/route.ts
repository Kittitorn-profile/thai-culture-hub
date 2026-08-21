import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { eventMediaStorageMarker } from 'src/server/event-media-url';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).replace(/\/$/, '');

  if (!supabaseUrl || !path?.length || path.some((part) => !part || part === '..')) {
    return NextResponse.json({ message: 'Invalid event image path' }, { status: 400 });
  }

  const objectPath = path.map((part) => encodeURIComponent(part)).join('/');
  const response = await fetch(`${supabaseUrl}${eventMediaStorageMarker}${objectPath}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ message: 'Event image not found' }, { status: 404 });
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}

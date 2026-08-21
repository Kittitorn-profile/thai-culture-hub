import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const PAGE_VIEW_TABLE = 'visitor_page_views';
const EVENT_TABLE = 'visitor_events';
const MAX_EVENTS = 20;

function cleanEventIds(value: string | null) {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.length <= 160)
        .slice(0, MAX_EVENTS)
    )
  );
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const eventIds = cleanEventIds(request.nextUrl.searchParams.get('eventIds'));

  if (eventIds.length === 0) return NextResponse.json({ data: {} });

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const entries = await Promise.all(
    eventIds.map(async (eventId) => {
      const path = `/events/${encodeURIComponent(eventId)}`;
      const [viewsResult, sharesResult] = await Promise.all([
        supabase.client
          .from(PAGE_VIEW_TABLE)
          .select('id', { count: 'exact', head: true })
          .in('path', [path, `${path}/`]),
        supabase.client
          .from(EVENT_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'event_share')
          .eq('event_name', eventId),
      ]);

      return [
        eventId,
        {
          views: viewsResult.error ? 0 : (viewsResult.count ?? 0),
          shares: sharesResult.error ? 0 : (sharesResult.count ?? 0),
        },
      ] as const;
    })
  );

  return NextResponse.json({ data: Object.fromEntries(entries) });
}

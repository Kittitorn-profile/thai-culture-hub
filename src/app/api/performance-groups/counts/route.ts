import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const PAGE_VIEW_TABLE = 'visitor_page_views';
const EVENT_TABLE = 'visitor_events';
const MAX_GROUPS = 20;

function cleanGroupIds(value: string | null) {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.length <= 160)
        .slice(0, MAX_GROUPS)
    )
  );
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const groupIds = cleanGroupIds(request.nextUrl.searchParams.get('groupIds'));

  if (groupIds.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const entries = await Promise.all(
    groupIds.map(async (groupId) => {
      const path = `/performance-groups/${encodeURIComponent(groupId)}`;
      // Escape LIKE metacharacters in encoded IDs (including percent-encoded Thai names).
      const queryPath = `${path.replace(/[\\%_]/g, '\\$&')}?%`;
      const [viewsResult, sharesResult] = await Promise.all([
        supabase.client
          .from(PAGE_VIEW_TABLE)
          .select('id', { count: 'exact', head: true })
          .or(`path.eq.${JSON.stringify(path)},path.like.${JSON.stringify(queryPath)}`),
        supabase.client
          .from(EVENT_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'performance_group_share')
          .eq('event_name', groupId),
      ]);

      if (viewsResult.error || sharesResult.error) {
        throw new Error('Unable to load performance group counts');
      }

      return [
        groupId,
        {
          views: viewsResult.error ? 0 : (viewsResult.count ?? 0),
          shares: sharesResult.error ? 0 : (sharesResult.count ?? 0),
        },
      ] as const;
    })
  ).catch(() => null);

  if (!entries) {
    return NextResponse.json(
      { message: 'Unable to load performance group counts' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: Object.fromEntries(entries) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

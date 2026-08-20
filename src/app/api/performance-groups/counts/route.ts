import type { NextRequest} from 'next/server';

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
      const [viewsResult, sharesResult] = await Promise.all([
        supabase.client
          .from(PAGE_VIEW_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('path', path),
        supabase.client
          .from(EVENT_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'performance_group_share')
          .eq('event_name', groupId),
      ]);

      return [
        groupId,
        {
          views: viewsResult.error ? 0 : viewsResult.count ?? 0,
          shares: sharesResult.error ? 0 : sharesResult.count ?? 0,
        },
      ] as const;
    })
  );

  return NextResponse.json({ data: Object.fromEntries(entries) });
}

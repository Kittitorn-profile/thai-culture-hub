import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const PAGE_VIEW_TABLE_NAME = 'visitor_page_views';
const EVENT_TABLE_NAME = 'visitor_events';

type PageViewRow = {
  visitor_id: string | null;
  session_id: string | null;
};

type EventRow = {
  event_type: string | null;
  event_name: string | null;
  visitor_id: string | null;
  metadata: Record<string, any> | null;
};

function getStringMetadata(metadata: Record<string, any> | null, key: string) {
  const value = metadata?.[key];

  return typeof value === 'string' ? value : '';
}

function summarizeEvents(rows: EventRow[], eventTypes: string[], getName?: (row: EventRow) => string) {
  const eventTypeSet = new Set(eventTypes);
  const itemMap = new Map<string, { count: number; visitors: Set<string> }>();

  rows
    .filter((row) => row.event_type && eventTypeSet.has(row.event_type))
    .forEach((row) => {
      const name = (getName?.(row) || row.event_name || '').trim();

      if (!name) {
        return;
      }

      const item = itemMap.get(name) ?? { count: 0, visitors: new Set<string>() };

      item.count += 1;

      if (row.visitor_id) {
        item.visitors.add(row.visitor_id);
      }

      itemMap.set(name, item);
    });

  return Array.from(itemMap, ([name, value]) => ({
    name,
    count: value.count,
    visitors: value.visitors.size,
  }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const since = new Date();

  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const pageViewsQuery = supabase.client
    .from(PAGE_VIEW_TABLE_NAME)
    .select('visitor_id, session_id')
    .gte('created_at', since.toISOString())
    .limit(50000);
  const eventsQuery = supabase.client
    .from(EVENT_TABLE_NAME)
    .select('event_type, event_name, visitor_id, metadata')
    .gte('created_at', since.toISOString())
    .limit(50000);
  const [{ data: pageViews, error: pageViewsError }, { data: events, error: eventsError }] =
    await Promise.all([pageViewsQuery, eventsQuery]);

  if (pageViewsError) {
    return NextResponse.json({ message: pageViewsError.message }, { status: 500 });
  }

  if (eventsError) {
    return NextResponse.json({ message: eventsError.message }, { status: 500 });
  }

  const pageViewRows = (pageViews ?? []) as PageViewRow[];
  const eventRows = (events ?? []) as EventRow[];
  const visitors = new Set(pageViewRows.map((row) => row.visitor_id).filter(Boolean));
  const sessions = new Set(pageViewRows.map((row) => row.session_id).filter(Boolean));

  return NextResponse.json({
    data: {
      days: 30,
      pageViews: pageViewRows.length,
      visitors: visitors.size,
      sessions: sessions.size,
      topSearches: summarizeEvents(eventRows, ['province_search', 'province_place_search']),
      topProvinces: summarizeEvents(
        eventRows,
        ['province_select', 'province_map_click'],
        (row) => getStringMetadata(row.metadata, 'provinceName') || row.event_name || ''
      ),
      topDistricts: summarizeEvents(
        eventRows,
        ['district_select', 'filter_option_click'],
        (row) => {
          if (
            row.event_type === 'filter_option_click' &&
            getStringMetadata(row.metadata, 'filterType') !== 'district'
          ) {
            return '';
          }

          return getStringMetadata(row.metadata, 'district') || row.event_name || '';
        }
      ),
    },
  });
}

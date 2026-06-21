'use server';

import type { AnalyticsSummary } from './types';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = 'visitor_page_views';
const EVENT_TABLE_NAME = 'visitor_events';

type PageViewRow = {
  path: string | null;
  referrer: string | null;
  visitor_id: string | null;
  session_id: string | null;
  created_at: string | null;
};

type EventRow = {
  event_type: string | null;
  event_name: string | null;
  visitor_id: string | null;
  metadata: Record<string, any> | null;
};

type ActionError = {
  ok: false;
  status: number;
  message: string;
};

type ActionSuccess<T> = {
  ok: true;
  data: T;
};

async function verifyAdminAccess(accessToken: string): Promise<ActionError | null> {
  const result = await verifyAdminAccessToken(accessToken, ADMIN_PERMISSION.analytics);

  if (!result.ok) {
    return { ok: false, status: result.status, message: result.message };
  }

  return null;
}

function getDateKey(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function getEmptyDaily(days: number) {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);

    date.setDate(today.getDate() - (days - index - 1));

    return {
      date: date.toISOString().slice(0, 10),
      pageViews: 0,
      visitors: 0,
      sessions: 0,
    };
  });
}

function normalizeReferrer(referrer: string | null) {
  if (!referrer) {
    return 'Direct';
  }

  try {
    const url = new URL(referrer);

    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer.slice(0, 80);
  }
}

function getStringMetadata(metadata: Record<string, any> | null, key: string) {
  const value = metadata?.[key];

  return typeof value === 'string' ? value : '';
}

function summarizeEvents(rows: EventRow[], eventTypes: string[], getName?: (row: EventRow) => string) {
  const eventTypeSet = new Set(eventTypes);
  const itemMap = new Map<
    string,
    { count: number; visitors: Set<string>; metadata?: Record<string, string | number | boolean | null> }
  >();

  rows
    .filter((row) => row.event_type && eventTypeSet.has(row.event_type))
    .forEach((row) => {
      const name = (getName?.(row) || row.event_name || '').trim();

      if (!name) {
        return;
      }

      const item = itemMap.get(name) ?? {
        count: 0,
        visitors: new Set<string>(),
        metadata: row.metadata ?? undefined,
      };

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
    metadata: value.metadata,
  }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 10);
}

function summarizeRows(rows: PageViewRow[], eventRows: EventRow[], days: number): AnalyticsSummary {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const dailyMap = new Map(
    getEmptyDaily(days).map((point) => [
      point.date,
      {
        ...point,
        visitorIds: new Set<string>(),
        sessionIds: new Set<string>(),
      },
    ])
  );
  const pageMap = new Map<string, { pageViews: number; visitors: Set<string> }>();
  const referrerMap = new Map<string, number>();

  rows.forEach((row) => {
    const visitorId = row.visitor_id ?? '';
    const sessionId = row.session_id ?? '';
    const path = row.path || '/';
    const dateKey = getDateKey(row.created_at);

    if (visitorId) {
      visitors.add(visitorId);
    }

    if (sessionId) {
      sessions.add(sessionId);
    }

    const dailyPoint = dailyMap.get(dateKey);

    if (dailyPoint) {
      dailyPoint.pageViews += 1;

      if (visitorId) {
        dailyPoint.visitorIds.add(visitorId);
      }

      if (sessionId) {
        dailyPoint.sessionIds.add(sessionId);
      }
    }

    const page = pageMap.get(path) ?? { pageViews: 0, visitors: new Set<string>() };

    page.pageViews += 1;

    if (visitorId) {
      page.visitors.add(visitorId);
    }

    pageMap.set(path, page);

    const referrer = normalizeReferrer(row.referrer);

    referrerMap.set(referrer, (referrerMap.get(referrer) ?? 0) + 1);
  });

  return {
    totalPageViews: rows.length,
    uniqueVisitors: visitors.size,
    totalSessions: sessions.size,
    averageViewsPerSession: sessions.size ? rows.length / sessions.size : 0,
    daily: Array.from(dailyMap.values()).map((point) => ({
      date: point.date,
      pageViews: point.pageViews,
      visitors: point.visitorIds.size,
      sessions: point.sessionIds.size,
    })),
    topPages: Array.from(pageMap, ([path, value]) => ({
      path,
      pageViews: value.pageViews,
      visitors: value.visitors.size,
    }))
      .sort((first, second) => second.pageViews - first.pageViews)
      .slice(0, 10),
    referrers: Array.from(referrerMap, ([referrer, pageViews]) => ({ referrer, pageViews }))
      .sort((first, second) => second.pageViews - first.pageViews)
      .slice(0, 8),
    topNavigation: summarizeEvents(eventRows, ['navigation_click']),
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
        if (row.event_type === 'filter_option_click' && getStringMetadata(row.metadata, 'filterType') !== 'district') {
          return '';
        }

        return getStringMetadata(row.metadata, 'district') || row.event_name || '';
      }
    ),
    topFilterOptions: summarizeEvents(eventRows, ['filter_option_click']),
  };
}

export async function getAnalyticsAction(
  accessToken: string,
  days = 30
): Promise<ActionSuccess<AnalyticsSummary> | ActionError> {
  const authError = await verifyAdminAccess(accessToken);

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false, status: 500, message: supabase.error };
  }

  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 90);
  const since = new Date();

  since.setDate(since.getDate() - (safeDays - 1));
  since.setHours(0, 0, 0, 0);

  const pageViewsQuery = supabase.client
    .from(TABLE_NAME)
    .select('path, referrer, visitor_id, session_id, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);
  const eventsQuery = supabase.client
    .from(EVENT_TABLE_NAME)
    .select('event_type, event_name, visitor_id, metadata')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);
  const [{ data, error }, { data: eventData, error: eventError }] = await Promise.all([
    pageViewsQuery,
    eventsQuery,
  ]);

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  if (eventError) {
    return { ok: false, status: 500, message: eventError.message };
  }

  return {
    ok: true,
    data: summarizeRows((data ?? []) as PageViewRow[], (eventData ?? []) as EventRow[], safeDays),
  };
}

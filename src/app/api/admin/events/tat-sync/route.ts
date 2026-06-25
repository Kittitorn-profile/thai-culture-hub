import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { normalizeCalendarDate } from 'src/utils/calendar-date';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = process.env.EVENTS_TABLE ?? 'events';
const TAT_API_BASE_URL = 'https://tatdataapi.io/api/v2';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type TatFetchResult = {
  ok: boolean;
  status: number;
  json: any;
};

type MappedTatEvent = {
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  time_label: string | null;
  province_code: string | null;
  province_name: string | null;
  location: string | null;
  organizer: string;
  media_url: string | null;
  cover_url: string | null;
  media_type: 'image' | 'video';
  sort_order: number;
  is_active: boolean;
  source: 'tat';
  source_event_id: string;
  source_payload: Record<string, unknown>;
  detail_payload: Record<string, unknown>;
  tat_event_id: string;
  tat_name: string;
  tat_slug: string | null;
  tat_status: string | null;
  tat_start_date: string | null;
  tat_end_date: string | null;
  tat_start_time: string | null;
  tat_end_time: string | null;
  tat_location_name: string | null;
  tat_address: string | null;
  tat_province_name: string | null;
  tat_lat: number | null;
  tat_lng: number | null;
  tat_thumbnail_url: string | null;
  tat_image_urls: string[];
  tat_contact: Record<string, unknown>;
  tat_url: string | null;
  synced_at: string;
  updated_at: string;
};

function getTatApiKey() {
  return (process.env.TAT_DATA_API_KEY ?? process.env.NEXT_PRIVATE_TAT_DATA_API_KEY)?.trim();
}

function getLimit(value?: number | string | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
}

function getArray(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.events)) return record.events;
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.result)) return record.result;
  }

  return [];
}

function getRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getText(record: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}`;
    }
  }

  return '';
}

function getNestedText(record: Record<string, any>, paths: string[][]) {
  for (const path of paths) {
    let value: any = record;

    for (const key of path) {
      value = getRecord(value)[key];
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getValueByPath(record: Record<string, any>, path: string[]) {
  let value: any = record;

  for (const key of path) {
    value = getRecord(value)[key];
  }

  return value;
}

function getNestedDate(record: Record<string, any>, paths: string[][]) {
  for (const path of paths) {
    const value = getValueByPath(record, path);
    const date = parseDate(typeof value === 'number' ? `${value}` : value);

    if (date) {
      return date;
    }
  }

  return null;
}

function normalizeText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').trim();
}

function getProvinceByName(name: string) {
  const normalizedName = normalizeText(name).replace(/^จังหวัด/, '');

  return provinces.find((province) => normalizeText(province.name).replace(/^จังหวัด/, '') === normalizedName);
}

function parseDate(value: unknown) {
  const calendarDate = normalizeCalendarDate(value);

  return calendarDate || null;
}

function toNumber(value: unknown) {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getFirstMediaUrl(record: Record<string, any>) {
  const directUrl = getText(record, [
    'coverUrl',
    'cover_url',
    'imageUrl',
    'image_url',
    'thumbnailUrl',
    'thumbnail_url',
    'fullPathUrl',
    'full_path_url',
    'mediaUrl',
    'media_url',
    'pictureUrl',
    'picture_url',
  ]);

  if (directUrl) {
    return directUrl;
  }

  const mediaArrays = ['images', 'image', 'photos', 'pictures', 'thumbnailUrl'];

  for (const key of mediaArrays) {
    const value = record[key];
    const items = Array.isArray(value) ? value : value ? [value] : [];

    for (const item of items) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }

      const itemRecord = getRecord(item);
      const itemUrl = getText(itemRecord, ['url', 'src', 'path', 'fullPathUrl', 'thumbnailUrl']);

      if (itemUrl) {
        return itemUrl;
      }
    }
  }

  return '';
}

function getImageUrls(record: Record<string, any>) {
  const urls = new Set<string>();
  const firstUrl = getFirstMediaUrl(record);

  if (firstUrl) {
    urls.add(firstUrl);
  }

  ['images', 'image', 'photos', 'pictures', 'thumbnailUrl', 'thumbnailUrls'].forEach((key) => {
    const value = record[key];
    const items = Array.isArray(value) ? value : value ? [value] : [];

    items.forEach((item) => {
      if (typeof item === 'string' && item.trim()) {
        urls.add(item.trim());
        return;
      }

      const itemRecord = getRecord(item);
      const itemUrl = getText(itemRecord, ['url', 'src', 'path', 'fullPathUrl', 'thumbnailUrl']);

      if (itemUrl) {
        urls.add(itemUrl);
      }
    });
  });

  return Array.from(urls);
}

function unwrapDetailResponse(value: unknown) {
  const record = getRecord(value);

  if (Array.isArray(record.data)) {
    return getRecord(record.data[0]);
  }

  if (record.data) {
    return getRecord(record.data);
  }

  if (Array.isArray(record.result)) {
    return getRecord(record.result[0]);
  }

  if (record.result) {
    return getRecord(record.result);
  }

  return record;
}

async function tatFetch(pathname: string, params?: Record<string, string | number>) {
  const apiKey = getTatApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: 501,
      json: { message: 'Missing TAT_DATA_API_KEY' },
    } satisfies TatFetchResult;
  }

  const url = new URL(`${TAT_API_BASE_URL}${pathname}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, `${value}`);
  });

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'x-api-key': apiKey,
      'Accept-Language': 'th',
      Accept: 'application/json',
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    json: await response.json().catch(() => ({})),
  } satisfies TatFetchResult;
}

function mapTatEvent(
  listItem: Record<string, any>,
  detailItem: Record<string, any>,
  sortOrder: number,
  syncedAt: string
): MappedTatEvent | null {
  const source = { ...listItem, ...detailItem };
  const sourceEventId = getText(source, [
    'id',
    'eventId',
    'event_id',
    'EVENT_ID',
    'eventID',
    'migrateId',
    'migrate_id',
    'slug',
  ]);
  const title =
    getText(source, ['name', 'title', 'eventName', 'event_name', 'eventTitle', 'event_title', 'displayName']) ||
    getNestedText(source, [
      ['event', 'name'],
      ['event', 'title'],
      ['eventInformation', 'name'],
      ['eventInformation', 'title'],
    ]);
  const startsAt = getNestedDate(source, [
    ['startDate'],
    ['start_date'],
    ['startsAt'],
    ['starts_at'],
    ['eventStartDate'],
    ['event_start_date'],
    ['dateStart'],
    ['date_start'],
    ['period', 'startDate'],
    ['period', 'start_date'],
    ['eventPeriod', 'startDate'],
    ['eventPeriod', 'start_date'],
    ['eventDate', 'startDate'],
    ['eventDate', 'start_date'],
  ]);
  const endsAt = getNestedDate(source, [
    ['endDate'],
    ['end_date'],
    ['endsAt'],
    ['ends_at'],
    ['eventEndDate'],
    ['event_end_date'],
    ['dateEnd'],
    ['date_end'],
    ['period', 'endDate'],
    ['period', 'end_date'],
    ['eventPeriod', 'endDate'],
    ['eventPeriod', 'end_date'],
    ['eventDate', 'endDate'],
    ['eventDate', 'end_date'],
  ]);
  const provinceName =
    getNestedText(source, [
      ['location', 'province', 'name'],
      ['province', 'name'],
      ['address', 'province', 'name'],
    ]) || getText(source, ['provinceName', 'province_name', 'province', 'provinceThaiName']);
  const province = getProvinceByName(provinceName);
  const locationName =
    getNestedText(source, [
      ['location', 'name'],
      ['venue', 'name'],
      ['place', 'name'],
      ['address', 'name'],
    ]) ||
    getText(source, ['locationName', 'location_name', 'venue', 'place', 'address', 'fullAddress', 'full_address']);
  const address = getText(source, ['address', 'fullAddress', 'full_address']);
  const organizer = getText(source, ['organizer', 'organizerName', 'organizer_name', 'ownerName']) || 'ททท.';

  if (!sourceEventId || !title) {
    return null;
  }

  const imageUrls = getImageUrls(source);
  const mediaUrl = imageUrls[0] ?? '';
  const videoUrl = getText(source, ['videoUrl', 'video_url']);
  const startTime =
    getText(source, ['startTime', 'start_time']) ||
    getNestedText(source, [
      ['period', 'startTime'],
      ['eventPeriod', 'startTime'],
    ]);
  const endTime =
    getText(source, ['endTime', 'end_time']) ||
    getNestedText(source, [
      ['period', 'endTime'],
      ['eventPeriod', 'endTime'],
    ]);

  return {
    title,
    description:
      getText(source, ['description', 'introduction', 'detail', 'body', 'shortDescription']) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    time_label:
      getText(source, ['time', 'timeLabel', 'time_label', 'openingHour']) ||
      [startTime, endTime].filter(Boolean).join(' - ') ||
      null,
    province_code: province?.code ?? null,
    province_name: province?.name ?? (provinceName || null),
    location: locationName || address || null,
    organizer,
    media_url: videoUrl || mediaUrl || null,
    cover_url: mediaUrl || null,
    media_type: videoUrl ? 'video' : 'image',
    sort_order: sortOrder,
    is_active: false,
    source: 'tat',
    source_event_id: sourceEventId,
    source_payload: listItem,
    detail_payload: detailItem,
    tat_event_id: sourceEventId,
    tat_name: title,
    tat_slug: getText(source, ['slug']) || null,
    tat_status: getText(source, ['status']) || null,
    tat_start_date: startsAt,
    tat_end_date: endsAt,
    tat_start_time: startTime || null,
    tat_end_time: endTime || null,
    tat_location_name: locationName || null,
    tat_address: address || null,
    tat_province_name: provinceName || null,
    tat_lat: toNumber(getText(source, ['latitude', 'lat']) || getNestedText(source, [['location', 'latitude'], ['location', 'lat']])),
    tat_lng: toNumber(getText(source, ['longitude', 'lng', 'lon']) || getNestedText(source, [['location', 'longitude'], ['location', 'lng'], ['location', 'lon']])),
    tat_thumbnail_url: mediaUrl || null,
    tat_image_urls: imageUrls,
    tat_contact: getRecord(source.contact ?? source.contacts ?? source.contactInfo),
    tat_url: getText(source, ['url', 'sourceUrl', 'source_url', 'fullPathUrl']) || null,
    synced_at: syncedAt,
    updated_at: syncedAt,
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    page?: number;
  };
  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const page = Math.max(Number(body.page ?? request.nextUrl.searchParams.get('page') ?? 1), 1);
  const listResponse = await tatFetch('/events', { limit, page });

  if (!listResponse.ok) {
    return NextResponse.json(
      {
        message: listResponse.json?.message ?? 'Sync TAT events ไม่สำเร็จ',
        status: listResponse.status,
      },
      { status: listResponse.status === 501 ? 501 : 502 }
    );
  }

  const syncedAt = new Date().toISOString();
  const listItems = getArray(listResponse.json);
  const rows: MappedTatEvent[] = [];
  const skipped: string[] = [];

  for (let index = 0; index < listItems.length; index += 1) {
    const listItem = getRecord(listItems[index]);
    const eventId = getText(listItem, ['id', 'eventId', 'event_id', 'EVENT_ID', 'migrateId', 'migrate_id']);
    let detailItem: Record<string, any> = {};

    if (eventId) {
      const detailResponse = await tatFetch(`/events/${encodeURIComponent(eventId)}`);

      if (detailResponse.ok) {
        detailItem = unwrapDetailResponse(detailResponse.json);
      }
    }

    const row = mapTatEvent(listItem, detailItem, index, syncedAt);

    if (row) {
      rows.push(row);
    } else {
      skipped.push(eventId || `index-${index}`);
    }
  }

  if (!rows.length) {
    return NextResponse.json({
      data: [],
      total: listItems.length,
      upserted: 0,
      skipped,
      message: 'ไม่พบรายการ TAT events ที่ mapping เข้า events ได้',
    });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const sourceEventIds = rows.map((row) => row.source_event_id);
  const { data: existingRows, error: existingError } = await supabase.client
    .from(TABLE_NAME)
    .select('source_event_id, is_active')
    .eq('source', 'tat')
    .in('source_event_id', sourceEventIds);

  if (existingError) {
    return NextResponse.json({ message: existingError.message }, { status: 500 });
  }

  const activeStateBySourceId = new Map(
    ((existingRows ?? []) as Array<{ source_event_id: string | null; is_active: boolean | null }>)
      .filter((row) => row.source_event_id)
      .map((row) => [row.source_event_id as string, row.is_active ?? false])
  );
  const rowsWithPreservedActiveState = rows.map((row) => ({
    ...row,
    is_active: activeStateBySourceId.get(row.source_event_id) ?? false,
  }));

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .upsert(rowsWithPreservedActiveState, { onConflict: 'source,source_event_id' })
    .select('id, source_event_id');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: listItems.length,
    upserted: rows.length,
    skipped,
    message: `Sync TAT events สำเร็จ ${rows.length.toLocaleString('th-TH')} รายการ`,
  });
}

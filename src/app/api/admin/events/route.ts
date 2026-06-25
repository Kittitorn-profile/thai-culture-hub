import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { normalizeCalendarDate } from 'src/utils/calendar-date';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = process.env.EVENTS_TABLE ?? 'events';

type EventPayload = {
  id?: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  time?: string;
  provinceCode?: string;
  location?: string;
  organizer?: string;
  mediaUrl?: string;
  coverUrl?: string;
  mediaType?: 'image' | 'video';
  sourceLabel?: string;
  sourceUrl?: string;
  isFeatured?: boolean;
  sortOrder?: number | string;
  isActive?: boolean;
  source?: string;
  sourceEventId?: string;
  sourcePayload?: Record<string, unknown>;
  detailPayload?: Record<string, unknown>;
  syncedAt?: string;
};

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  time_label?: string | null;
  province_code?: string | null;
  province_name?: string | null;
  location?: string | null;
  organizer?: string | null;
  media_url?: string | null;
  cover_url?: string | null;
  media_type?: 'image' | 'video' | null;
  source_label?: string | null;
  source_url?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  source?: string | null;
  source_event_id?: string | null;
  source_payload?: Record<string, unknown> | null;
  detail_payload?: Record<string, unknown> | null;
  tat_event_id?: string | null;
  tat_name?: string | null;
  tat_slug?: string | null;
  tat_status?: string | null;
  tat_start_date?: string | null;
  tat_end_date?: string | null;
  tat_start_time?: string | null;
  tat_end_time?: string | null;
  tat_location_name?: string | null;
  tat_address?: string | null;
  tat_province_name?: string | null;
  tat_lat?: number | null;
  tat_lng?: number | null;
  tat_thumbnail_url?: string | null;
  tat_image_urls?: string[] | null;
  tat_contact?: Record<string, unknown> | null;
  tat_url?: string | null;
  synced_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalCalendarDate(value: unknown) {
  const calendarDate = normalizeCalendarDate(value);

  return calendarDate || null;
}

function optionalTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toEventItem(row: EventRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    startsAt: row.starts_at ?? '',
    endsAt: row.ends_at ?? '',
    time: row.time_label ?? '',
    provinceCode: row.province_code ?? '',
    provinceName: row.province_name ?? '',
    location: row.location ?? '',
    organizer: row.organizer ?? '',
    mediaUrl: row.media_url ?? '',
    coverUrl: row.cover_url ?? '',
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    sourceLabel: row.source_label ?? '',
    sourceUrl: row.source_url ?? row.tat_url ?? '',
    isFeatured: row.is_featured ?? false,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    source: row.source ?? 'manual',
    sourceEventId: row.source_event_id ?? '',
    sourcePayload: row.source_payload ?? {},
    detailPayload: row.detail_payload ?? {},
    tatEventId: row.tat_event_id ?? '',
    tatName: row.tat_name ?? '',
    tatSlug: row.tat_slug ?? '',
    tatStatus: row.tat_status ?? '',
    tatStartDate: row.tat_start_date ?? '',
    tatEndDate: row.tat_end_date ?? '',
    tatStartTime: row.tat_start_time ?? '',
    tatEndTime: row.tat_end_time ?? '',
    tatLocationName: row.tat_location_name ?? '',
    tatAddress: row.tat_address ?? '',
    tatProvinceName: row.tat_province_name ?? '',
    tatLat: row.tat_lat ?? null,
    tatLng: row.tat_lng ?? null,
    tatThumbnailUrl: row.tat_thumbnail_url ?? '',
    tatImageUrls: row.tat_image_urls ?? [],
    tatContact: row.tat_contact ?? {},
    tatUrl: row.tat_url ?? '',
    syncedAt: row.synced_at ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function toRow(body: EventPayload) {
  const title = optionalText(body.title);
  const startsAt = optionalCalendarDate(body.startsAt);
  const provinceCode = optionalText(body.provinceCode);
  const location = optionalText(body.location);
  const organizer = optionalText(body.organizer);
  const isFeatured = body.isFeatured ?? false;

  if (!title) {
    return { ok: false as const, message: 'title is required' };
  }

  if (!isFeatured && !startsAt) {
    return { ok: false as const, message: 'startsAt is required' };
  }

  const province = provinces.find((item) => item.code === provinceCode);

  if (!isFeatured && !province) {
    return { ok: false as const, message: 'provinceCode is required' };
  }

  const sortOrder = Number(body.sortOrder);

  return {
    ok: true as const,
    row: {
      title,
      description: optionalText(body.description),
      starts_at: startsAt,
      ends_at: optionalCalendarDate(body.endsAt),
      time_label: optionalText(body.time),
      province_code: province?.code ?? null,
      province_name: province?.name ?? null,
      location,
      organizer,
      media_url: optionalText(body.mediaUrl),
      cover_url: optionalText(body.coverUrl),
      media_type: body.mediaType === 'video' ? 'video' : 'image',
      source_label: optionalText(body.sourceLabel),
      source_url: optionalText(body.sourceUrl),
      is_featured: isFeatured,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: body.isActive ?? true,
      source: optionalText(body.source) ?? 'manual',
      source_event_id: optionalText(body.sourceEventId),
      source_payload: body.sourcePayload ?? {},
      detail_payload: body.detailPayload ?? {},
      synced_at: optionalTimestamp(body.syncedAt),
      updated_at: new Date().toISOString(),
    },
  };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error, data: [] }, { status: 500 });
  }

  const eventId = request.nextUrl.searchParams.get('id');
  let query = supabase.client.from(TABLE_NAME).select('*');

  if (eventId) {
    query = query.eq('id', eventId);
  }

  const { data, error } = await query
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message, data: [] }, { status: 500 });
  }

  const items = ((data ?? []) as EventRow[]).map(toEventItem);

  return NextResponse.json(eventId ? { data: items[0] ?? null } : { data: items });
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    isActive?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 });
  }

  if (typeof body.isActive !== 'boolean') {
    return NextResponse.json({ message: 'isActive boolean is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .update({
      is_active: body.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: toEventItem(data as EventRow) });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as EventPayload;
  const parsed = toRow(body);

  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const query = body.id
    ? supabase.client.from(TABLE_NAME).update(parsed.row).eq('id', body.id)
    : supabase.client.from(TABLE_NAME).insert(parsed.row);

  const { data, error } = await query.select('*').single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: toEventItem(data as EventRow) });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { items?: EventPayload[] };

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ message: 'items array is required' }, { status: 400 });
  }

  const parsedItems = body.items.map((item, index) => {
    const parsed = toRow({ ...item, sortOrder: item.sortOrder ?? index });

    return { item, parsed };
  });
  const invalidItem = parsedItems.find(({ parsed }) => !parsed.ok);

  if (invalidItem && !invalidItem.parsed.ok) {
    return NextResponse.json({ message: invalidItem.parsed.message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  if (parsedItems.length === 0) {
    const { error: deleteError } = await supabase.client
      .from(TABLE_NAME)
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      return NextResponse.json({ message: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ data: [] });
  }

  const rows = parsedItems.map(({ item, parsed }, index) => ({
    ...('row' in parsed ? parsed.row : {}),
    ...(item.id ? { id: item.id } : {}),
    sort_order: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
  }));

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .upsert(rows, { onConflict: 'id' })
    .select('*');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const nextIds = ((data ?? []) as EventRow[]).map((row) => row.id).filter(Boolean);

  if (nextIds.length > 0) {
    const { error: deleteError } = await supabase.client
      .from(TABLE_NAME)
      .delete()
      .not('id', 'in', `(${nextIds.join(',')})`);

    if (deleteError) {
      return NextResponse.json({ message: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data: ((data ?? []) as EventRow[]).map(toEventItem) });
}

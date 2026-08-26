import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getTodayCalendarDate } from 'src/utils/calendar-date';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { toEventMediaProxyUrl } from 'src/server/event-media-url';

import { DEFAULT_CONTEST_RESULT_OPTIONS } from 'src/sections/events/event-contest-options';

const TABLE_NAME = process.env.EVENTS_TABLE ?? 'events';

type EventRow = {
  id: string;
  slug?: string | null;
  tat_slug?: string | null;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  time_label?: string | null;
  province_code?: string | null;
  province_name?: string | null;
  location?: string | null;
  organizer?: string | null;
  organizer_logo_url?: string | null;
  related_agency_logo_urls?: string[] | null;
  media_url?: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
  image_urls?: string[] | null;
  background_color?: string | null;
  media_type?: 'image' | 'video' | null;
  source_label?: string | null;
  source_url?: string | null;
  note?: string | null;
  tat_url?: string | null;
  is_featured?: boolean | null;
  is_contest?: boolean | null;
  contest_categories?: Array<{ id: string; name: string; maxParticipants?: number }> | null;
  contest_result_options?: Array<{ id: string; name: string }> | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function toPlainText(value?: string | null) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMediaUrl(value?: string | null) {
  return toEventMediaProxyUrl(value);
}

function toEventItem(row: EventRow) {
  return {
    id: row.id,
    slug: row.slug ?? '',
    tatSlug: row.tat_slug ?? '',
    title: row.title,
    description: toPlainText(row.description),
    descriptionHtml: row.description ?? '',
    startsAt: row.starts_at ?? '',
    endsAt: row.ends_at ?? '',
    time: row.time_label ?? '',
    provinceCode: row.province_code ?? '',
    provinceName: row.province_name ?? '',
    location: row.location ?? '',
    organizer: row.organizer ?? '',
    organizerLogoUrl: normalizeMediaUrl(row.organizer_logo_url),
    relatedAgencyLogoUrls: (row.related_agency_logo_urls ?? []).map(normalizeMediaUrl),
    mediaUrl: normalizeMediaUrl(row.media_url),
    coverUrl: normalizeMediaUrl(row.cover_url),
    logoUrl: normalizeMediaUrl(row.logo_url),
    imageUrls: (row.image_urls ?? []).map(normalizeMediaUrl),
    backgroundColor: row.background_color ?? '#6f8790',
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    sourceLabel: row.source_label ?? '',
    sourceUrl: row.source_url ?? row.tat_url ?? '',
    note: row.note ?? '',
    isFeatured: row.is_featured ?? false,
    isContest: row.is_contest ?? false,
    contestCategories: (row.contest_categories ?? []).map((category) => ({
      ...category,
      maxParticipants: Number(category.maxParticipants) || 0,
    })),
    contestResultOptions:
      row.is_contest && !row.contest_result_options?.length
        ? DEFAULT_CONTEST_RESULT_OPTIONS.map((option) => ({ ...option }))
        : (row.contest_result_options ?? []),
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error }, { status: 200 });
  }

  const today = getTodayCalendarDate();
  const eventId = request.nextUrl.searchParams.get('id')?.trim();

  if (eventId) {
    const { data, error } = await supabase.client
      .from(TABLE_NAME)
      .select('*')
      .eq('id', eventId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ data: null, message: error.message }, { status: 200 });
    }

    return NextResponse.json({ data: data ? toEventItem(data as EventRow) : null });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('*')
    .eq('is_active', true)
    .or(`is_featured.eq.true,starts_at.gte.${today},ends_at.gte.${today}`)
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(12);

  if (error) {
    return NextResponse.json({ data: [], message: error.message }, { status: 200 });
  }

  return NextResponse.json({ data: ((data ?? []) as EventRow[]).map(toEventItem) });
}

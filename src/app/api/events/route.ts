import { NextResponse } from 'next/server';

import { getTodayCalendarDate } from 'src/utils/calendar-date';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = process.env.EVENTS_TABLE ?? 'events';

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
  tat_url?: string | null;
  is_featured?: boolean | null;
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

function toEventItem(row: EventRow) {
  return {
    id: row.id,
    title: row.title,
    description: toPlainText(row.description),
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
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error }, { status: 200 });
  }

  const today = getTodayCalendarDate();

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('*')
    .eq('is_active', true)
    .or(`is_featured.eq.true,starts_at.gte.${today}`)
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(12);

  if (error) {
    return NextResponse.json({ data: [], message: error.message }, { status: 200 });
  }

  return NextResponse.json({ data: ((data ?? []) as EventRow[]).map(toEventItem) });
}

import type { HomeEventItem } from 'src/sections/home/components/home-types';

import { cache } from 'react';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { toEventMediaProxyUrl } from 'src/server/event-media-url';

import { DEFAULT_CONTEST_RESULT_OPTIONS } from 'src/sections/events/event-contest-options';

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

function toEventItem(row: EventRow): HomeEventItem {
  return {
    id: row.id,
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
    mediaUrl: toEventMediaProxyUrl(row.media_url),
    coverUrl: toEventMediaProxyUrl(row.cover_url),
    logoUrl: toEventMediaProxyUrl(row.logo_url),
    imageUrls: (row.image_urls ?? []).map(toEventMediaProxyUrl),
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
  };
}

export const getPublishedEvent = cache(async (eventId: string) => {
  const supabase = getSupabaseAdmin();
  if (!supabase.ok) return null;

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('*')
    .eq('id', eventId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return toEventItem(data as EventRow);
});

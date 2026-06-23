import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { mapCreatorArticle } from 'src/server/creator-auth';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const SELECT = `
  id,
  creator_id,
  category_key,
  category_label,
  title,
  slug,
  excerpt,
  cover_image_url,
  content_html,
  status,
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email)
`;
const LEGACY_SELECT = `
  id,
  creator_id,
  title,
  slug,
  excerpt,
  cover_image_url,
  content_html,
  status,
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email)
`;

function getPositiveInteger(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return fallback;
  }

  return Math.min(numberValue, max);
}

function isMissingCategoryColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('category_key') || text.includes('category_label');
}

async function queryPublishedArticles(select: string, offset: number, limit: number) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const result = await supabase.client
    .from('creator_articles')
    .select(select, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { ok: true as const, result };
}

export async function GET(request: NextRequest) {
  const offset = getPositiveInteger(request.nextUrl.searchParams.get('offset'), 0);
  const limit = getPositiveInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const response = await queryPublishedArticles(SELECT, offset, limit);

  if (!response.ok) {
    return NextResponse.json({ message: response.message, data: [], total: 0 }, { status: response.status });
  }

  if (response.result.error) {
    if (isMissingCategoryColumn(response.result.error)) {
      const legacyResponse = await queryPublishedArticles(LEGACY_SELECT, offset, limit);

      if (legacyResponse.ok && !legacyResponse.result.error) {
        const total = legacyResponse.result.count ?? 0;

        return NextResponse.json({
          data: ((legacyResponse.result.data ?? []) as any[]).map(mapCreatorArticle),
          total,
          hasMore: offset + limit < total,
          nextOffset: offset + limit,
        });
      }
    }

    return NextResponse.json(
      { message: response.result.error.message, data: [], total: 0 },
      { status: 500 }
    );
  }

  const total = response.result.count ?? 0;

  return NextResponse.json({
    data: ((response.result.data ?? []) as any[]).map(mapCreatorArticle),
    total,
    hasMore: offset + limit < total,
    nextOffset: offset + limit,
  });
}

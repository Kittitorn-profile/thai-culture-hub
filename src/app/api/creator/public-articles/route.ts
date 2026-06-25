import type { NextRequest } from 'next/server';

import crypto from 'crypto';
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
  is_active,
  inactive_reason,
  inactivated_at,
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email, avatar_url)
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
  is_active,
  inactive_reason,
  inactivated_at,
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email, avatar_url)
`;
const LIKES_TABLE_NAME = 'creator_article_likes';
const VIEWS_TABLE_NAME = 'creator_article_views';

function cleanText(value: string | null, maxLength = 120) {
  const text = value?.trim() ?? '';

  return text ? text.slice(0, maxLength) : '';
}

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

function isMissingActiveColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('is_active') || text.includes('inactive_reason') || text.includes('inactivated_at');
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return (
    forwardedFor ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function getIpHash(request: NextRequest) {
  const salt =
    process.env.CREATOR_ARTICLE_STATS_IP_SALT ??
    process.env.PLACE_LIKE_IP_SALT ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'thai-culture-hub-creator-article-stats';

  return crypto.createHash('sha256').update(`${salt}:${getRequestIp(request)}`).digest('hex');
}

async function queryPublishedArticles(
  select: string,
  offset: number,
  limit: number,
  creatorId?: string,
  filterActive = true
) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  let query = supabase.client
    .from('creator_articles')
    .select(select, { count: 'exact' })
    .in('status', ['published', 'approved'])
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterActive) {
    query = query.eq('is_active', true);
  }

  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const result = await query;

  return { ok: true as const, result };
}

async function addArticleStats(
  articles: ReturnType<typeof mapCreatorArticle>[],
  request: NextRequest
) {
  if (!articles.length) {
    return articles;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return articles;
  }

  const articleIds = articles.map((article) => article.id);
  const ipHash = getIpHash(request);
  const [likesResult, viewsResult] = await Promise.all([
    supabase.client.from(LIKES_TABLE_NAME).select('article_id, ip_hash').in('article_id', articleIds),
    supabase.client.from(VIEWS_TABLE_NAME).select('article_id').in('article_id', articleIds),
  ]);

  if (likesResult.error || viewsResult.error) {
    return articles;
  }

  const stats = Object.fromEntries(
    articleIds.map((articleId) => [
      articleId,
      {
        likeCount: 0,
        liked: false,
        viewCount: 0,
      },
    ])
  );

  likesResult.data?.forEach((like) => {
    const articleId = typeof like.article_id === 'string' ? like.article_id : null;

    if (!articleId || !stats[articleId]) {
      return;
    }

    stats[articleId].likeCount += 1;
    stats[articleId].liked = stats[articleId].liked || like.ip_hash === ipHash;
  });

  viewsResult.data?.forEach((view) => {
    const articleId = typeof view.article_id === 'string' ? view.article_id : null;

    if (!articleId || !stats[articleId]) {
      return;
    }

    stats[articleId].viewCount += 1;
  });

  return articles.map((article) => ({
    ...article,
    ...stats[article.id],
  }));
}

export async function GET(request: NextRequest) {
  const offset = getPositiveInteger(request.nextUrl.searchParams.get('offset'), 0);
  const limit = getPositiveInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const creatorId = cleanText(request.nextUrl.searchParams.get('creatorId'));
  const response = await queryPublishedArticles(SELECT, offset, limit, creatorId);

  if (!response.ok) {
    return NextResponse.json({ message: response.message, data: [], total: 0 }, { status: response.status });
  }

  if (response.result.error) {
    if (isMissingCategoryColumn(response.result.error) || isMissingActiveColumn(response.result.error)) {
      const legacyResponse = await queryPublishedArticles(LEGACY_SELECT, offset, limit, creatorId, false);

      if (legacyResponse.ok && !legacyResponse.result.error) {
        const total = legacyResponse.result.count ?? 0;
        const articles = ((legacyResponse.result.data ?? []) as any[]).map(mapCreatorArticle);

        return NextResponse.json({
          data: await addArticleStats(articles, request),
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
  const articles = ((response.result.data ?? []) as any[]).map(mapCreatorArticle);

  return NextResponse.json({
    data: await addArticleStats(articles, request),
    total,
    hasMore: offset + limit < total,
    nextOffset: offset + limit,
  });
}

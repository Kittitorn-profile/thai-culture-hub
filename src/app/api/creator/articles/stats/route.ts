import type { NextRequest } from 'next/server';

import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const LIKES_TABLE_NAME = 'creator_article_likes';
const VIEWS_TABLE_NAME = 'creator_article_views';
const MAX_ARTICLE_IDS = 100;
const MAX_ARTICLE_ID_LENGTH = 120;

type ArticleStatsPayload = {
  articleId?: unknown;
  action?: unknown;
};

function cleanArticleId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const articleId = value.trim();

  return articleId ? articleId.slice(0, MAX_ARTICLE_ID_LENGTH) : null;
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

function getArticleIds(request: NextRequest) {
  const articleIds = request.nextUrl.searchParams
    .get('articleIds')
    ?.split(',')
    .map((articleId) => cleanArticleId(articleId))
    .filter((articleId): articleId is string => !!articleId)
    .slice(0, MAX_ARTICLE_IDS);

  return Array.from(new Set(articleIds ?? []));
}

async function getArticleStats(articleIds: string[], ipHash: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, message: supabase.error };
  }

  const [likesResult, viewsResult] = await Promise.all([
    supabase.client.from(LIKES_TABLE_NAME).select('article_id, ip_hash').in('article_id', articleIds),
    supabase.client.from(VIEWS_TABLE_NAME).select('article_id').in('article_id', articleIds),
  ]);

  if (likesResult.error) {
    return { ok: false as const, message: likesResult.error.message };
  }

  if (viewsResult.error) {
    return { ok: false as const, message: viewsResult.error.message };
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

  return { ok: true as const, data: stats };
}

async function getSingleArticleStats(articleId: string, ipHash: string) {
  return getArticleStats([articleId], ipHash);
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const articleIds = getArticleIds(request);

  if (!articleIds.length) {
    return NextResponse.json({ data: {} });
  }

  const statsResult = await getArticleStats(articleIds, getIpHash(request));

  if (!statsResult.ok) {
    return NextResponse.json({ message: statsResult.message }, { status: 500 });
  }

  return NextResponse.json({ data: statsResult.data });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as ArticleStatsPayload;
  const articleId = cleanArticleId(body.articleId);
  const action = typeof body.action === 'string' ? body.action.trim() : '';

  if (!articleId || !['like', 'view'].includes(action)) {
    return NextResponse.json({ message: 'Invalid creator article stats payload' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const ipHash = getIpHash(request);

  if (action === 'view') {
    const { error } = await supabase.client.from(VIEWS_TABLE_NAME).insert({
      article_id: articleId,
      ip_hash: ipHash,
      user_agent: request.headers.get('user-agent')?.slice(0, 1000) ?? null,
    });

    if (error && error.code !== '23505') {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  if (action === 'like') {
    const existingResult = await supabase.client
      .from(LIKES_TABLE_NAME)
      .select('id')
      .eq('article_id', articleId)
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (existingResult.error) {
      return NextResponse.json({ message: existingResult.error.message }, { status: 500 });
    }

    if (existingResult.data) {
      const { error } = await supabase.client
        .from(LIKES_TABLE_NAME)
        .delete()
        .eq('id', existingResult.data.id);

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.client.from(LIKES_TABLE_NAME).insert({
        article_id: articleId,
        ip_hash: ipHash,
        user_agent: request.headers.get('user-agent')?.slice(0, 1000) ?? null,
      });

      if (error && error.code !== '23505') {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }
    }
  }

  const statsResult = await getSingleArticleStats(articleId, ipHash);

  if (!statsResult.ok) {
    return NextResponse.json({ message: statsResult.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      articleId,
      ...statsResult.data[articleId],
    },
  });
}

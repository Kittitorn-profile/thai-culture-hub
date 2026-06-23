import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  cleanText,
  slugify,
  getBearerToken,
  mapCreatorArticle,
  getCreatorProfileByUserId,
  verifyCreatorAccessToken,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

const ARTICLE_SELECT =
  'id, creator_id, category_key, category_label, title, slug, excerpt, cover_image_url, content_html, status, submitted_at, reviewed_at, reject_reason, published_at, created_at, updated_at';
const LEGACY_ARTICLE_SELECT =
  'id, creator_id, title, slug, excerpt, cover_image_url, content_html, status, submitted_at, reviewed_at, reject_reason, published_at, created_at, updated_at';

function isMissingCategoryColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('category_key') || text.includes('category_label');
}

async function requireApprovedCreator(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return auth;
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return profileResult;
  }

  if (profileResult.profile.status !== 'approved') {
    return {
      ok: false as const,
      status: 403,
      message: 'Creator profile is not approved yet',
    };
  }

  return { ok: true as const, supabase: auth.supabase, profile: profileResult.profile };
}

export async function GET(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  const { data, error } = await auth.supabase
    .from('creator_articles')
    .select(ARTICLE_SELECT)
    .eq('creator_id', profileResult.profile.id)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingCategoryColumn(error)) {
      const legacyResult = await auth.supabase
        .from('creator_articles')
        .select(LEGACY_ARTICLE_SELECT)
        .eq('creator_id', profileResult.profile.id)
        .order('updated_at', { ascending: false });

      if (!legacyResult.error) {
        return NextResponse.json({
          data: ((legacyResult.data ?? []) as any[]).map(mapCreatorArticle),
          message: 'Run docs/supabase-creators.sql to enable article categories',
        });
      }
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: ((data ?? []) as any[]).map(mapCreatorArticle) });
}

export async function POST(request: NextRequest) {
  const auth = await requireApprovedCreator(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = cleanText(body.title);
  const categoryKey = cleanText(body.categoryKey);
  const categoryLabel = cleanText(body.categoryLabel);
  const contentHtml = cleanText(body.contentHtml);
  const action = cleanText(body.action);

  if (!title || !categoryKey || !contentHtml) {
    return NextResponse.json({ message: 'Title, category and content are required' }, { status: 400 });
  }

  const status = action === 'submit' ? 'pending_review' : 'draft';
  const baseSlug = slugify(title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data, error } = await auth.supabase
    .from('creator_articles')
    .insert({
      creator_id: auth.profile.id,
      category_key: categoryKey,
      category_label: categoryLabel,
      title,
      slug,
      excerpt: cleanText(body.excerpt),
      cover_image_url: cleanText(body.coverImageUrl),
      content_html: contentHtml,
      status,
      submitted_at: status === 'pending_review' ? new Date().toISOString() : null,
      reject_reason: null,
    })
    .select(ARTICLE_SELECT)
    .single();

  if (error) {
    if (isMissingCategoryColumn(error)) {
      const legacyResult = await auth.supabase
        .from('creator_articles')
        .insert({
          creator_id: auth.profile.id,
          title,
          slug,
          excerpt: cleanText(body.excerpt),
          cover_image_url: cleanText(body.coverImageUrl),
          content_html: contentHtml,
          status,
          submitted_at: status === 'pending_review' ? new Date().toISOString() : null,
          reject_reason: null,
        })
        .select(LEGACY_ARTICLE_SELECT)
        .single();

      if (!legacyResult.error) {
        return NextResponse.json(
          {
            data: mapCreatorArticle(legacyResult.data as any),
            message: 'Saved without category. Run docs/supabase-creators.sql to store categories.',
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorArticle(data) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApprovedCreator(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);
  const title = cleanText(body.title);
  const categoryKey = cleanText(body.categoryKey);
  const categoryLabel = cleanText(body.categoryLabel);
  const contentHtml = cleanText(body.contentHtml);
  const action = cleanText(body.action);

  if (!id || !title || !categoryKey || !contentHtml) {
    return NextResponse.json({ message: 'Article id, title, category and content are required' }, { status: 400 });
  }

  const status = action === 'submit' ? 'pending_review' : 'draft';

  const { data, error } = await auth.supabase
    .from('creator_articles')
    .update({
      title,
      category_key: categoryKey,
      category_label: categoryLabel,
      excerpt: cleanText(body.excerpt),
      cover_image_url: cleanText(body.coverImageUrl),
      content_html: contentHtml,
      status,
      submitted_at: status === 'pending_review' ? new Date().toISOString() : null,
      reviewed_at: null,
      reviewed_by: null,
      reject_reason: null,
      published_at: null,
    })
    .eq('id', id)
    .eq('creator_id', auth.profile.id)
    .select(ARTICLE_SELECT)
    .single();

  if (error) {
    if (isMissingCategoryColumn(error)) {
      const legacyResult = await auth.supabase
        .from('creator_articles')
        .update({
          title,
          excerpt: cleanText(body.excerpt),
          cover_image_url: cleanText(body.coverImageUrl),
          content_html: contentHtml,
          status,
          submitted_at: status === 'pending_review' ? new Date().toISOString() : null,
          reviewed_at: null,
          reviewed_by: null,
          reject_reason: null,
          published_at: null,
        })
        .eq('id', id)
        .eq('creator_id', auth.profile.id)
        .select(LEGACY_ARTICLE_SELECT)
        .single();

      if (!legacyResult.error) {
        return NextResponse.json({
          data: mapCreatorArticle(legacyResult.data as any),
          message: 'Saved without category. Run docs/supabase-creators.sql to store categories.',
        });
      }
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorArticle(data) });
}

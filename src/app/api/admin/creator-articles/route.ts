import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import {
  cleanText,
  getBearerToken,
  mapCreatorArticle,
  type CreatorArticleStatus,
} from 'src/server/creator-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

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

function normalizeStatus(value: string): CreatorArticleStatus | null {
  if (value === 'approved' || value === 'rejected' || value === 'published') {
    return value;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers), ADMIN_PERMISSION.creators);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from('creator_articles')
    .select(SELECT)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: ((data ?? []) as any[]).map(mapCreatorArticle) });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers), ADMIN_PERMISSION.creators);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);
  const status = normalizeStatus(cleanText(body.status));
  const rejectReason = cleanText(body.rejectReason);

  if (!id || !status) {
    return NextResponse.json({ message: 'Valid article id and review status are required' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectReason) {
    return NextResponse.json({ message: 'Reject reason is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase.client
    .from('creator_articles')
    .update({
      status,
      reviewed_at: now,
      reviewed_by: auth.user.id,
      reject_reason: status === 'rejected' ? rejectReason : null,
      published_at: status === 'published' ? now : null,
    })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorArticle(data as any) });
}

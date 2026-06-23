import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import {
  cleanText,
  getBearerToken,
  mapCreatorProfile,
  type CreatorStatus,
} from 'src/server/creator-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';

const SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at';

function normalizeStatus(value: string): CreatorStatus | null {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
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
    .from('creator_profiles')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: ((data ?? []) as any[]).map(mapCreatorProfile) });
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

  if (!id || !status || status === 'pending') {
    return NextResponse.json({ message: 'Valid creator id and review status are required' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectReason) {
    return NextResponse.json({ message: 'Reject reason is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from('creator_profiles')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      reject_reason: status === 'rejected' ? rejectReason : null,
    })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await supabase.client
    .from(USERS_TABLE)
    .update({
      role: 'creator',
      is_active: status === 'approved',
    })
    .eq('id', data.user_id);

  return NextResponse.json({ data: mapCreatorProfile(data) });
}

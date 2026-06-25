import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  cleanText,
  getBearerToken,
  mapCreatorProfile,
  getCreatorProfileByUserId,
  verifyCreatorAccessToken,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

const CREATOR_PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, warning_note, warned_at, reviewed_at, reject_reason, created_at, updated_at';
const LEGACY_CREATOR_PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at';

function isMissingCreatorWarningColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('warning_note') || text.includes('warned_at');
}

export async function GET(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const result = await getCreatorProfileByUserId(auth.user.id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ data: mapCreatorProfile(result.profile) });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const displayName = cleanText(body.displayName);

  if (!displayName) {
    return NextResponse.json({ message: 'Display name is required' }, { status: 400 });
  }

  const updateResult = await auth.supabase
    .from('creator_profiles')
    .update({
      display_name: displayName,
      bio: cleanText(body.bio),
      phone: cleanText(body.phone),
      website_url: cleanText(body.websiteUrl),
      facebook_url: cleanText(body.facebookUrl),
      avatar_url: cleanText(body.avatarUrl),
    })
    .eq('id', profileResult.profile.id)
    .select(CREATOR_PROFILE_SELECT)
    .single();
  let data = updateResult.data as any;
  let error = updateResult.error;

  if (error && isMissingCreatorWarningColumn(error)) {
    const legacyResult = await auth.supabase
      .from('creator_profiles')
      .update({
        display_name: displayName,
        bio: cleanText(body.bio),
        phone: cleanText(body.phone),
        website_url: cleanText(body.websiteUrl),
        facebook_url: cleanText(body.facebookUrl),
        avatar_url: cleanText(body.avatarUrl),
      })
      .eq('id', profileResult.profile.id)
      .select(LEGACY_CREATOR_PROFILE_SELECT)
      .single();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await auth.supabase.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...auth.user.user_metadata,
      display_name: displayName,
    },
  });

  return NextResponse.json({ data: mapCreatorProfile(data) });
}

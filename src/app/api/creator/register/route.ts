import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { cleanText, mapCreatorProfile } from 'src/server/creator-auth';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.password);
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const displayName = cleanText(body.displayName) || `${firstName} ${lastName}`.trim() || email;
  const bio = cleanText(body.bio);
  const phone = cleanText(body.phone);

  if (!email || !password || !displayName) {
    return NextResponse.json({ message: 'Email, password and display name are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data: existingUser, error: existingUserError } = await supabase.client
    .from(USERS_TABLE)
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUserError) {
    return NextResponse.json({ message: existingUserError.message }, { status: 500 });
  }

  if (existingUser) {
    return NextResponse.json({ message: 'This email is already registered' }, { status: 409 });
  }

  const { data: createdUser, error: createError } = await supabase.client
    .from(USERS_TABLE)
    .insert({
      email,
      password_hash: `sha256:${sha256(password)}`,
      role: 'creator',
      is_active: false,
    })
    .select('id')
    .single();

  if (createError || !createdUser?.id) {
    return NextResponse.json({ message: createError?.message ?? 'Create user failed' }, { status: 400 });
  }

  const userId = String(createdUser.id);

  const { data: profile, error: profileError } = await supabase.client
    .from('creator_profiles')
    .insert({
      user_id: userId,
      email,
      display_name: displayName,
      bio,
      phone,
      status: 'pending',
    })
    .select(
      'id, user_id, email, display_name, bio, phone, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at'
    )
    .single();

  if (profileError) {
    await supabase.client.from(USERS_TABLE).delete().eq('id', userId);
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorProfile(profile), message: 'Registration submitted' }, { status: 201 });
}

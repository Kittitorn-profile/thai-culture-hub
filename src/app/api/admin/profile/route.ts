import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTextArray(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(cleanText).filter(Boolean)));
  }

  return cleanText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidPhotoUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export const runtime = 'nodejs';

async function getAuthenticatedUser(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return { ok: false as const, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: supabase.error }, { status: 500 }),
    };
  }

  const { data: authData, error: authError } = await supabase.client.auth.getUser(token);

  if (authError || !authData.user) {
    return { ok: false as const, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true as const, supabase: supabase.client, user: authData.user };
}

function mapReviewer(row: any, email: string) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    email,
    displayName: row.display_name ?? '',
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url ?? '',
    reviewerLevel: row.reviewer_level ?? 'junior',
    reviewerStatus: row.reviewer_status ?? 'pending',
    expertiseCategories: row.expertise_categories ?? [],
    expertiseRegions: row.expertise_regions ?? [],
    expertiseProvinces: row.expertise_provinces ?? [],
    organization: row.organization ?? '',
    position: row.position ?? '',
    credentials: row.credentials ?? '',
    proofUrls: row.proof_urls ?? [],
    reviewCount: row.review_count ?? 0,
    approvedCount: row.approved_count ?? 0,
    rejectedCount: row.rejected_count ?? 0,
    accuracyScore: Number(row.accuracy_score ?? 0),
    trustScore: Number(row.trust_score ?? 0),
    canReviewCategories: row.can_review_categories ?? [],
    canReviewRegions: row.can_review_regions ?? [],
    canApprove: row.can_approve === true,
    canPublish: row.can_publish === true,
    notes: row.notes ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.ok) {
    return auth.response;
  }

  const reviewerResult = await auth.supabase
    .from('reviewers')
    .select(
      `
      id,
      user_id,
      display_name,
      bio,
      avatar_url,
      reviewer_level,
      reviewer_status,
      expertise_categories,
      expertise_regions,
      expertise_provinces,
      organization,
      position,
      credentials,
      proof_urls,
      review_count,
      approved_count,
      rejected_count,
      accuracy_score,
      trust_score,
      can_review_categories,
      can_review_regions,
      can_approve,
      can_publish,
      notes,
      updated_at
    `
    )
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (reviewerResult.error) {
    return NextResponse.json({ message: reviewerResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      reviewer: mapReviewer(reviewerResult.data, auth.user.email ?? ''),
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();
  const firstName = cleanText(formData.get('firstName'));
  const lastName = cleanText(formData.get('lastName'));
  const photoUrl = cleanText(formData.get('photoUrl'));

  if (!firstName || !lastName) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อและนามสกุล' }, { status: 400 });
  }

  if (!isValidPhotoUrl(photoUrl)) {
    return NextResponse.json({ message: 'ลิงก์รูปภาพต้องเป็น URL ที่ถูกต้อง' }, { status: 400 });
  }

  const currentMetadata = auth.user.user_metadata ?? {};
  const displayName = `${firstName} ${lastName}`.trim();
  const { data, error } = await auth.supabase.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...currentMetadata,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      photo_url: photoUrl || null,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: data.user.id,
      email: data.user.email,
      firstName,
      lastName,
      displayName,
      photoURL: photoUrl,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const displayName = cleanText(body.displayName);
  const avatarUrl = cleanText(body.avatarUrl);

  if (!displayName) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อผู้ตรวจสอบ' }, { status: 400 });
  }

  if (!isValidPhotoUrl(avatarUrl)) {
    return NextResponse.json({ message: 'ลิงก์รูปภาพต้องเป็น URL ที่ถูกต้อง' }, { status: 400 });
  }

  const payload = {
    display_name: displayName,
    bio: cleanText(body.bio) || null,
    avatar_url: avatarUrl || null,
    expertise_categories: normalizeTextArray(body.expertiseCategories),
    expertise_regions: normalizeTextArray(body.expertiseRegions),
    expertise_provinces: normalizeTextArray(body.expertiseProvinces),
    organization: cleanText(body.organization) || null,
    position: cleanText(body.position) || null,
    credentials: cleanText(body.credentials) || null,
    proof_urls: normalizeTextArray(body.proofUrls),
    notes: cleanText(body.notes) || null,
  };

  const { data, error } = await auth.supabase
    .from('reviewers')
    .update(payload)
    .eq('user_id', auth.user.id)
    .select(
      `
      id,
      user_id,
      display_name,
      bio,
      avatar_url,
      reviewer_level,
      reviewer_status,
      expertise_categories,
      expertise_regions,
      expertise_provinces,
      organization,
      position,
      credentials,
      proof_urls,
      review_count,
      approved_count,
      rejected_count,
      accuracy_score,
      trust_score,
      can_review_categories,
      can_review_regions,
      can_approve,
      can_publish,
      notes,
      updated_at
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      reviewer: mapReviewer(data, auth.user.email ?? ''),
    },
  });
}

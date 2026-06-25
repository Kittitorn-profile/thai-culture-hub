import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const SELECT = `
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
  verified_by,
  verified_at,
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
  created_at,
  updated_at
`;

const REVIEWER_LEVELS = new Set(['junior', 'senior', 'expert']);
const REVIEWER_STATUSES = new Set(['pending', 'verified', 'suspended', 'rejected']);

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

function mapReviewer(
  row: any,
  usersById: Map<string, { email: string; displayName: string; photoUrl: string }>
) {
  const user = usersById.get(row.user_id) ?? { email: '', displayName: '', photoUrl: '' };

  return {
    id: row.id,
    userId: row.user_id,
    email: user.email,
    userDisplayName: user.displayName,
    displayName: row.display_name ?? user.displayName ?? user.email ?? '',
    bio: row.bio ?? '',
    avatarUrl: user.photoUrl || row.avatar_url || '',
    reviewerLevel: row.reviewer_level ?? 'junior',
    reviewerStatus: row.reviewer_status ?? 'pending',
    expertiseCategories: row.expertise_categories ?? [],
    expertiseRegions: row.expertise_regions ?? [],
    expertiseProvinces: row.expertise_provinces ?? [],
    organization: row.organization ?? '',
    position: row.position ?? '',
    credentials: row.credentials ?? '',
    proofUrls: row.proof_urls ?? [],
    verifiedBy: row.verified_by ?? '',
    verifiedAt: row.verified_at ?? '',
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
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function isMissingReviewersTable(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('reviewers') && (text.includes('does not exist') || text.includes('schema cache'));
}

async function getAdminUsers() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const { data, error } = await supabase.client.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (error) {
    return [];
  }

  return data.users.map((user) => ({
    id: user.id,
    email: user.email ?? '',
    displayName:
      typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : user.email ?? '',
    photoUrl: typeof user.user_metadata?.photo_url === 'string' ? user.user_metadata.photo_url : '',
  }));
}

async function requireReviewerAdmin(request: NextRequest) {
  return verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.reviewers);
}

export async function GET(request: NextRequest) {
  const auth = await requireReviewerAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const [users, reviewersResult] = await Promise.all([
    getAdminUsers(),
    supabase.client.from('reviewers').select(SELECT).order('created_at', { ascending: false }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  if (reviewersResult.error) {
    if (isMissingReviewersTable(reviewersResult.error)) {
      return NextResponse.json(
        { message: 'ยังไม่มีตาราง reviewers กรุณารัน docs/supabase-creators.sql ก่อนใช้งาน' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: reviewersResult.error.message }, { status: 500 });
  }

  const reviewerUserIds = new Set(((reviewersResult.data ?? []) as any[]).map((row) => row.user_id));

  return NextResponse.json({
    data: ((reviewersResult.data ?? []) as any[]).map((row) => mapReviewer(row, usersById)),
    users: users.filter((user) => !reviewerUserIds.has(user.id)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireReviewerAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = cleanText(body.userId);
  const displayName = cleanText(body.displayName);
  const reviewerLevel = REVIEWER_LEVELS.has(cleanText(body.reviewerLevel))
    ? cleanText(body.reviewerLevel)
    : 'junior';
  const reviewerStatus = REVIEWER_STATUSES.has(cleanText(body.reviewerStatus))
    ? cleanText(body.reviewerStatus)
    : 'pending';

  if (!userId || !displayName) {
    return NextResponse.json({ message: 'กรุณาเลือกผู้ใช้งานและกรอกชื่อที่แสดง' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const payload = {
    user_id: userId,
    display_name: displayName,
    bio: cleanText(body.bio) || null,
    avatar_url: cleanText(body.avatarUrl) || null,
    reviewer_level: reviewerLevel,
    reviewer_status: reviewerStatus,
    expertise_categories: normalizeTextArray(body.expertiseCategories),
    expertise_regions: normalizeTextArray(body.expertiseRegions),
    expertise_provinces: normalizeTextArray(body.expertiseProvinces),
    organization: cleanText(body.organization) || null,
    position: cleanText(body.position) || null,
    credentials: cleanText(body.credentials) || null,
    proof_urls: normalizeTextArray(body.proofUrls),
    verified_by: reviewerStatus === 'verified' ? auth.user.id : null,
    verified_at: reviewerStatus === 'verified' ? new Date().toISOString() : null,
    can_review_categories: normalizeTextArray(body.canReviewCategories),
    can_review_regions: normalizeTextArray(body.canReviewRegions),
    can_approve: body.canApprove === true,
    can_publish: body.canPublish === true,
    notes: cleanText(body.notes) || null,
  };

  const { data, error } = await supabase.client.from('reviewers').insert(payload).select(SELECT).single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const users = await getAdminUsers();

  return NextResponse.json(
    { data: mapReviewer(data as any, new Map(users.map((user) => [user.id, user]))) },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireReviewerAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);
  const displayName = cleanText(body.displayName);
  const reviewerLevel = REVIEWER_LEVELS.has(cleanText(body.reviewerLevel))
    ? cleanText(body.reviewerLevel)
    : 'junior';
  const reviewerStatus = REVIEWER_STATUSES.has(cleanText(body.reviewerStatus))
    ? cleanText(body.reviewerStatus)
    : 'pending';

  if (!id || !displayName) {
    return NextResponse.json({ message: 'กรุณาระบุผู้ตรวจสอบและกรอกชื่อที่แสดง' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const payload = {
    display_name: displayName,
    bio: cleanText(body.bio) || null,
    avatar_url: cleanText(body.avatarUrl) || null,
    reviewer_level: reviewerLevel,
    reviewer_status: reviewerStatus,
    expertise_categories: normalizeTextArray(body.expertiseCategories),
    expertise_regions: normalizeTextArray(body.expertiseRegions),
    expertise_provinces: normalizeTextArray(body.expertiseProvinces),
    organization: cleanText(body.organization) || null,
    position: cleanText(body.position) || null,
    credentials: cleanText(body.credentials) || null,
    proof_urls: normalizeTextArray(body.proofUrls),
    verified_by: reviewerStatus === 'verified' ? auth.user.id : null,
    verified_at: reviewerStatus === 'verified' ? new Date().toISOString() : null,
    can_review_categories: normalizeTextArray(body.canReviewCategories),
    can_review_regions: normalizeTextArray(body.canReviewRegions),
    can_approve: body.canApprove === true,
    can_publish: body.canPublish === true,
    notes: cleanText(body.notes) || null,
  };

  const { data, error } = await supabase.client
    .from('reviewers')
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const users = await getAdminUsers();

  return NextResponse.json({
    data: mapReviewer(data as any, new Map(users.map((user) => [user.id, user]))),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireReviewerAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);

  if (!id) {
    return NextResponse.json({ message: 'กรุณาระบุผู้ตรวจสอบที่ต้องการลบ' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.from('reviewers').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'ลบผู้ตรวจสอบแล้ว' });
}

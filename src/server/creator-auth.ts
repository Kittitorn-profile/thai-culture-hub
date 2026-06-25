import type { User } from '@supabase/supabase-js';

import crypto from 'node:crypto';

import { getSupabaseAdmin } from './supabase-admin';
import { getAdminSecret } from './admin-api-auth';

export type CreatorStatus = 'pending' | 'approved' | 'rejected';
export type CreatorArticleStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';

const CREATOR_PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, warning_note, warned_at, reviewed_at, reject_reason, created_at, updated_at';
const LEGACY_CREATOR_PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at';

export type CreatorProfileRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  bio: string | null;
  phone: string | null;
  province_code: string | null;
  website_url: string | null;
  facebook_url: string | null;
  avatar_url: string | null;
  status: CreatorStatus;
  warning_note?: string | null;
  warned_at?: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean | null;
};

export type CreatorArticleRow = {
  id: string;
  creator_id: string;
  category_key?: string | null;
  category_label?: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string;
  status: CreatorArticleStatus;
  is_active?: boolean | null;
  inactive_reason?: string | null;
  inactivated_at?: string | null;
  approval_required_count?: number | null;
  approval_reviewer_ids?: string[] | null;
  approval_reviews?: unknown;
  approval_requested_at?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  creator_profiles?: Pick<CreatorProfileRow, 'display_name' | 'email' | 'avatar_url'> | null;
};

export function getBearerToken(headers: Headers) {
  return headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

export function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isMissingCreatorWarningColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('warning_note') || text.includes('warned_at');
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `article-${Date.now()}`
  );
}

function safeCompare(value: string, expectedValue: string) {
  const valueBuffer = Buffer.from(value);
  const expectedValueBuffer = Buffer.from(expectedValue);

  return (
    valueBuffer.length === expectedValueBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedValueBuffer)
  );
}

function verifyCreatorTableToken(accessToken: string) {
  const secret = getAdminSecret();
  const [body, signature] = accessToken.split('.');

  if (!secret || !body || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('base64url');

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub?: string;
      role?: string | null;
      exp?: number;
    };

    if (!payload.sub || payload.role !== 'creator' || !payload.exp || payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function mapCreatorProfile(row: CreatorProfileRow) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    provinceCode: row.province_code ?? '',
    websiteUrl: row.website_url ?? '',
    facebookUrl: row.facebook_url ?? '',
    avatarUrl: row.avatar_url ?? '',
    status: row.status,
    isActive: row.is_active !== false,
    warningNote: row.warning_note ?? '',
    warnedAt: row.warned_at ?? '',
    reviewedAt: row.reviewed_at ?? '',
    rejectReason: row.reject_reason ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreatorArticle(row: CreatorArticleRow) {
  const status = row.status === 'approved' ? 'published' : row.status;
  const approvalReviews = Array.isArray(row.approval_reviews) ? row.approval_reviews : [];

  return {
    id: row.id,
    creatorId: row.creator_id,
    categoryKey: row.category_key ?? '',
    categoryLabel: row.category_label ?? '',
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? '',
    coverImageUrl: row.cover_image_url ?? '',
    contentHtml: row.content_html ?? '',
    status,
    isActive: row.is_active !== false,
    inactiveReason: row.inactive_reason ?? '',
    inactivatedAt: row.inactivated_at ?? '',
    approvalRequiredCount: row.approval_required_count ?? 1,
    approvalReviewerIds: Array.isArray(row.approval_reviewer_ids) ? row.approval_reviewer_ids : [],
    approvalReviews,
    approvalRequestedAt: row.approval_requested_at ?? '',
    submittedAt: row.submitted_at ?? '',
    reviewedAt: row.reviewed_at ?? '',
    rejectReason: row.reject_reason ?? '',
    publishedAt: row.published_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorName: row.creator_profiles?.display_name ?? '',
    creatorEmail: row.creator_profiles?.email ?? '',
    creatorAvatarUrl: row.creator_profiles?.avatar_url ?? '',
  };
}

export async function verifyCreatorAccessToken(accessToken: string) {
  if (!accessToken) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client.auth.getUser(accessToken);

  if (!error && data.user) {
    return { ok: true as const, supabase: supabase.client, user: data.user as User };
  }

  const creatorTokenPayload = verifyCreatorTableToken(accessToken);

  if (!creatorTokenPayload) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }

  return {
    ok: true as const,
    supabase: supabase.client,
    user: {
      id: creatorTokenPayload.sub,
      email: '',
      app_metadata: { role: 'creator' },
      user_metadata: {},
    } as unknown as User,
  };
}

export async function getCreatorProfileByUserId(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const profileResult = await supabase.client
    .from('creator_profiles')
    .select(CREATOR_PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  let data = profileResult.data as any;
  let error = profileResult.error;

  if (error && isMissingCreatorWarningColumn(error)) {
    const legacyResult = await supabase.client
      .from('creator_profiles')
      .select(LEGACY_CREATOR_PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return { ok: false as const, status: 500, message: error.message };
  }

  if (!data) {
    return { ok: false as const, status: 404, message: 'Creator profile not found' };
  }

  const { data: userRow } = await supabase.client
    .from('user')
    .select('is_active')
    .eq('id', userId)
    .maybeSingle();

  return {
    ok: true as const,
    profile: {
      ...(data as CreatorProfileRow),
      is_active: (userRow as { is_active?: boolean | null } | null)?.is_active ?? true,
    },
  };
}

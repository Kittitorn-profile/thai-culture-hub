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
  is_active,
  inactive_reason,
  inactivated_at,
  approval_required_count,
  approval_reviewer_ids,
  approval_reviews,
  approval_requested_at,
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email)
`;
const LEGACY_SELECT = `
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

function isMissingActiveColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return (
    text.includes('is_active') ||
    text.includes('inactive_reason') ||
    text.includes('inactivated_at') ||
    text.includes('approval_required_count') ||
    text.includes('approval_reviewer_ids') ||
    text.includes('approval_reviews') ||
    text.includes('approval_requested_at')
  );
}

function normalizeApprovalCount(value: unknown) {
  const parsedValue = Number(value ?? 1);

  return Number.isFinite(parsedValue) ? Math.min(Math.max(Math.trunc(parsedValue), 1), 10) : 1;
}

function normalizeReviewerIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && !!item.trim())))
    : [];
}

function normalizeApprovalReviews(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is { userId: string; email: string; displayName: string; reviewedAt: string } =>
      !!item && typeof item === 'object' && typeof (item as any).userId === 'string'
  );
}

function getAllowedReviewerIds(reviewers: Awaited<ReturnType<typeof getArticleReviewers>>) {
  return new Set(reviewers.map((reviewer) => reviewer.id));
}

async function getArticleReviewers() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const reviewersResult = await supabase.client
    .from('reviewers')
    .select('user_id, display_name, reviewer_level, reviewer_status, can_approve, can_publish')
    .eq('reviewer_status', 'verified')
    .or('can_approve.eq.true,can_publish.eq.true')
    .order('display_name', { ascending: true });

  if (reviewersResult.error) {
    return [];
  }

  const rows = (reviewersResult.data ?? []) as Array<{
    user_id: string;
    display_name: string | null;
    reviewer_level: string | null;
    reviewer_status: string | null;
    can_approve: boolean | null;
    can_publish: boolean | null;
  }>;

  return rows.map((row) => ({
    id: row.user_id,
    email: '',
    role: row.reviewer_level ?? 'reviewer',
    displayName: row.display_name ?? row.user_id,
  }));
}

function normalizeStatus(value: string): CreatorArticleStatus | null {
  if (value === 'approved' || value === 'published') {
    return 'published';
  }

  if (value === 'rejected') {
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

  const articlesResult = await supabase.client
    .from('creator_articles')
    .select(SELECT)
    .neq('status', 'draft')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(200);
  let data = articlesResult.data as any[] | null;
  let error = articlesResult.error;

  if (error && isMissingActiveColumn(error)) {
    const legacyResult = await supabase.client
      .from('creator_articles')
      .select(LEGACY_SELECT)
      .neq('status', 'draft')
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(200);

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: ((data ?? []) as any[]).map(mapCreatorArticle),
    reviewers: await getArticleReviewers(),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers), ADMIN_PERMISSION.creators);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const approvalRequiredCount = normalizeApprovalCount(body.approvalRequiredCount);
  const approvalReviewerIds = normalizeReviewerIds(body.approvalReviewerIds);

  if (approvalReviewerIds.length < approvalRequiredCount) {
    return NextResponse.json(
      { message: 'กรุณาเลือก approver ให้ไม่น้อยกว่าจำนวน approval ที่ต้องการ' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const reviewers = await getArticleReviewers();
  const allowedReviewerIds = getAllowedReviewerIds(reviewers);
  const hasInvalidReviewer = approvalReviewerIds.some((reviewerId) => !allowedReviewerIds.has(reviewerId));

  if (hasInvalidReviewer) {
    return NextResponse.json(
      { message: 'รายชื่อ approver ต้องเป็น reviewer ที่ได้รับการยืนยันและมีสิทธิ์อนุมัติเท่านั้น' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const result = await supabase.client
    .from('creator_articles')
    .update({
      approval_required_count: approvalRequiredCount,
      approval_reviewer_ids: approvalReviewerIds,
      approval_requested_at: now,
    })
    .not('id', 'is', null)
    .neq('status', 'draft')
    .select(SELECT);
  const data = result.data as any[] | null;
  const error = result.error;

  if (error && isMissingActiveColumn(error)) {
    return NextResponse.json(
      {
        message:
          'ยังไม่มี column สำหรับ approval workflow ใน creator_articles กรุณารัน docs/supabase-creators.sql ก่อนใช้งาน',
      },
      { status: 500 }
    );
  }

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
  const inactiveReason = cleanText(body.inactiveReason);
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;
  const approvalRequiredCount = normalizeApprovalCount(body.approvalRequiredCount);
  const approvalReviewerIds = normalizeReviewerIds(body.approvalReviewerIds);

  if (!id || !status) {
    return NextResponse.json({ message: 'Valid article id and review status are required' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectReason) {
    return NextResponse.json({ message: 'กรุณาระบุเหตุผลกรณีไม่อนุมัติ' }, { status: 400 });
  }

  if (approvalReviewerIds.length > 0 && approvalReviewerIds.length < approvalRequiredCount) {
    return NextResponse.json(
      { message: 'กรุณาเลือก reviewer ให้ไม่น้อยกว่าจำนวน approval ที่ต้องการ' },
      { status: 400 }
    );
  }

  if (approvalReviewerIds.length > 0 && !approvalReviewerIds.includes(auth.user.id)) {
    return NextResponse.json(
      { message: 'ผู้อนุมัติปัจจุบันต้องอยู่ในรายชื่อ reviewer ที่เลือก' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const now = new Date().toISOString();
  const existingResult = await supabase.client
    .from('creator_articles')
    .select('status, approval_reviews')
    .eq('id', id)
    .maybeSingle();

  if (existingResult.error) {
    return NextResponse.json({ message: existingResult.error.message }, { status: 500 });
  }

  if (!existingResult.data || (existingResult.data as any).status === 'draft') {
    return NextResponse.json(
      { message: 'ไม่สามารถตรวจบทความฉบับร่างได้ กรุณาให้ผู้สร้างส่งตรวจมาก่อน' },
      { status: 404 }
    );
  }

  const nextApprovalReviews = normalizeApprovalReviews((existingResult.data as any)?.approval_reviews);
  const currentReview = {
    userId: auth.user.id,
    email: auth.user.email ?? '',
    displayName: auth.user.displayName ?? auth.user.email ?? '',
    reviewedAt: now,
  };
  const currentReviewIndex = nextApprovalReviews.findIndex((item) => item.userId === auth.user.id);

  if (currentReviewIndex === -1) {
    nextApprovalReviews.push(currentReview);
  } else {
    nextApprovalReviews[currentReviewIndex] = currentReview;
  }

  const countedApprovalReviews =
    approvalReviewerIds.length > 0
      ? nextApprovalReviews.filter((item) => approvalReviewerIds.includes(item.userId))
      : nextApprovalReviews;
  const approvalCount = countedApprovalReviews.length;
  const hasEnoughApprovals = approvalCount >= approvalRequiredCount;
  const nextStatus = status === 'rejected' ? status : hasEnoughApprovals ? status : 'pending_review';
  const updatePayload = {
    status: nextStatus,
    reviewed_at: now,
    reviewed_by: auth.user.id,
    reject_reason: status === 'rejected' ? rejectReason : null,
    published_at: nextStatus === 'published' ? now : null,
    approval_required_count: approvalRequiredCount,
    approval_reviewer_ids: approvalReviewerIds,
    approval_reviews: countedApprovalReviews,
    approval_requested_at: approvalRequiredCount > 1 ? now : null,
    ...(isActive === null
      ? {}
      : {
          is_active: isActive,
          inactive_reason: isActive ? null : inactiveReason || null,
          inactivated_at: isActive ? null : now,
        }),
  };

  const articleResult = await supabase.client
    .from('creator_articles')
    .update(updatePayload)
    .eq('id', id)
    .neq('status', 'draft')
    .select(SELECT)
    .single();
  let data = articleResult.data as any;
  let error = articleResult.error;

  if (error && isMissingActiveColumn(error)) {
    if (isActive === false || inactiveReason || approvalRequiredCount > 1 || approvalReviewerIds.length) {
      return NextResponse.json(
        {
          message:
            'ยังไม่มี column สำหรับจัดการเปิด/ปิดหรือ approval workflow ใน creator_articles กรุณารัน docs/supabase-creators.sql ก่อนใช้งาน',
        },
        { status: 500 }
      );
    }

    const legacyResult = await supabase.client
      .from('creator_articles')
      .update({
        status,
        reviewed_at: now,
        reviewed_by: auth.user.id,
        reject_reason: status === 'rejected' ? rejectReason : null,
        published_at: status === 'published' ? now : null,
      })
      .eq('id', id)
      .neq('status', 'draft')
      .select(LEGACY_SELECT)
      .single();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorArticle(data as any) });
}

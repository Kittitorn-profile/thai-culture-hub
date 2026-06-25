import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const SETTINGS_KEY = 'default';

const DEFAULT_SETTINGS = {
  levelThresholds: {
    seniorMinTrustScore: 70,
    seniorMinAccuracyScore: 75,
    seniorMinReviewCount: 20,
    expertMinTrustScore: 88,
    expertMinAccuracyScore: 90,
    expertMinReviewCount: 75,
  },
  scoringWeights: {
    trustScore: 40,
    accuracyScore: 35,
    approvalConsistency: 15,
    reviewVolume: 10,
  },
  reviewPolicy: {
    autoLevelEnabled: false,
    requireProofUrls: true,
    minVerifiedReviewsForPublish: 10,
    allowPublishMinLevel: 'senior',
    lowTrustWarningScore: 55,
    staleReviewDays: 30,
  },
};

type ReviewerSettings = typeof DEFAULT_SETTINGS;

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

async function requireReviewerAdmin(request: NextRequest) {
  return verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.reviewers);
}

function numberInRange(value: unknown, fallback: number, min = 0, max = 100) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function cleanLevel(value: unknown) {
  return value === 'expert' || value === 'senior' || value === 'junior' ? value : 'senior';
}

function normalizeSettings(value: unknown): ReviewerSettings {
  const settings = value && typeof value === 'object' ? (value as any) : {};
  const levelThresholds = settings.levelThresholds ?? {};
  const scoringWeights = settings.scoringWeights ?? {};
  const reviewPolicy = settings.reviewPolicy ?? {};

  return {
    levelThresholds: {
      seniorMinTrustScore: numberInRange(
        levelThresholds.seniorMinTrustScore,
        DEFAULT_SETTINGS.levelThresholds.seniorMinTrustScore
      ),
      seniorMinAccuracyScore: numberInRange(
        levelThresholds.seniorMinAccuracyScore,
        DEFAULT_SETTINGS.levelThresholds.seniorMinAccuracyScore
      ),
      seniorMinReviewCount: numberInRange(
        levelThresholds.seniorMinReviewCount,
        DEFAULT_SETTINGS.levelThresholds.seniorMinReviewCount,
        0,
        10000
      ),
      expertMinTrustScore: numberInRange(
        levelThresholds.expertMinTrustScore,
        DEFAULT_SETTINGS.levelThresholds.expertMinTrustScore
      ),
      expertMinAccuracyScore: numberInRange(
        levelThresholds.expertMinAccuracyScore,
        DEFAULT_SETTINGS.levelThresholds.expertMinAccuracyScore
      ),
      expertMinReviewCount: numberInRange(
        levelThresholds.expertMinReviewCount,
        DEFAULT_SETTINGS.levelThresholds.expertMinReviewCount,
        0,
        10000
      ),
    },
    scoringWeights: {
      trustScore: numberInRange(scoringWeights.trustScore, DEFAULT_SETTINGS.scoringWeights.trustScore),
      accuracyScore: numberInRange(
        scoringWeights.accuracyScore,
        DEFAULT_SETTINGS.scoringWeights.accuracyScore
      ),
      approvalConsistency: numberInRange(
        scoringWeights.approvalConsistency,
        DEFAULT_SETTINGS.scoringWeights.approvalConsistency
      ),
      reviewVolume: numberInRange(
        scoringWeights.reviewVolume,
        DEFAULT_SETTINGS.scoringWeights.reviewVolume
      ),
    },
    reviewPolicy: {
      autoLevelEnabled: reviewPolicy.autoLevelEnabled === true,
      requireProofUrls: reviewPolicy.requireProofUrls !== false,
      minVerifiedReviewsForPublish: numberInRange(
        reviewPolicy.minVerifiedReviewsForPublish,
        DEFAULT_SETTINGS.reviewPolicy.minVerifiedReviewsForPublish,
        0,
        10000
      ),
      allowPublishMinLevel: cleanLevel(reviewPolicy.allowPublishMinLevel),
      lowTrustWarningScore: numberInRange(
        reviewPolicy.lowTrustWarningScore,
        DEFAULT_SETTINGS.reviewPolicy.lowTrustWarningScore
      ),
      staleReviewDays: numberInRange(
        reviewPolicy.staleReviewDays,
        DEFAULT_SETTINGS.reviewPolicy.staleReviewDays,
        1,
        365
      ),
    },
  };
}

function isMissingSettingsTable(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return (
    text.includes('reviewer_settings') &&
    (text.includes('does not exist') || text.includes('schema cache'))
  );
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

  const { data, error } = await supabase.client
    .from('reviewer_settings')
    .select('value, updated_at')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({
        data: DEFAULT_SETTINGS,
        updatedAt: '',
        needsMigration: true,
        message: 'ยังไม่มีตาราง reviewer_settings กรุณารัน docs/supabase-creators.sql',
      });
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: normalizeSettings(data?.value),
    updatedAt: data?.updated_at ?? '',
    needsMigration: false,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireReviewerAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const settings = normalizeSettings(body.settings ?? body);
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from('reviewer_settings')
    .upsert({
      key: SETTINGS_KEY,
      value: settings,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .select('value, updated_at')
    .single();

  if (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json(
        { message: 'ยังไม่มีตาราง reviewer_settings กรุณารัน docs/supabase-creators.sql' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: normalizeSettings(data?.value),
    updatedAt: data?.updated_at ?? '',
  });
}

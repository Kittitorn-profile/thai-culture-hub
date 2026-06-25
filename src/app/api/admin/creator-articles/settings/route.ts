import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getBearerToken } from 'src/server/creator-auth';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const SETTINGS_KEY = 'default';

const DEFAULT_SETTINGS = {
  scoreThresholds: {
    approveMinScore: 70,
    publishMinScore: 85,
    rejectBelowScore: 50,
  },
  scoreWeights: {
    title: 15,
    coverImage: 15,
    source: 20,
    category: 10,
    excerpt: 15,
    contentLength: 25,
  },
  reviewPolicy: {
    requireScoreBeforeApprove: true,
    requireSourceForPublish: true,
    minimumWordCount: 300,
    maximumMinorIssueCount: 3,
  },
};

type ArticleReviewSettings = typeof DEFAULT_SETTINGS;

async function requireCreatorAdmin(request: NextRequest) {
  return verifyAdminAccessToken(getBearerToken(request.headers), ADMIN_PERMISSION.creators);
}

function numberInRange(value: unknown, fallback: number, min = 0, max = 100) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function normalizeSettings(value: unknown): ArticleReviewSettings {
  const settings = value && typeof value === 'object' ? (value as any) : {};
  const scoreThresholds = settings.scoreThresholds ?? {};
  const scoreWeights = settings.scoreWeights ?? {};
  const reviewPolicy = settings.reviewPolicy ?? {};

  return {
    scoreThresholds: {
      approveMinScore: numberInRange(
        scoreThresholds.approveMinScore,
        DEFAULT_SETTINGS.scoreThresholds.approveMinScore
      ),
      publishMinScore: numberInRange(
        scoreThresholds.publishMinScore,
        DEFAULT_SETTINGS.scoreThresholds.publishMinScore
      ),
      rejectBelowScore: numberInRange(
        scoreThresholds.rejectBelowScore,
        DEFAULT_SETTINGS.scoreThresholds.rejectBelowScore
      ),
    },
    scoreWeights: {
      title: numberInRange(scoreWeights.title, DEFAULT_SETTINGS.scoreWeights.title),
      coverImage: numberInRange(scoreWeights.coverImage, DEFAULT_SETTINGS.scoreWeights.coverImage),
      source: numberInRange(scoreWeights.source, DEFAULT_SETTINGS.scoreWeights.source),
      category: numberInRange(scoreWeights.category, DEFAULT_SETTINGS.scoreWeights.category),
      excerpt: numberInRange(scoreWeights.excerpt, DEFAULT_SETTINGS.scoreWeights.excerpt),
      contentLength: numberInRange(
        scoreWeights.contentLength,
        DEFAULT_SETTINGS.scoreWeights.contentLength
      ),
    },
    reviewPolicy: {
      requireScoreBeforeApprove: reviewPolicy.requireScoreBeforeApprove !== false,
      requireSourceForPublish: reviewPolicy.requireSourceForPublish !== false,
      minimumWordCount: numberInRange(
        reviewPolicy.minimumWordCount,
        DEFAULT_SETTINGS.reviewPolicy.minimumWordCount,
        0,
        10000
      ),
      maximumMinorIssueCount: numberInRange(
        reviewPolicy.maximumMinorIssueCount,
        DEFAULT_SETTINGS.reviewPolicy.maximumMinorIssueCount,
        0,
        100
      ),
    },
  };
}

function isMissingSettingsTable(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return (
    text.includes('creator_article_review_settings') &&
    (text.includes('does not exist') || text.includes('schema cache'))
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireCreatorAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from('creator_article_review_settings')
    .select('value, updated_at')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({
        data: DEFAULT_SETTINGS,
        updatedAt: '',
        needsMigration: true,
        message:
          'ยังไม่มีตาราง creator_article_review_settings กรุณารัน docs/supabase-creators.sql',
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
  const auth = await requireCreatorAdmin(request);

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
    .from('creator_article_review_settings')
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
        {
          message:
            'ยังไม่มีตาราง creator_article_review_settings กรุณารัน docs/supabase-creators.sql',
        },
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

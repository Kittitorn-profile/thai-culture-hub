import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const SETTINGS_KEY = 'default';

const DEFAULT_SETTINGS = {
  badgeImages: {
    qualityContributor: '',
    reliableContributor: '',
    topContributor: '',
    textileSpecialist: '',
    festivalSpecialist: '',
    ethnicCultureSpecialist: '',
    localFoodSpecialist: '',
    wisdomKeeper: '',
  },
  levelThresholds: {
    qualityMinPublishedArticles: 1,
    qualityMinQualityScore: 70,
    qualityMinTotalViews: 100,
    reliableMinPublishedArticles: 5,
    reliableMinQualityScore: 82,
    reliableMinTotalViews: 800,
    topMinPublishedArticles: 15,
    topMinQualityScore: 90,
    topMinTotalViews: 3000,
  },
  specialtyBadges: {
    textileMinArticles: 3,
    textileMinQualityScore: 75,
    festivalMinArticles: 3,
    festivalMinQualityScore: 75,
    ethnicCultureMinArticles: 3,
    ethnicCultureMinQualityScore: 75,
    localFoodMinArticles: 3,
    localFoodMinQualityScore: 75,
    wisdomMinArticles: 3,
    wisdomMinQualityScore: 75,
  },
  scoringWeights: {
    publishedArticles: 35,
    articleQualityScore: 35,
    engagementScore: 20,
    profileCompleteness: 10,
  },
  creatorPolicy: {
    autoLevelEnabled: false,
    requireApprovedProfile: true,
    requireActiveAccount: true,
    minScoreToShowBadge: 70,
    inactiveWarningDays: 45,
    publicBadgeMinLevel: 'quality',
  },
};

type CreatorSettings = typeof DEFAULT_SETTINGS;

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

async function requireCreatorAdmin(request: NextRequest) {
  return verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.creators);
}

function numberInRange(value: unknown, fallback: number, min = 0, max = 100) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function cleanCreatorLevel(value: unknown) {
  return value === 'top' || value === 'reliable' || value === 'quality' ? value : 'quality';
}

function cleanUrl(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSettings(value: unknown): CreatorSettings {
  const settings = value && typeof value === 'object' ? (value as any) : {};
  const badgeImages = settings.badgeImages ?? {};
  const levelThresholds = settings.levelThresholds ?? {};
  const specialtyBadges = settings.specialtyBadges ?? {};
  const scoringWeights = settings.scoringWeights ?? {};
  const creatorPolicy = settings.creatorPolicy ?? {};

  return {
    badgeImages: {
      qualityContributor: cleanUrl(badgeImages.qualityContributor),
      reliableContributor: cleanUrl(badgeImages.reliableContributor),
      topContributor: cleanUrl(badgeImages.topContributor),
      textileSpecialist: cleanUrl(badgeImages.textileSpecialist),
      festivalSpecialist: cleanUrl(badgeImages.festivalSpecialist),
      ethnicCultureSpecialist: cleanUrl(badgeImages.ethnicCultureSpecialist),
      localFoodSpecialist: cleanUrl(badgeImages.localFoodSpecialist),
      wisdomKeeper: cleanUrl(badgeImages.wisdomKeeper),
    },
    levelThresholds: {
      qualityMinPublishedArticles: numberInRange(
        levelThresholds.qualityMinPublishedArticles ?? levelThresholds.trustedMinPublishedArticles,
        DEFAULT_SETTINGS.levelThresholds.qualityMinPublishedArticles,
        0,
        10000
      ),
      qualityMinQualityScore: numberInRange(
        levelThresholds.qualityMinQualityScore ?? levelThresholds.trustedMinQualityScore,
        DEFAULT_SETTINGS.levelThresholds.qualityMinQualityScore
      ),
      qualityMinTotalViews: numberInRange(
        levelThresholds.qualityMinTotalViews ?? levelThresholds.trustedMinTotalViews,
        DEFAULT_SETTINGS.levelThresholds.qualityMinTotalViews,
        0,
        10000000
      ),
      reliableMinPublishedArticles: numberInRange(
        levelThresholds.reliableMinPublishedArticles ?? levelThresholds.proMinPublishedArticles,
        DEFAULT_SETTINGS.levelThresholds.reliableMinPublishedArticles,
        0,
        10000
      ),
      reliableMinQualityScore: numberInRange(
        levelThresholds.reliableMinQualityScore ?? levelThresholds.proMinQualityScore,
        DEFAULT_SETTINGS.levelThresholds.reliableMinQualityScore
      ),
      reliableMinTotalViews: numberInRange(
        levelThresholds.reliableMinTotalViews ?? levelThresholds.proMinTotalViews,
        DEFAULT_SETTINGS.levelThresholds.reliableMinTotalViews,
        0,
        10000000
      ),
      topMinPublishedArticles: numberInRange(
        levelThresholds.topMinPublishedArticles ?? levelThresholds.ambassadorMinPublishedArticles,
        DEFAULT_SETTINGS.levelThresholds.topMinPublishedArticles,
        0,
        10000
      ),
      topMinQualityScore: numberInRange(
        levelThresholds.topMinQualityScore ?? levelThresholds.ambassadorMinQualityScore,
        DEFAULT_SETTINGS.levelThresholds.topMinQualityScore
      ),
      topMinTotalViews: numberInRange(
        levelThresholds.topMinTotalViews ?? levelThresholds.ambassadorMinTotalViews,
        DEFAULT_SETTINGS.levelThresholds.topMinTotalViews,
        0,
        10000000
      ),
    },
    specialtyBadges: {
      textileMinArticles: numberInRange(
        specialtyBadges.textileMinArticles,
        DEFAULT_SETTINGS.specialtyBadges.textileMinArticles,
        0,
        10000
      ),
      textileMinQualityScore: numberInRange(
        specialtyBadges.textileMinQualityScore,
        DEFAULT_SETTINGS.specialtyBadges.textileMinQualityScore
      ),
      festivalMinArticles: numberInRange(
        specialtyBadges.festivalMinArticles,
        DEFAULT_SETTINGS.specialtyBadges.festivalMinArticles,
        0,
        10000
      ),
      festivalMinQualityScore: numberInRange(
        specialtyBadges.festivalMinQualityScore,
        DEFAULT_SETTINGS.specialtyBadges.festivalMinQualityScore
      ),
      ethnicCultureMinArticles: numberInRange(
        specialtyBadges.ethnicCultureMinArticles,
        DEFAULT_SETTINGS.specialtyBadges.ethnicCultureMinArticles,
        0,
        10000
      ),
      ethnicCultureMinQualityScore: numberInRange(
        specialtyBadges.ethnicCultureMinQualityScore,
        DEFAULT_SETTINGS.specialtyBadges.ethnicCultureMinQualityScore
      ),
      localFoodMinArticles: numberInRange(
        specialtyBadges.localFoodMinArticles,
        DEFAULT_SETTINGS.specialtyBadges.localFoodMinArticles,
        0,
        10000
      ),
      localFoodMinQualityScore: numberInRange(
        specialtyBadges.localFoodMinQualityScore,
        DEFAULT_SETTINGS.specialtyBadges.localFoodMinQualityScore
      ),
      wisdomMinArticles: numberInRange(
        specialtyBadges.wisdomMinArticles,
        DEFAULT_SETTINGS.specialtyBadges.wisdomMinArticles,
        0,
        10000
      ),
      wisdomMinQualityScore: numberInRange(
        specialtyBadges.wisdomMinQualityScore,
        DEFAULT_SETTINGS.specialtyBadges.wisdomMinQualityScore
      ),
    },
    scoringWeights: {
      publishedArticles: numberInRange(
        scoringWeights.publishedArticles,
        DEFAULT_SETTINGS.scoringWeights.publishedArticles
      ),
      articleQualityScore: numberInRange(
        scoringWeights.articleQualityScore,
        DEFAULT_SETTINGS.scoringWeights.articleQualityScore
      ),
      engagementScore: numberInRange(
        scoringWeights.engagementScore,
        DEFAULT_SETTINGS.scoringWeights.engagementScore
      ),
      profileCompleteness: numberInRange(
        scoringWeights.profileCompleteness,
        DEFAULT_SETTINGS.scoringWeights.profileCompleteness
      ),
    },
    creatorPolicy: {
      autoLevelEnabled: creatorPolicy.autoLevelEnabled === true,
      requireApprovedProfile: creatorPolicy.requireApprovedProfile !== false,
      requireActiveAccount: creatorPolicy.requireActiveAccount !== false,
      minScoreToShowBadge: numberInRange(
        creatorPolicy.minScoreToShowBadge,
        DEFAULT_SETTINGS.creatorPolicy.minScoreToShowBadge
      ),
      inactiveWarningDays: numberInRange(
        creatorPolicy.inactiveWarningDays,
        DEFAULT_SETTINGS.creatorPolicy.inactiveWarningDays,
        1,
        365
      ),
      publicBadgeMinLevel: cleanCreatorLevel(
        creatorPolicy.publicBadgeMinLevel ?? creatorPolicy.allowSubmitMinLevel
      ),
    },
  };
}

function isMissingSettingsTable(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return (
    text.includes('creator_settings') &&
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
    .from('creator_settings')
    .select('value, updated_at')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({
        data: DEFAULT_SETTINGS,
        updatedAt: '',
        needsMigration: true,
        message: 'ยังไม่มีตาราง creator_settings กรุณารัน docs/supabase-creators.sql',
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
    .from('creator_settings')
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
        { message: 'ยังไม่มีตาราง creator_settings กรุณารัน docs/supabase-creators.sql' },
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

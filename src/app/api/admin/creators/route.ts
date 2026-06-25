import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
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
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, warning_note, warned_at, reviewed_at, reject_reason, created_at, updated_at';
const LEGACY_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at';

const DEFAULT_CREATOR_SETTINGS = {
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

const DEFAULT_ARTICLE_REVIEW_SETTINGS = {
  scoreWeights: {
    title: 15,
    coverImage: 15,
    source: 20,
    category: 10,
    excerpt: 15,
    contentLength: 25,
  },
  reviewPolicy: {
    minimumWordCount: 300,
  },
};

type CreatorSettings = typeof DEFAULT_CREATOR_SETTINGS;
type ArticleReviewSettings = typeof DEFAULT_ARTICLE_REVIEW_SETTINGS;
type CreatorAward = {
  key: string;
  title: string;
  subtitle: string;
  imageUrl: string;
};

function normalizeStatus(value: string): CreatorStatus | null {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }

  return null;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function getActiveStateByUserId(client: any, userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, boolean>();
  }

  const { data } = await client.from(USERS_TABLE).select('id, is_active').in('id', userIds);

  return new Map(
    ((data ?? []) as Array<{ id: string; is_active: boolean | null }>).map((row) => [
      row.id,
      row.is_active !== false,
    ])
  );
}

function isMissingCreatorWarningColumn(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');

  return text.includes('warning_note') || text.includes('warned_at');
}

function numberInRange(value: unknown, fallback: number, min = 0, max = 10000000) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function cleanUrl(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCreatorSettings(value: unknown): CreatorSettings {
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
        levelThresholds.qualityMinPublishedArticles,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.qualityMinPublishedArticles
      ),
      qualityMinQualityScore: numberInRange(
        levelThresholds.qualityMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.qualityMinQualityScore
      ),
      qualityMinTotalViews: numberInRange(
        levelThresholds.qualityMinTotalViews,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.qualityMinTotalViews
      ),
      reliableMinPublishedArticles: numberInRange(
        levelThresholds.reliableMinPublishedArticles,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.reliableMinPublishedArticles
      ),
      reliableMinQualityScore: numberInRange(
        levelThresholds.reliableMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.reliableMinQualityScore
      ),
      reliableMinTotalViews: numberInRange(
        levelThresholds.reliableMinTotalViews,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.reliableMinTotalViews
      ),
      topMinPublishedArticles: numberInRange(
        levelThresholds.topMinPublishedArticles,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.topMinPublishedArticles
      ),
      topMinQualityScore: numberInRange(
        levelThresholds.topMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.topMinQualityScore
      ),
      topMinTotalViews: numberInRange(
        levelThresholds.topMinTotalViews,
        DEFAULT_CREATOR_SETTINGS.levelThresholds.topMinTotalViews
      ),
    },
    specialtyBadges: {
      textileMinArticles: numberInRange(
        specialtyBadges.textileMinArticles,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.textileMinArticles
      ),
      textileMinQualityScore: numberInRange(
        specialtyBadges.textileMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.textileMinQualityScore
      ),
      festivalMinArticles: numberInRange(
        specialtyBadges.festivalMinArticles,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.festivalMinArticles
      ),
      festivalMinQualityScore: numberInRange(
        specialtyBadges.festivalMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.festivalMinQualityScore
      ),
      ethnicCultureMinArticles: numberInRange(
        specialtyBadges.ethnicCultureMinArticles,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.ethnicCultureMinArticles
      ),
      ethnicCultureMinQualityScore: numberInRange(
        specialtyBadges.ethnicCultureMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.ethnicCultureMinQualityScore
      ),
      localFoodMinArticles: numberInRange(
        specialtyBadges.localFoodMinArticles,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.localFoodMinArticles
      ),
      localFoodMinQualityScore: numberInRange(
        specialtyBadges.localFoodMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.localFoodMinQualityScore
      ),
      wisdomMinArticles: numberInRange(
        specialtyBadges.wisdomMinArticles,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.wisdomMinArticles
      ),
      wisdomMinQualityScore: numberInRange(
        specialtyBadges.wisdomMinQualityScore,
        DEFAULT_CREATOR_SETTINGS.specialtyBadges.wisdomMinQualityScore
      ),
    },
    scoringWeights: {
      publishedArticles: numberInRange(
        scoringWeights.publishedArticles,
        DEFAULT_CREATOR_SETTINGS.scoringWeights.publishedArticles,
        0,
        100
      ),
      articleQualityScore: numberInRange(
        scoringWeights.articleQualityScore,
        DEFAULT_CREATOR_SETTINGS.scoringWeights.articleQualityScore,
        0,
        100
      ),
      engagementScore: numberInRange(
        scoringWeights.engagementScore,
        DEFAULT_CREATOR_SETTINGS.scoringWeights.engagementScore,
        0,
        100
      ),
      profileCompleteness: numberInRange(
        scoringWeights.profileCompleteness,
        DEFAULT_CREATOR_SETTINGS.scoringWeights.profileCompleteness,
        0,
        100
      ),
    },
    creatorPolicy: {
      autoLevelEnabled: creatorPolicy.autoLevelEnabled === true,
      requireApprovedProfile: creatorPolicy.requireApprovedProfile !== false,
      requireActiveAccount: creatorPolicy.requireActiveAccount !== false,
      minScoreToShowBadge: numberInRange(
        creatorPolicy.minScoreToShowBadge,
        DEFAULT_CREATOR_SETTINGS.creatorPolicy.minScoreToShowBadge,
        0,
        100
      ),
      inactiveWarningDays: numberInRange(
        creatorPolicy.inactiveWarningDays,
        DEFAULT_CREATOR_SETTINGS.creatorPolicy.inactiveWarningDays,
        1,
        365
      ),
      publicBadgeMinLevel:
        creatorPolicy.publicBadgeMinLevel === 'top' || creatorPolicy.publicBadgeMinLevel === 'reliable'
          ? creatorPolicy.publicBadgeMinLevel
          : 'quality',
    },
  };
}

function normalizeArticleReviewSettings(value: unknown): ArticleReviewSettings {
  const settings = value && typeof value === 'object' ? (value as any) : {};
  const scoreWeights = settings.scoreWeights ?? {};
  const reviewPolicy = settings.reviewPolicy ?? {};

  return {
    scoreWeights: {
      title: numberInRange(scoreWeights.title, DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.title, 0, 100),
      coverImage: numberInRange(
        scoreWeights.coverImage,
        DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.coverImage,
        0,
        100
      ),
      source: numberInRange(scoreWeights.source, DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.source, 0, 100),
      category: numberInRange(
        scoreWeights.category,
        DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.category,
        0,
        100
      ),
      excerpt: numberInRange(
        scoreWeights.excerpt,
        DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.excerpt,
        0,
        100
      ),
      contentLength: numberInRange(
        scoreWeights.contentLength,
        DEFAULT_ARTICLE_REVIEW_SETTINGS.scoreWeights.contentLength,
        0,
        100
      ),
    },
    reviewPolicy: {
      minimumWordCount: numberInRange(
        reviewPolicy.minimumWordCount,
        DEFAULT_ARTICLE_REVIEW_SETTINGS.reviewPolicy.minimumWordCount,
        0,
        10000
      ),
    },
  };
}

function getPlainArticleText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasArticleSource(article: Record<string, any>) {
  const text = `${article.content_html ?? ''} ${article.excerpt ?? ''}`.toLowerCase();

  return (
    /https?:\/\//i.test(text) ||
    text.includes('href=') ||
    text.includes('แหล่งที่มา') ||
    text.includes('อ้างอิง') ||
    text.includes('ที่มา:')
  );
}

function calculateArticleQualityScore(article: Record<string, any>, settings: ArticleReviewSettings) {
  const plainText = getPlainArticleText(article.content_html ?? '');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const checks = [
    { passed: Boolean(String(article.title ?? '').trim()), weight: settings.scoreWeights.title },
    { passed: Boolean(article.cover_image_url), weight: settings.scoreWeights.coverImage },
    { passed: hasArticleSource(article), weight: settings.scoreWeights.source },
    { passed: Boolean(article.category_key || article.category_label), weight: settings.scoreWeights.category },
    { passed: Boolean(String(article.excerpt ?? '').trim()), weight: settings.scoreWeights.excerpt },
    {
      passed: wordCount >= settings.reviewPolicy.minimumWordCount,
      weight: settings.scoreWeights.contentLength,
    },
  ];
  const totalWeight = checks.reduce((total, check) => total + Number(check.weight || 0), 0);
  const earnedWeight = checks.reduce(
    (total, check) => total + (check.passed ? Number(check.weight || 0) : 0),
    0
  );

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}

function getProfileCompletenessScore(row: Record<string, any>) {
  const fields = [
    row.display_name,
    row.email,
    row.bio,
    row.phone,
    row.province_code,
    row.website_url || row.facebook_url,
    row.avatar_url,
  ];
  const completedCount = fields.filter((value) => Boolean(String(value ?? '').trim())).length;

  return Math.round((completedCount / fields.length) * 100);
}

function getSpecialtyKey(article: Record<string, any>) {
  const text = `${article.category_key ?? ''} ${article.category_label ?? ''}`.toLowerCase();

  if (/(textile|fabric|ผ้า|ทอ|ไหม|cotton)/i.test(text)) return 'textile';
  if (/(festival|event|ประเพณี|เทศกาล|งานบุญ)/i.test(text)) return 'festival';
  if (/(ethnic|ชาติพันธุ์|ชนเผ่า|กลุ่มชาติพันธุ์)/i.test(text)) return 'ethnicCulture';
  if (/(food|local-food|อาหาร|ขนม|ครัว|กิน)/i.test(text)) return 'localFood';
  if (/(wisdom|local-wisdom|ภูมิปัญญา|ช่าง|หัตถกรรม|สืบสาน)/i.test(text)) return 'wisdom';

  return '';
}

function passesContributorBadge(
  publishedArticleCount: number,
  averageQualityScore: number,
  totalViews: number,
  articleField: number,
  qualityField: number,
  viewField: number
) {
  return (
    publishedArticleCount >= articleField &&
    averageQualityScore >= qualityField &&
    totalViews >= viewField
  );
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

  const profileResult = await supabase.client
    .from('creator_profiles')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  let data = profileResult.data as any[] | null;
  let error = profileResult.error;

  if (error && isMissingCreatorWarningColumn(error)) {
    const legacyResult = await supabase.client
      .from('creator_profiles')
      .select(LEGACY_SELECT)
      .order('created_at', { ascending: false })
      .limit(200);

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as any[];
  const creatorIds = rows.map((row) => row.id).filter(Boolean);
  const activeStateByUserId = await getActiveStateByUserId(
    supabase.client,
    rows.map((row) => row.user_id).filter(Boolean)
  );
  const [creatorSettingsResult, articleReviewSettingsResult, articlesResult] = await Promise.all([
    (async () => {
      try {
        return await supabase.client
          .from('creator_settings')
          .select('value')
          .eq('key', 'default')
          .maybeSingle();
      } catch {
        return { data: null };
      }
    })(),
    (async () => {
      try {
        return await supabase.client
          .from('creator_article_review_settings')
          .select('value')
          .eq('key', 'default')
          .maybeSingle();
      } catch {
        return { data: null };
      }
    })(),
    (async () => {
      if (!creatorIds.length) {
        return { data: [] };
      }

      try {
        return await supabase.client
          .from('creator_articles')
          .select(
            'id, creator_id, category_key, category_label, title, excerpt, cover_image_url, content_html, status, is_active'
          )
          .in('creator_id', creatorIds)
          .in('status', ['published', 'approved'])
          .eq('is_active', true);
      } catch {
        return { data: [] };
      }
    })(),
  ]);
  const creatorSettings = normalizeCreatorSettings(creatorSettingsResult.data?.value);
  const articleReviewSettings = normalizeArticleReviewSettings(articleReviewSettingsResult.data?.value);
  const publishedArticles = ((articlesResult.data ?? []) as any[]).map((article) => ({
    ...article,
    qualityScore: calculateArticleQualityScore(article, articleReviewSettings),
  }));
  const articleIds = publishedArticles.map((article) => article.id).filter(Boolean);
  const [viewsResult, likesResult] = await Promise.all([
    (async () => {
      if (!articleIds.length) {
        return { data: [] };
      }

      try {
        return await supabase.client
          .from('creator_article_views')
          .select('article_id')
          .in('article_id', articleIds);
      } catch {
        return { data: [] };
      }
    })(),
    (async () => {
      if (!articleIds.length) {
        return { data: [] };
      }

      try {
        return await supabase.client
          .from('creator_article_likes')
          .select('article_id')
          .in('article_id', articleIds);
      } catch {
        return { data: [] };
      }
    })(),
  ]);
  const viewCountByArticleId = new Map<string, number>();
  const likeCountByArticleId = new Map<string, number>();

  ((viewsResult.data ?? []) as Array<{ article_id: string }>).forEach((row) => {
    viewCountByArticleId.set(row.article_id, (viewCountByArticleId.get(row.article_id) ?? 0) + 1);
  });
  ((likesResult.data ?? []) as Array<{ article_id: string }>).forEach((row) => {
    likeCountByArticleId.set(row.article_id, (likeCountByArticleId.get(row.article_id) ?? 0) + 1);
  });
  const articlesByCreatorId = new Map<string, any[]>();

  publishedArticles.forEach((article) => {
    const currentArticles = articlesByCreatorId.get(article.creator_id) ?? [];

    currentArticles.push(article);
    articlesByCreatorId.set(article.creator_id, currentArticles);
  });

  const getCreatorScorePayload = (row: any) => {
    const creatorArticles = articlesByCreatorId.get(row.id) ?? [];
    const publishedArticleCount = creatorArticles.length;
    const totalViews = creatorArticles.reduce(
      (total, article) => total + (viewCountByArticleId.get(article.id) ?? 0),
      0
    );
    const totalLikes = creatorArticles.reduce(
      (total, article) => total + (likeCountByArticleId.get(article.id) ?? 0),
      0
    );
    const averageQualityScore = publishedArticleCount
      ? Math.round(
          creatorArticles.reduce((total, article) => total + article.qualityScore, 0) /
            publishedArticleCount
        )
      : 0;
    const profileCompletenessScore = getProfileCompletenessScore(row);
    const topArticleThreshold = Math.max(
      creatorSettings.levelThresholds.topMinPublishedArticles,
      1
    );
    const topViewThreshold = Math.max(creatorSettings.levelThresholds.topMinTotalViews, 1);
    const publishedArticleScore = Math.min(
      100,
      Math.round((publishedArticleCount / topArticleThreshold) * 100)
    );
    const engagementScore = Math.min(
      100,
      Math.round(((totalViews + totalLikes * 3) / topViewThreshold) * 100)
    );
    const weightTotal = Math.max(
      Object.values(creatorSettings.scoringWeights).reduce(
        (total, value) => total + Number(value || 0),
        0
      ),
      1
    );
    const totalScore = Math.round(
      (publishedArticleScore * creatorSettings.scoringWeights.publishedArticles +
        averageQualityScore * creatorSettings.scoringWeights.articleQualityScore +
        engagementScore * creatorSettings.scoringWeights.engagementScore +
        profileCompletenessScore * creatorSettings.scoringWeights.profileCompleteness) /
        weightTotal
    );
    const awards: CreatorAward[] = [];
    const canShowBadge =
      totalScore >= creatorSettings.creatorPolicy.minScoreToShowBadge &&
      (!creatorSettings.creatorPolicy.requireApprovedProfile || row.status === 'approved') &&
      (!creatorSettings.creatorPolicy.requireActiveAccount ||
        activeStateByUserId.get(row.user_id) !== false);

    if (canShowBadge) {
      if (
        passesContributorBadge(
          publishedArticleCount,
          averageQualityScore,
          totalViews,
          creatorSettings.levelThresholds.topMinPublishedArticles,
          creatorSettings.levelThresholds.topMinQualityScore,
          creatorSettings.levelThresholds.topMinTotalViews
        )
      ) {
        awards.push({
          key: 'topContributor',
          title: 'TOP CONTRIBUTOR',
          subtitle: 'ผู้มีส่วนร่วมยอดเยี่ยม',
          imageUrl: creatorSettings.badgeImages.topContributor,
        });
      } else if (
        passesContributorBadge(
          publishedArticleCount,
          averageQualityScore,
          totalViews,
          creatorSettings.levelThresholds.reliableMinPublishedArticles,
          creatorSettings.levelThresholds.reliableMinQualityScore,
          creatorSettings.levelThresholds.reliableMinTotalViews
        )
      ) {
        awards.push({
          key: 'reliableContributor',
          title: 'RELIABLE CONTRIBUTOR',
          subtitle: 'ผู้ให้ข้อมูลน่าเชื่อถือ',
          imageUrl: creatorSettings.badgeImages.reliableContributor,
        });
      } else if (
        passesContributorBadge(
          publishedArticleCount,
          averageQualityScore,
          totalViews,
          creatorSettings.levelThresholds.qualityMinPublishedArticles,
          creatorSettings.levelThresholds.qualityMinQualityScore,
          creatorSettings.levelThresholds.qualityMinTotalViews
        )
      ) {
        awards.push({
          key: 'qualityContributor',
          title: 'QUALITY CONTRIBUTOR',
          subtitle: 'ผู้สร้างสรรค์คุณภาพ',
          imageUrl: creatorSettings.badgeImages.qualityContributor,
        });
      }

      const specialtyStats = new Map<string, { count: number; qualityScoreTotal: number }>();

      creatorArticles.forEach((article) => {
        const specialtyKey = getSpecialtyKey(article);

        if (!specialtyKey) return;

        const currentStats = specialtyStats.get(specialtyKey) ?? { count: 0, qualityScoreTotal: 0 };

        specialtyStats.set(specialtyKey, {
          count: currentStats.count + 1,
          qualityScoreTotal: currentStats.qualityScoreTotal + article.qualityScore,
        });
      });

      [
        {
          key: 'textile',
          awardKey: 'textileSpecialist',
          title: 'TEXTILE SPECIALIST',
          subtitle: 'ผู้เชี่ยวชาญด้านผ้าไทย',
          imageUrl: creatorSettings.badgeImages.textileSpecialist,
          minArticles: creatorSettings.specialtyBadges.textileMinArticles,
          minQualityScore: creatorSettings.specialtyBadges.textileMinQualityScore,
        },
        {
          key: 'festival',
          awardKey: 'festivalSpecialist',
          title: 'FESTIVAL SPECIALIST',
          subtitle: 'ผู้เชี่ยวชาญด้านประเพณี',
          imageUrl: creatorSettings.badgeImages.festivalSpecialist,
          minArticles: creatorSettings.specialtyBadges.festivalMinArticles,
          minQualityScore: creatorSettings.specialtyBadges.festivalMinQualityScore,
        },
        {
          key: 'ethnicCulture',
          awardKey: 'ethnicCultureSpecialist',
          title: 'ETHNIC CULTURE SPECIALIST',
          subtitle: 'ผู้เชี่ยวชาญด้านชาติพันธุ์',
          imageUrl: creatorSettings.badgeImages.ethnicCultureSpecialist,
          minArticles: creatorSettings.specialtyBadges.ethnicCultureMinArticles,
          minQualityScore: creatorSettings.specialtyBadges.ethnicCultureMinQualityScore,
        },
        {
          key: 'localFood',
          awardKey: 'localFoodSpecialist',
          title: 'LOCAL FOOD SPECIALIST',
          subtitle: 'ผู้เชี่ยวชาญด้านอาหารพื้นถิ่น',
          imageUrl: creatorSettings.badgeImages.localFoodSpecialist,
          minArticles: creatorSettings.specialtyBadges.localFoodMinArticles,
          minQualityScore: creatorSettings.specialtyBadges.localFoodMinQualityScore,
        },
        {
          key: 'wisdom',
          awardKey: 'wisdomKeeper',
          title: 'WISDOM KEEPER',
          subtitle: 'ผู้สืบสานภูมิปัญญา',
          imageUrl: creatorSettings.badgeImages.wisdomKeeper,
          minArticles: creatorSettings.specialtyBadges.wisdomMinArticles,
          minQualityScore: creatorSettings.specialtyBadges.wisdomMinQualityScore,
        },
      ].forEach((badge) => {
        const stats = specialtyStats.get(badge.key);
        const averageSpecialtyQuality = stats?.count
          ? Math.round(stats.qualityScoreTotal / stats.count)
          : 0;

        if (
          stats &&
          stats.count >= badge.minArticles &&
          averageSpecialtyQuality >= badge.minQualityScore
        ) {
          awards.push({
            key: badge.awardKey,
            title: badge.title,
            subtitle: badge.subtitle,
            imageUrl: badge.imageUrl,
          });
        }
      });
    }

    return {
      creatorScore: {
        totalScore,
        publishedArticleCount,
        averageQualityScore,
        totalViews,
        totalLikes,
        profileCompletenessScore,
      },
      creatorAwards: awards,
    };
  };

  return NextResponse.json({
    data: rows.map((row) => {
      const profile = mapCreatorProfile({
        ...row,
        is_active: activeStateByUserId.get(row.user_id) ?? true,
      });

      return {
        ...profile,
        ...getCreatorScorePayload(row),
      };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request.headers), ADMIN_PERMISSION.creators);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);
  const action = cleanText(body.action);
  const password = cleanText(body.password);

  if (action === 'resetPassword') {
    if (!id) {
      return NextResponse.json({ message: 'Valid creator id is required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase.ok) {
      return NextResponse.json({ message: supabase.error }, { status: 500 });
    }

    const profileResult = await supabase.client
      .from('creator_profiles')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (profileResult.error) {
      return NextResponse.json({ message: profileResult.error.message }, { status: 500 });
    }

    if (!profileResult.data?.user_id) {
      return NextResponse.json({ message: 'Creator user account not found' }, { status: 404 });
    }

    const updateResult = await supabase.client
      .from(USERS_TABLE)
      .update({ password_hash: `sha256:${sha256(password)}` })
      .eq('id', profileResult.data.user_id);

    if (updateResult.error) {
      return NextResponse.json({ message: updateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Creator password reset' });
  }

  const status = normalizeStatus(cleanText(body.status));
  const rejectReason = cleanText(body.rejectReason);
  const warningNote = cleanText(body.warningNote);
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;

  if (!id || !status) {
    return NextResponse.json({ message: 'Valid creator id and status are required' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectReason) {
    return NextResponse.json({ message: 'Reject reason is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const profileUpdate = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: auth.user.id,
    reject_reason: status === 'rejected' ? rejectReason : null,
    warning_note: warningNote || null,
    warned_at: warningNote ? new Date().toISOString() : null,
  };

  const profileResult = await supabase.client
    .from('creator_profiles')
    .update(profileUpdate)
    .eq('id', id)
    .select(SELECT)
    .single();
  let data = profileResult.data as any;
  let error = profileResult.error;

  if (error && isMissingCreatorWarningColumn(error)) {
    if (warningNote) {
      return NextResponse.json(
        {
          message:
            'ยังไม่มี column warning_note/warned_at ใน creator_profiles กรุณารัน docs/supabase-creators.sql ก่อนบันทึกคำเตือน',
        },
        { status: 500 }
      );
    }

    const legacyResult = await supabase.client
      .from('creator_profiles')
      .update({
        status,
        reviewed_at: profileUpdate.reviewed_at,
        reviewed_by: profileUpdate.reviewed_by,
        reject_reason: profileUpdate.reject_reason,
      })
      .eq('id', id)
      .select(LEGACY_SELECT)
      .single();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const nextIsActive = isActive ?? status === 'approved';

  await supabase.client
    .from(USERS_TABLE)
    .update({
      role: 'creator',
      is_active: nextIsActive,
    })
    .eq('id', data.user_id);

  return NextResponse.json({
    data: mapCreatorProfile({
      ...(data as any),
      is_active: nextIsActive,
    }),
  });
}

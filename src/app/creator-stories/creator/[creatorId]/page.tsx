import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { mapCreatorArticle } from 'src/server/creator-auth';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

import { CreatorPublicArticlesView } from 'src/sections/creator/components/creator-public-articles-view';

type Props = {
  params: Promise<{ creatorId: string }>;
};

const INITIAL_LIMIT = 8;
const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';
const ARTICLE_SELECT = `
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
  submitted_at,
  reviewed_at,
  reject_reason,
  published_at,
  created_at,
  updated_at,
  creator_profiles(display_name, email, avatar_url)
`;
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
    requireApprovedProfile: true,
    requireActiveAccount: true,
    minScoreToShowBadge: 70,
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

type CreatorAward = {
  key: string;
  title: string;
  subtitle: string;
  imageUrl: string;
};

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

function normalizeCreatorSettings(value: unknown) {
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
      requireApprovedProfile: creatorPolicy.requireApprovedProfile !== false,
      requireActiveAccount: creatorPolicy.requireActiveAccount !== false,
      minScoreToShowBadge: numberInRange(
        creatorPolicy.minScoreToShowBadge,
        DEFAULT_CREATOR_SETTINGS.creatorPolicy.minScoreToShowBadge,
        0,
        100
      ),
    },
  };
}

function normalizeArticleReviewSettings(value: unknown) {
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

function calculateArticleQualityScore(
  article: Record<string, any>,
  settings: typeof DEFAULT_ARTICLE_REVIEW_SETTINGS
) {
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
  const earnedWeight = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);

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

async function getCreatorPageData(creatorId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  const profileResult = await supabase.client
    .from('creator_profiles')
    .select(
      'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status'
    )
    .eq('id', creatorId)
    .eq('status', 'approved')
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const articlesResult = await supabase.client
    .from('creator_articles')
    .select(ARTICLE_SELECT, { count: 'exact' })
    .eq('creator_id', creatorId)
    .in('status', ['published', 'approved'])
    .eq('is_active', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(0, INITIAL_LIMIT - 1);

  if (articlesResult.error) {
    return null;
  }

  const articles = ((articlesResult.data ?? []) as any[]).map(mapCreatorArticle);
  const total = articlesResult.count ?? articles.length;
  const [settingsResult, reviewSettingsResult, scoreArticlesResult, activeUserResult] = await Promise.all([
    supabase.client.from('creator_settings').select('value').eq('key', 'default').maybeSingle(),
    supabase.client
      .from('creator_article_review_settings')
      .select('value')
      .eq('key', 'default')
      .maybeSingle(),
    supabase.client
      .from('creator_articles')
      .select('id, creator_id, category_key, category_label, title, excerpt, cover_image_url, content_html')
      .eq('creator_id', creatorId)
      .in('status', ['published', 'approved'])
      .eq('is_active', true),
    supabase.client
      .from(USERS_TABLE)
      .select('is_active')
      .eq('id', profileResult.data.user_id)
      .maybeSingle(),
  ]);
  const creatorSettings = normalizeCreatorSettings(settingsResult.data?.value);
  const articleReviewSettings = normalizeArticleReviewSettings(reviewSettingsResult.data?.value);
  const scoreArticles = ((scoreArticlesResult.data ?? []) as any[]).map((article) => ({
    ...article,
    qualityScore: calculateArticleQualityScore(article, articleReviewSettings),
  }));
  const articleIds = scoreArticles.map((article) => article.id).filter(Boolean);
  const [viewsResult, likesResult] = await Promise.all([
    articleIds.length
      ? supabase.client.from('creator_article_views').select('article_id').in('article_id', articleIds)
      : Promise.resolve({ data: [] }),
    articleIds.length
      ? supabase.client.from('creator_article_likes').select('article_id').in('article_id', articleIds)
      : Promise.resolve({ data: [] }),
  ]);
  const totalViews = ((viewsResult.data ?? []) as Array<{ article_id: string }>).length;
  const totalLikes = ((likesResult.data ?? []) as Array<{ article_id: string }>).length;
  const publishedArticleCount = scoreArticles.length;
  const averageQualityScore = publishedArticleCount
    ? Math.round(
        scoreArticles.reduce((sum, article) => sum + article.qualityScore, 0) / publishedArticleCount
      )
    : 0;
  const profileCompletenessScore = getProfileCompletenessScore(profileResult.data);
  const publishedArticleScore = Math.min(
    100,
    Math.round(
      (publishedArticleCount / Math.max(creatorSettings.levelThresholds.topMinPublishedArticles, 1)) *
        100
    )
  );
  const engagementScore = Math.min(
    100,
    Math.round(
      ((totalViews + totalLikes * 3) / Math.max(creatorSettings.levelThresholds.topMinTotalViews, 1)) *
        100
    )
  );
  const weightTotal = Math.max(
    Object.values(creatorSettings.scoringWeights).reduce(
      (sum, value) => sum + Number(value || 0),
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
  const creatorAwards: CreatorAward[] = [];
  const canShowBadge =
    totalScore >= creatorSettings.creatorPolicy.minScoreToShowBadge &&
    (!creatorSettings.creatorPolicy.requireApprovedProfile || profileResult.data.status === 'approved') &&
    (!creatorSettings.creatorPolicy.requireActiveAccount ||
      (activeUserResult.data?.is_active ?? true) !== false);

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
      creatorAwards.push({
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
      creatorAwards.push({
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
      creatorAwards.push({
        key: 'qualityContributor',
        title: 'QUALITY CONTRIBUTOR',
        subtitle: 'ผู้สร้างสรรค์คุณภาพ',
        imageUrl: creatorSettings.badgeImages.qualityContributor,
      });
    }

    const specialtyStats = new Map<string, { count: number; qualityScoreTotal: number }>();

    scoreArticles.forEach((article) => {
      const specialtyKey = getSpecialtyKey(article);

      if (!specialtyKey) return;

      const current = specialtyStats.get(specialtyKey) ?? { count: 0, qualityScoreTotal: 0 };

      specialtyStats.set(specialtyKey, {
        count: current.count + 1,
        qualityScoreTotal: current.qualityScoreTotal + article.qualityScore,
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
        creatorAwards.push({
          key: badge.awardKey,
          title: badge.title,
          subtitle: badge.subtitle,
          imageUrl: badge.imageUrl,
        });
      }
    });
  }

  return {
    creator: {
      id: profileResult.data.id as string,
      displayName: (profileResult.data.display_name as string | null) || 'Creator',
      bio: (profileResult.data.bio as string | null) ?? '',
      avatarUrl: (profileResult.data.avatar_url as string | null) ?? '',
      awards: creatorAwards,
    },
    articles,
    total,
    hasMore: articles.length < total,
    nextOffset: articles.length,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { creatorId } = await params;
  const data = await getCreatorPageData(decodeURIComponent(creatorId));

  if (!data) {
    return { title: 'Creator | Thailand Cultural Hub' };
  }

  return {
    title: `${data.creator.displayName} | Creator | Thailand Cultural Hub`,
    description: data.creator.bio || `รวมงานเขียนจาก ${data.creator.displayName}`,
  };
}

export default async function Page({ params }: Props) {
  const { creatorId } = await params;
  const data = await getCreatorPageData(decodeURIComponent(creatorId));

  if (!data) {
    notFound();
  }

  return (
    <CreatorPublicArticlesView
      creator={data.creator}
      initialArticles={data.articles}
      initialTotal={data.total}
      initialHasMore={data.hasMore}
      initialNextOffset={data.nextOffset}
    />
  );
}

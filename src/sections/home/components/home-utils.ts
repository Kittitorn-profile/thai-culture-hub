import type {
  StoredHomeContent,
  LocalWisdomContent,
  PerformanceGroupEntry,
  PerformanceGroupsContent,
  CultureCategoriesContent,
} from './home-types';

import {
  getTodayCalendarDate,
  formatThaiCalendarDate,
  isSameOrAfterCalendarDate,
} from 'src/utils/calendar-date';

import {
  getCultureCategoryKeyByTitle,
  getCultureCategoryHref as getSharedCultureCategoryHref,
} from 'src/lib/culture-categories';

export function getFilledText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getCultureCategoryKey(title: string) {
  return getCultureCategoryKeyByTitle(title);
}

export function getCultureCategoryHref(categoryKey?: string, categoryLabel?: string) {
  return getSharedCultureCategoryHref(categoryKey, categoryLabel);
}

export function formatCreatorArticleDate(value: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatHomeEventDate(value: string) {
  return formatThaiCalendarDate(value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isUpcomingHomeEvent(value: string) {
  return isSameOrAfterCalendarDate(value, getTodayCalendarDate());
}

export function normalizeStoryContent(story?: StoredHomeContent['story']) {
  if (!story) {
    return undefined;
  }

  const title = getFilledText(story.title);
  const actionLabel = getFilledText(story.actionLabel);
  const body = getFilledText(story.body);

  if (!title || !actionLabel || !body) {
    return undefined;
  }

  return { title, actionLabel, body };
}

export function normalizeLocalWisdomContent(content?: LocalWisdomContent) {
  if (!content) {
    return undefined;
  }

  const title = getFilledText(content.title);
  const body = getFilledText(content.body);
  const quote = getFilledText(content.quote);
  const caption = getFilledText(content.caption);
  const mediaUrl = getFilledText(content.mediaUrl);
  const coverUrl = getFilledText(content.coverUrl);

  if (!title || !body || !mediaUrl) {
    return undefined;
  }

  return {
    title,
    body,
    quote,
    caption,
    mediaUrl,
    coverUrl,
  };
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => getFilledText(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStringListRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeStringList(item)])
  );
}

function normalizeNestedStringListRecord(value: unknown): Record<string, Record<string, string[]>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeStringListRecord(item)])
  );
}

function normalizeNestedStringRecord(value: unknown): Record<string, Record<string, string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [key, {}];
      return [
        key,
        Object.fromEntries(
          Object.entries(item).map(([nestedKey, nestedValue]) => [
            nestedKey,
            getFilledText(nestedValue),
          ])
        ),
      ];
    })
  );
}

export function normalizePerformanceGroupsContent(content?: PerformanceGroupsContent) {
  if (!content) {
    return undefined;
  }

  const title = getFilledText(content.title);
  const description = getFilledText(content.description);

  const groups: PerformanceGroupEntry[] = [];

  for (const group of Array.isArray(content.groups) ? content.groups : []) {
    const name = getFilledText(group?.name);
    if (!name) {
      continue;
    }

    const yearlyData: Array<{
      year: string;
      logoUrl?: string;
      organizerId?: string;
      organizerName?: string;
      organizerColor?: string;
      organizerLogoUrl?: string;
      contestEventIds?: string[];
      contestCategoryIds?: Record<string, string[]>;
      contestResultIds?: Record<string, string[]>;
      contestSingerIds?: Record<string, string[]>;
      contestLeadPerformerIds?: Record<string, string[]>;
      contestCategorySingerIds?: Record<string, Record<string, string[]>>;
      contestCategoryLeadPerformerIds?: Record<string, Record<string, string[]>>;
      contestCategoryBookletUrls?: Record<string, Record<string, string>>;
      contestCategoryBookletNames?: Record<string, Record<string, string>>;
      contestCategoryDetails?: Record<string, Record<string, string>>;
      contestCategoryResultIds?: Record<string, Record<string, string[]>>;
      details?: string;
      about?: string;
      storyTypes?: string[];
      bookletUrl?: string;
      bookletName?: string;
      youtubeUrl?: string;
      singerIds?: string[];
      leadPerformerIds?: string[];
      performanceImages?: string[];
      awards: Array<{ year: string; title: string; description: string }>;
      note: string;
    }> = [];

    for (const yearRecord of Array.isArray(group?.yearlyData) ? group.yearlyData : []) {
      const year = getFilledText(yearRecord?.year);
      const logoUrl = getFilledText(yearRecord?.logoUrl);
      const organizerId = getFilledText(yearRecord?.organizerId);
      const organizerName = getFilledText(yearRecord?.organizerName);
      const organizerColor = getFilledText(yearRecord?.organizerColor);
      const organizerLogoUrl = getFilledText(yearRecord?.organizerLogoUrl);
      const details = getFilledText(yearRecord?.details);
      const about = getFilledText(yearRecord?.about);
      const bookletUrl = getFilledText(yearRecord?.bookletUrl);
      const youtubeUrl = getFilledText(yearRecord?.youtubeUrl);
      const performanceImages = normalizeStringList(yearRecord?.performanceImages);
      const awards = (Array.isArray(yearRecord?.awards) ? yearRecord.awards : [])
        .map((award) => ({
          year: getFilledText(award?.year) || year,
          title: getFilledText(award?.title),
          description: getFilledText(award?.description),
        }))
        .filter((award) => award.title);

      if (
        !year &&
        !logoUrl &&
        !organizerName &&
        !organizerLogoUrl &&
        !details &&
        !about &&
        !bookletUrl &&
        !youtubeUrl &&
        performanceImages.length === 0 &&
        awards.length === 0
      ) {
        continue;
      }

      yearlyData.push({
        year: year || awards[0]?.year || '',
        logoUrl: logoUrl || undefined,
        organizerId: organizerId || undefined,
        organizerName: organizerName || undefined,
        organizerColor: organizerColor || undefined,
        organizerLogoUrl: organizerLogoUrl || undefined,
        contestEventIds: normalizeStringList(yearRecord?.contestEventIds),
        contestCategoryIds: normalizeStringListRecord(yearRecord?.contestCategoryIds),
        contestResultIds: normalizeStringListRecord(yearRecord?.contestResultIds),
        contestSingerIds: normalizeStringListRecord(yearRecord?.contestSingerIds),
        contestLeadPerformerIds: normalizeStringListRecord(yearRecord?.contestLeadPerformerIds),
        contestCategorySingerIds: normalizeNestedStringListRecord(
          yearRecord?.contestCategorySingerIds
        ),
        contestCategoryLeadPerformerIds: normalizeNestedStringListRecord(
          yearRecord?.contestCategoryLeadPerformerIds
        ),
        contestCategoryBookletUrls: normalizeNestedStringRecord(
          yearRecord?.contestCategoryBookletUrls
        ),
        contestCategoryBookletNames: normalizeNestedStringRecord(
          yearRecord?.contestCategoryBookletNames
        ),
        contestCategoryDetails: normalizeNestedStringRecord(yearRecord?.contestCategoryDetails),
        contestCategoryResultIds: normalizeNestedStringListRecord(
          yearRecord?.contestCategoryResultIds
        ),
        details: details || undefined,
        about: about || undefined,
        storyTypes: normalizeStringList(yearRecord?.storyTypes),
        bookletUrl: bookletUrl || undefined,
        bookletName: getFilledText(yearRecord?.bookletName) || undefined,
        youtubeUrl: youtubeUrl || undefined,
        singerIds: normalizeStringList(yearRecord?.singerIds),
        leadPerformerIds: normalizeStringList(yearRecord?.leadPerformerIds),
        performanceImages,
        awards,
        note: getFilledText(yearRecord?.note),
      });
    }

    groups.push({
      id: getFilledText(group?.id) || undefined,
      name,
      logoUrl: getFilledText(group?.logoUrl) || undefined,
      coverImageUrl: getFilledText(group?.coverImageUrl) || undefined,
      primaryColor: getFilledText(group?.primaryColor) || undefined,
      provinceCode: getFilledText(group?.provinceCode) || undefined,
      provinceName: getFilledText(group?.provinceName) || undefined,
      isPublished: group?.isPublished !== false,
      isFeatured: group?.isFeatured === true,
      acceptsBookings: group?.acceptsBookings !== false,
      contactPhone: getFilledText(group?.contactPhone) || undefined,
      contactEmail: getFilledText(group?.contactEmail) || undefined,
      lineUrl: getFilledText(group?.lineUrl) || undefined,
      facebookUrl: getFilledText(group?.facebookUrl) || undefined,
      youtubeUrl: getFilledText(group?.youtubeUrl) || undefined,
      category: getFilledText(group?.category) || 'วงดนตรี',
      managers: normalizeStringList(group?.managers),
      coManagers: normalizeStringList(group?.coManagers),
      principalMembers: normalizeStringList(group?.principalMembers),
      leadRoles: normalizeStringList(group?.leadRoles),
      otherPositions: normalizeStringList(group?.otherPositions),
      personnel: (Array.isArray(group?.personnel) ? group.personnel : []).map((person, index) => ({
        id: getFilledText(person?.id) || `person-${index}`,
        role: getFilledText(person?.role),
        fullName: getFilledText(person?.fullName),
        nickname: getFilledText(person?.nickname),
        imageUrl: getFilledText(person?.imageUrl),
        yearsWithGroup: Math.max(0, Number(person?.yearsWithGroup) || 0),
        age: Math.max(0, Number(person?.age) || 0),
        education: getFilledText(person?.education),
        otherDetails: getFilledText(person?.otherDetails),
      })),
      totalMembers: Number(group?.totalMembers) || 0,
      description: getFilledText(group?.description) || undefined,
      sourceLabel: getFilledText(group?.sourceLabel) || undefined,
      sourceUrl: getFilledText(group?.sourceUrl) || undefined,
      updatedAt: getFilledText(group?.updatedAt) || undefined,
      yearlyData,
    });
  }

  if (!title || groups.length === 0) {
    return undefined;
  }

  return {
    title,
    description,
    groups,
  };
}

export function normalizeCultureCategoriesContent(content?: CultureCategoriesContent) {
  if (!content) {
    return undefined;
  }

  const title = getFilledText(content.title);
  const description = getFilledText(content.description);

  if (!title || !description) {
    return undefined;
  }

  return { title, description };
}

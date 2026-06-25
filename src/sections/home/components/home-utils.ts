import type {
  StoredHomeContent,
  LocalWisdomContent,
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

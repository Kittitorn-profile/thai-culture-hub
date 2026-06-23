import type {
  StoryContent,
  LocalWisdomContent,
  StoredHomeContent,
  CultureCategoriesContent,
} from './home-types';

import { CATEGORY_KEY_BY_TITLE } from './home-constants';

export function getFilledText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getCultureCategoryKey(title: string) {
  return CATEGORY_KEY_BY_TITLE[title] ?? 'cultural_attraction';
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
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function isUpcomingHomeEvent(value: string) {
  if (!value) {
    return false;
  }

  const eventDate = new Date(value);

  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return eventDate >= today;
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

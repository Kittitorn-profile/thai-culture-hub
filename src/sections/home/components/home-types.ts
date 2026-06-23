import type { IconifyName } from 'src/components/iconify/register-icons';

export type CultureCategoryCard = {
  categoryKey: string;
  title: string;
  description: string;
  icon: IconifyName;
  src: string;
  color: string;
};

export type HomeVideoItem = {
  title: string;
  src: string;
  cover: string;
};

export type HomeEventItem = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  time: string;
  provinceCode?: string;
  provinceName?: string;
  location: string;
  organizer: string;
  mediaUrl: string;
  coverUrl: string;
  mediaType: 'image' | 'video';
  sourceLabel?: string;
  sourceUrl?: string;
  isFeatured?: boolean;
};

export type StoryContent = {
  title: string;
  actionLabel: string;
  body: string;
};

export type LocalWisdomContent = {
  title: string;
  body: string;
  quote: string;
  caption: string;
  mediaUrl: string;
  coverUrl: string;
};

export type CultureCategoriesContent = {
  title: string;
  description: string;
};

export type StoredHomeContent = {
  story?: StoryContent;
  mediaItems?: Array<{
    title: string;
    description?: string;
    url: string;
    coverUrl: string;
    isActive?: boolean;
  }>;
};

export type StoredCultureCategoriesContent = {
  content?: CultureCategoriesContent;
  items?: Array<{
    title: string;
    description: string;
    imageUrl: string;
    icon: IconifyName;
    color: string;
    isActive?: boolean;
  }>;
};

export type HomeAnalyticsSummary = {
  days: number;
  pageViews: number;
  visitors: number;
  sessions: number;
  topSearches: Array<{ name: string; count: number; visitors: number }>;
  topProvinces: Array<{ name: string; count: number; visitors: number }>;
  topDistricts: Array<{ name: string; count: number; visitors: number }>;
};

export type CreatorArticlePreview = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  categoryKey: string;
  categoryLabel: string;
  creatorName: string;
  publishedAt: string;
  updatedAt: string;
};

export type CreatorArticleResponse = {
  data?: CreatorArticlePreview[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number;
};

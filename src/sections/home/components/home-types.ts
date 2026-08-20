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

export type PerformanceGroupAward = {
  year: string;
  title: string;
  description?: string;
};

export type PerformanceGroupEntry = {
  id?: string;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  provinceCode?: string;
  provinceName?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  acceptsBookings?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  lineUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  category: string;
  managers: string[];
  coManagers: string[];
  principalMembers: string[];
  leadRoles: string[];
  otherPositions: string[];
  personnel: Array<{
    id: string;
    role: string;
    fullName: string;
    nickname: string;
    imageUrl: string;
    yearsWithGroup: number;
    age: number;
    education: string;
    otherDetails: string;
  }>;
  totalMembers: number;
  description?: string;
  yearlyData: Array<{
    year: string;
    logoUrl?: string;
    details?: string;
    about?: string;
    storyTypes?: string[];
    bookletUrl?: string;
    bookletName?: string;
    youtubeUrl?: string;
    singerIds?: string[];
    leadPerformerIds?: string[];
    performanceImages?: string[];
    awards: PerformanceGroupAward[];
    note?: string;
  }>;
};

export type PerformanceGroupsContent = {
  title: string;
  description: string;
  groups: PerformanceGroupEntry[];
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
  creatorId: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  categoryKey: string;
  categoryLabel: string;
  creatorName: string;
  creatorAvatarUrl: string;
  likeCount?: number;
  liked?: boolean;
  viewCount?: number;
  publishedAt: string;
  updatedAt: string;
};

export type CreatorArticleResponse = {
  data?: CreatorArticlePreview[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number;
};

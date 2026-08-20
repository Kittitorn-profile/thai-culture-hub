import type { MetadataRoute } from 'next';

import { getPublishedPerformanceGroups } from 'src/server/performance-groups';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { groups, updatedAt } = await getPublishedPerformanceGroups();
  const lastModified = updatedAt ? new Date(updatedAt) : new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/about-us/`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/culture-category/`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/contact-us/`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy/`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms-and-conditions/`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
  const performanceGroupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${SITE_URL}/performance-groups/${encodeURIComponent(group.id || group.name)}/`,
    lastModified,
    changeFrequency: 'weekly',
    priority: group.isFeatured ? 0.9 : 0.8,
    images: group.coverImageUrl ? [absoluteUrl(group.coverImageUrl)] : undefined,
  }));

  return [...staticPages, ...performanceGroupPages];
}

function absoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : new URL(value, SITE_URL).toString();
}

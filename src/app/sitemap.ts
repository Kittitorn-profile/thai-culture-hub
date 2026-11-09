import type { MetadataRoute } from 'next';

import { getEventSlug } from 'src/utils/event-slug';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { isDatasetEnabled } from 'src/lib/dataset-visibility';
import { getDatasetVisibility } from 'src/server/dataset-visibility';
import { SYSTEM_CULTURE_CATEGORIES } from 'src/lib/culture-categories';
import { getPublishedPerformanceGroups } from 'src/server/performance-groups';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { hidden } = await getDatasetVisibility();
  const { groups, updatedAt } = await getPublishedPerformanceGroups();
  const lastModified = updatedAt ? new Date(updatedAt) : undefined;
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/about-us/`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: `${SITE_URL}/culture-category/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    { url: `${SITE_URL}/contact-us/`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy/`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    {
      url: `${SITE_URL}/terms-and-conditions/`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
  const performanceGroupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${SITE_URL}/performance-groups/${encodeURIComponent(group.id || group.name)}/`,
    lastModified,
    changeFrequency: 'weekly',
    priority: group.isFeatured ? 0.9 : 0.8,
    images: group.coverImageUrl ? [absoluteUrl(group.coverImageUrl)] : undefined,
  }));

  const directoryPages = [
    'cultural-data',
    'cultural-artists',
    'cultural-heritage',
    'cultural-products',
    'ethnic-groups',
    'crafts',
    'performance-groups',
    'cookie-policy',
  ].map((path) => ({ url: `${SITE_URL}/${path}/` }));
  const provincePages = provinces.flatMap((province) => [
    { url: `${SITE_URL}/province/${province.code}/` },
    { url: `${SITE_URL}/province/${province.code}/places/` },
  ]);
  const categoryPages = SYSTEM_CULTURE_CATEGORIES.map((category) => ({
    url: `${SITE_URL}/culture-category/${category.key}/`,
  }));
  const contentPages: MetadataRoute.Sitemap = [];
  const supabase = getSupabaseAdmin();
  if (!supabase.ok) throw new Error('Sitemap database unavailable');
  for (const kind of ['articles', 'events'] as const) {
    for (let offset = 0; ; offset += 1000) {
      const query =
        kind === 'articles'
          ? supabase.client
              .from('creator_articles')
              .select('slug, updated_at')
              .in('status', ['published', 'approved'])
              .eq('is_active', true)
              .order('id')
          : supabase.client
              .from(process.env.EVENTS_TABLE ?? 'events')
              .select('id, title, slug, tat_slug, updated_at')
              .eq('is_active', true)
              .order('id');
      const { data, error } = await query.range(offset, offset + 999);
      if (error) throw new Error('Unable to load published sitemap content');
      for (const row of data ?? []) {
        const item = row as {
          id?: string;
          title?: string;
          slug?: string;
          tat_slug?: string;
          updated_at?: string;
        };
        const slug =
          kind === 'articles'
            ? item.slug
            : getEventSlug({
                id: item.id!,
                title: item.title!,
                slug: item.slug,
                tatSlug: item.tat_slug,
              });
        if (slug)
          contentPages.push({
            url: `${SITE_URL}/${kind === 'articles' ? 'creator-stories' : 'events'}/${encodeURIComponent(slug)}/`,
            ...(item.updated_at ? { lastModified: item.updated_at } : {}),
          });
      }
      if (!data || data.length < 1000) break;
    }
  }
  return [
    ...staticPages
      .filter(
        (entry) => !!isDatasetEnabled('places', hidden) || !entry.url.endsWith('/culture-category/')
      )
      .map(({ lastModified: _date, ...entry }) => entry),
    ...directoryPages.filter((entry) => {
      const routes: Record<string, string> = {
        'cultural-artists': 'artists',
        'cultural-heritage': 'heritage',
        'ethnic-groups': 'ethnic',
        'cultural-products': 'products',
        crafts: 'crafts',
      };
      const group = Object.entries(routes).find(([route]) => entry.url.endsWith(`/${route}/`))?.[1];
      return !group || isDatasetEnabled(group, hidden);
    }),
    ...provincePages.filter(
      (entry) => !!isDatasetEnabled('places', hidden) || !entry.url.endsWith('/places/')
    ),
    ...(!isDatasetEnabled('places', hidden) ? [] : categoryPages),
    ...performanceGroupPages,
    ...contentPages,
  ];
}

function absoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : new URL(value, SITE_URL).toString();
}

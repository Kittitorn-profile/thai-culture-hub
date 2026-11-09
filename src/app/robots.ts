import type { MetadataRoute } from 'next';

import { getPlaceSitemapIds } from 'src/server/seo-sitemap';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const ids = await getPlaceSitemapIds().catch(() => []);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/admin-login/', '/api/', '/auth/', '/creator/'],
    },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      ...ids.map(({ id }) => `${SITE_URL}/places/sitemap/${id}.xml`),
    ],
    host: SITE_URL,
  };
}

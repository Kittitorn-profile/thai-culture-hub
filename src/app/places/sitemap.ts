import type { MetadataRoute } from 'next';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { PLACE_SITEMAP_SIZE, getPlaceSitemapIds } from 'src/server/seo-sitemap';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';
export const revalidate = 3600;
export const generateSitemaps = getPlaceSitemapIds;

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const page = Number(await id);
  if (!Number.isInteger(page) || page < 0) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase.ok) throw new Error('Sitemap database unavailable');
  const entries: MetadataRoute.Sitemap = [];
  const start = page * PLACE_SITEMAP_SIZE;
  for (let offset = start; offset < start + PLACE_SITEMAP_SIZE; offset += 1000) {
    const { data, error } = await supabase.client
      .from(process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places')
      .select('id, name')
      .not('name', 'is', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error('Unable to load sitemap places');
    for (const place of data ?? []) {
      if (place.name?.trim())
        entries.push({ url: `${SITE_URL}/culture-place/${encodeURIComponent(place.id)}/` });
    }
    if (!data || data.length < 1000) break;
  }
  return entries;
}

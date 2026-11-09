import { getSupabaseAdmin } from './supabase-admin';
import { isDatasetVisible } from './dataset-visibility';

export const PLACE_SITEMAP_SIZE = 10000;

export async function getPlaceSitemapIds() {
  if (!(await isDatasetVisible('places'))) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase.ok) throw new Error('Sitemap database unavailable');
  const { count, error } = await supabase.client
    .from(process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places')
    .select('id', { count: 'exact', head: true })
    .not('name', 'is', null)
    .not('lat', 'is', null)
    .not('lng', 'is', null);
  if (error) throw new Error('Unable to count sitemap places');
  return Array.from({ length: Math.ceil((count ?? 0) / PLACE_SITEMAP_SIZE) }, (_, id) => ({ id }));
}

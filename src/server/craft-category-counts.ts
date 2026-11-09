import type { SupabaseClient } from '@supabase/supabase-js';

import { CRAFT_CATEGORIES, getPrimaryCraftCategory } from 'src/lib/public-cultural-data';

import { isDatasetVisible } from './dataset-visibility';
import { getCulturalHeritage } from './cultural-heritage';

export async function getCraftCategoryCounts(db: SupabaseClient, code = '', name = '', query = '') {
  if (!(await isDatasetVisible('crafts'))) return { counts: {}, complete: true };
  const communityVisible = await isDatasetVisible('community');
  const community = communityVisible
    ? await getCulturalHeritage({
        collection: 'community',
        publicOnly: true,
        province: name,
        query,
        limit: Number.MAX_SAFE_INTEGER,
      })
    : { data: [], total: 0 };
  let request = db
    .from(process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom')
    .select('*', { count: 'exact', head: true });
  if (code && name) request = request.or(`province_code.eq.${code},province.eq.${name}`);
  if (query) request = request.ilike('title', `%${query.replace(/[%_\\]/g, '')}%`);
  const fabricVisible = await isDatasetVisible('fabric');
  let fabric: number | null = fabricVisible ? null : 0;
  try {
    const result = fabricVisible
      ? await request.abortSignal(AbortSignal.timeout(10000))
      : { count: 0, error: null };
    if (!result.error) fabric = result.count;
  } catch {
    /* Local counts remain available when the registry is offline. */
  }
  const counts: Record<string, number | null> = {
    all: fabric === null ? null : community.total + fabric,
  };
  for (const category of CRAFT_CATEGORIES) {
    const local = community.data.filter(
      (item) => getPrimaryCraftCategory(item.categories) === category.key
    ).length;
    counts[category.key] =
      category.key === 'weaving' ? (fabric === null ? null : local + fabric) : local;
  }
  return { counts, complete: fabric !== null };
}

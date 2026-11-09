import { cache } from 'react';
import { notFound } from 'next/navigation';

import {
  isDatasetEnabled,
  normalizeHiddenSources,
  DATASET_VISIBILITY_KEY,
  datasetVisibilitySchema,
} from 'src/lib/dataset-visibility';

import { getSupabaseAdmin } from './supabase-admin';

export const getDatasetVisibility = cache(async () => {
  const db = getSupabaseAdmin();
  if (!db.ok) throw new Error('โหลดสถานะชุดข้อมูลไม่ได้');
  const { data, error } = await db.client
    .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
    .select('content')
    .eq('section_key', DATASET_VISIBILITY_KEY)
    .maybeSingle();
  if (error) throw new Error('โหลดสถานะชุดข้อมูลไม่ได้');
  const settings = datasetVisibilitySchema.parse(data?.content ?? { hidden: [] });
  return { hidden: normalizeHiddenSources(settings.hidden) };
});
export async function isDatasetVisible(value: string) {
  return isDatasetEnabled(value, (await getDatasetVisibility()).hidden);
}
export async function requireDatasetVisible(value: string) {
  if (!(await isDatasetVisible(value))) notFound();
}

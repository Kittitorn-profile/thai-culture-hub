import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProvinceDataItem } from './province-cultural-data';

import { getCorrectionFieldLabels } from 'src/lib/contribution-corrections';
import { type CraftEdit, craftEditSchema } from 'src/lib/craft-corrections';

export type CraftOverride = { record_id: string; payload: Partial<CraftEdit>; updated_at: string };
export async function readCraftOverrides(
  db: SupabaseClient,
  ids: string[],
  strict = false
): Promise<CraftOverride[]> {
  if (!ids.length) return [];
  try {
    const { data, error } = await db
      .from('craft_data_overrides')
      .select('record_id,payload,updated_at')
      .in('record_id', ids)
      .abortSignal(AbortSignal.timeout(10000));
    if (error) throw new Error('อ่านข้อมูลที่ตรวจสอบแล้วไม่ได้');
    return (data ?? []).map((row) => ({
      ...row,
      payload: craftEditSchema.partial().parse(row.payload),
    }));
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}
export function applyCraftOverride(
  item: ProvinceDataItem,
  override?: CraftOverride
): ProvinceDataItem {
  if (!override) return item;
  const patch = override.payload;
  const details = [...item.details];
  const labels = getCorrectionFieldLabels(override.record_id ?? 'community:legacy');
  if (!override.record_id || /^(community|fabric):/.test(override.record_id)) {
    labels.practice = 'พื้นที่ปฏิบัติ';
    labels.lifestyle = 'วิถีชีวิต';
  }
  for (const [key, label] of [
    ['practice', labels.practice],
    ['technique', labels.technique],
    ['lifestyle', labels.lifestyle],
  ] as const) {
    if (patch[key] === undefined) continue;
    const index = details.findIndex(
      (detail) =>
        detail.label === label ||
        (key === 'practice' && detail.label === 'พื้นที่/ชุมชน') ||
        (key === 'technique' && detail.label === 'เทคนิค')
    );
    if (index >= 0) details[index] = { label, value: patch[key] };
    else details.push({ label, value: patch[key] });
  }
  return {
    ...item,
    description: patch.description ?? item.description,
    ...(patch.images !== undefined
      ? {
          images: patch.images,
          imageUrl: patch.images[0]?.url,
          imageCredit: patch.images[0]?.credit,
        }
      : {}),
    details: details.filter((detail) => detail.value),
    sourceUrls: [
      ...new Set(
        [item.sourceUrl, ...(item.sourceUrls ?? []), patch.referenceUrl ?? ''].filter(Boolean)
      ),
    ],
  };
}
export async function applyCraftOverrides(
  db: SupabaseClient,
  data: ProvinceDataItem[],
  kind: 'community' | 'fabric' | 'artists' | 'heritage' | 'ethnic' | 'products'
) {
  const overrides = await readCraftOverrides(
    db,
    data.map((item) => `${kind}:${item.id}`)
  );
  return data.map((item) =>
    applyCraftOverride(
      item,
      overrides.find((row) => row.record_id === `${kind}:${item.id}`)
    )
  );
}

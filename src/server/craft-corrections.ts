import type { SupabaseClient } from '@supabase/supabase-js';

import { getCorrectionFieldLabels } from 'src/lib/contribution-corrections';
import { type CraftEdit, craftRecordIdSchema } from 'src/lib/craft-corrections';

import { getProvinceCulturalSection } from './province-cultural-data';
import { applyCraftOverride, readCraftOverrides } from './craft-overrides';

export async function getEditableCraft(db: SupabaseClient, rawId: string) {
  const id = craftRecordIdSchema.parse(rawId);
  const [kind, originalId] = id.split(':');
  const section = kind === 'products' ? 'cpot' : kind;
  const labels = getCorrectionFieldLabels(id);
  const result = await getProvinceCulturalSection(
    db,
    '',
    '',
    section as 'community' | 'fabric' | 'artists' | 'heritage' | 'ethnic' | 'cpot',
    0,
    ['fabric', 'products', 'heritage'].includes(kind) ? 1 : Number.MAX_SAFE_INTEGER,
    '',
    { recordId: originalId }
  );
  const base = result.data.find((item) => item.id === originalId);
  if (!base) return null;
  const override = (await readCraftOverrides(db, [id], true))[0];
  const item = applyCraftOverride(base, override);
  const detail = (...detailLabels: string[]) =>
    item.details.find((row) => detailLabels.includes(row.label))?.value ?? '';
  const values: CraftEdit = {
    images:
      item.images ??
      (item.imageUrl
        ? [{ url: item.imageUrl, caption: item.title, credit: item.imageCredit ?? '' }]
        : []),
    description: item.description,
    practice: detail(labels.practice, 'พื้นที่ปฏิบัติ', 'พื้นที่/ชุมชน', 'พื้นที่'),
    technique: detail(labels.technique, 'เทคนิคและภูมิปัญญา', 'เทคนิค'),
    lifestyle: detail(labels.lifestyle, 'วิถีชีวิต'),
    referenceUrl: override?.payload.referenceUrl ?? '',
  };
  return {
    recordId: id,
    title: item.title,
    values,
    sourceUrls: item.sourceUrls ?? [item.sourceUrl],
    revision: override?.updated_at ?? null,
  };
}
export const CRAFT_REQUEST_SELECT =
  'id,record_id,record_title,requester_user_id,requester_name,reason,original_snapshot,suggested_payload,status,review_note,created_at,reviewed_at';

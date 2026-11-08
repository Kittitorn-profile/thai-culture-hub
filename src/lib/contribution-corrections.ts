import type { CreatorPlaceCorrection } from 'src/sections/creator/types';

import { CRAFT_EDIT_LABELS } from './craft-corrections';
import { PUBLIC_DATA_GROUPS } from './public-cultural-data';

export type ContributionCorrection = Pick<
  CreatorPlaceCorrection,
  | 'id'
  | 'placeId'
  | 'placeName'
  | 'provinceCode'
  | 'reason'
  | 'originalSnapshot'
  | 'suggestedPayload'
  | 'status'
  | 'createdAt'
  | 'reviewNote'
> & { kind: string };
export type DataCorrectionRow = {
  id: string;
  record_id: string;
  record_title: string;
  reason: string;
  original_snapshot: Record<string, unknown>;
  suggested_payload: Record<string, unknown>;
  status: CreatorPlaceCorrection['status'];
  created_at: string;
  review_note: string;
};
export function getContributionGroup(recordId: string) {
  const kind = recordId.split(':')[0];
  return kind === 'community' || kind === 'fabric' ? 'crafts' : kind;
}
export function getContributionLabel(kind: string) {
  return PUBLIC_DATA_GROUPS.find((group) => group.key === kind)?.label ?? 'ข้อมูลวัฒนธรรม';
}
export function getCorrectionFieldLabels(recordId: string) {
  const group = getContributionGroup(recordId);
  const specific =
    group === 'artists'
      ? {
          practice: 'พื้นที่ทำงาน / ชุมชน',
          technique: 'ผลงาน / ทักษะ / สาขา',
          lifestyle: 'ประวัติ / การถ่ายทอดความรู้',
        }
      : group === 'ethnic'
        ? {
            practice: 'พื้นที่ / ชุมชน',
            technique: 'ภาษา / วัฒนธรรม / ภูมิปัญญา',
            lifestyle: 'วิถีชีวิต / การสืบทอด',
          }
        : group === 'products'
          ? {
              practice: 'ชุมชน / แหล่งผลิต',
              technique: 'วัสดุ / เทคนิคการผลิต',
              lifestyle: 'เรื่องราว / การสืบทอด',
            }
          : group === 'heritage'
            ? {
                practice: 'พื้นที่ปฏิบัติ / ชุมชน',
                technique: 'องค์ความรู้ / วิธีปฏิบัติ',
                lifestyle: 'การสืบทอด / สถานะปัจจุบัน',
              }
            : {};
  return { ...CRAFT_EDIT_LABELS, ...specific };
}
export function mergeContributionCorrections(
  places: CreatorPlaceCorrection[],
  records: DataCorrectionRow[]
): ContributionCorrection[] {
  return [
    ...places.map((item) => ({ ...item, kind: 'places' })),
    ...records.map((item) => ({
      id: item.id,
      kind: getContributionGroup(item.record_id),
      placeId: item.record_id,
      placeName: item.record_title,
      provinceCode: '',
      reason: item.reason,
      originalSnapshot: item.original_snapshot,
      suggestedPayload: item.suggested_payload,
      status: item.status,
      createdAt: item.created_at,
      reviewNote: item.review_note,
    })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

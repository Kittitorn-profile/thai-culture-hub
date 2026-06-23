import type { SupabaseClient } from '@supabase/supabase-js';

import { cleanText } from './creator-auth';

export type PlaceCorrectionStatus = 'pending' | 'approved' | 'rejected';

export type PlaceCorrectionRow = {
  id: string;
  place_id: string;
  province_code: string | null;
  place_name: string | null;
  creator_profile_id: string | null;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  reason: string | null;
  original_snapshot: Record<string, unknown> | null;
  suggested_payload: Record<string, unknown> | null;
  status: PlaceCorrectionStatus;
  reviewed_at: string | null;
  reviewer_email: string | null;
  reviewer_name: string | null;
  review_note: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PLACE_CORRECTION_SELECT =
  'id, place_id, province_code, place_name, creator_profile_id, requester_user_id, requester_email, requester_name, reason, original_snapshot, suggested_payload, status, reviewed_at, reviewer_email, reviewer_name, review_note, applied_at, created_at, updated_at';

export function getSuggestedText(payload: Record<string, unknown> | null | undefined, key: string) {
  return cleanText(payload?.[key]);
}

export function getSuggestedNumber(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  const textValue = cleanText(value);

  if (value == null || (typeof value !== 'number' && !textValue)) {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(textValue);

  return Number.isFinite(numberValue) ? numberValue : null;
}

export function mapPlaceCorrection(row: PlaceCorrectionRow) {
  return {
    id: row.id,
    placeId: row.place_id,
    provinceCode: row.province_code ?? '',
    placeName: row.place_name ?? '',
    creatorProfileId: row.creator_profile_id ?? '',
    requesterUserId: row.requester_user_id ?? '',
    requesterEmail: row.requester_email ?? '',
    requesterName: row.requester_name ?? '',
    reason: row.reason ?? '',
    originalSnapshot: row.original_snapshot ?? {},
    suggestedPayload: row.suggested_payload ?? {},
    status: row.status,
    reviewedAt: row.reviewed_at ?? '',
    reviewerEmail: row.reviewer_email ?? '',
    reviewerName: row.reviewer_name ?? '',
    reviewNote: row.review_note ?? '',
    appliedAt: row.applied_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentPlaceCoordinates(
  supabase: SupabaseClient,
  placeId: string
): Promise<{ lat: number | null; lng: number | null; provinceCode: string | null }> {
  const { data: overrideRow } = await supabase
    .from('cultural_place_overrides')
    .select('lat, lng, province_code')
    .eq('place_id', placeId)
    .maybeSingle();

  if (overrideRow && typeof overrideRow === 'object') {
    const lat = Number((overrideRow as any).lat);
    const lng = Number((overrideRow as any).lng);

    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return {
        lat,
        lng,
        provinceCode: (overrideRow as any).province_code ?? null,
      };
    }
  }

  const { data: placeRow } = await supabase
    .from('cultural_places')
    .select('lat, lng, province_code')
    .eq('id', placeId)
    .maybeSingle();

  if (placeRow && typeof placeRow === 'object') {
    const lat = Number((placeRow as any).lat);
    const lng = Number((placeRow as any).lng);

    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      provinceCode: (placeRow as any).province_code ?? null,
    };
  }

  return { lat: null, lng: null, provinceCode: null };
}

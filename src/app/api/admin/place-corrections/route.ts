import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';
import { cleanText, getBearerToken } from 'src/server/creator-auth';
import {
  getSuggestedText,
  mapPlaceCorrection,
  getSuggestedNumber,
  PLACE_CORRECTION_SELECT,
  type PlaceCorrectionRow,
} from 'src/server/place-correction';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

function normalizeReviewStatus(value: string) {
  if (value === 'approved' || value === 'rejected') {
    return value;
  }

  return null;
}

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasSuggestedValue(payload: Record<string, unknown>, key: string) {
  return getSuggestedText(payload, key) !== '';
}

function hasUsableCoordinates(lat: number | null, lng: number | null) {
  return lat != null && lng != null && !(lat === 0 && lng === 0);
}

async function applyCorrection(
  supabase: SupabaseClient,
  correction: PlaceCorrectionRow,
  reviewer: { id: string; email?: string; displayName?: string }
) {
  const payload = correction.suggested_payload ?? {};
  const [overrideResult, placeResult] = await Promise.all([
    supabase
      .from('cultural_place_overrides')
      .select('province_code, name, source, category, district, lat, lng, map_url, image_url, note, detail')
      .eq('place_id', correction.place_id)
      .maybeSingle(),
    supabase
      .from('cultural_places')
      .select('province_code, name, source, category, district, lat, lng, map_url, image_urls, description, highlight')
      .eq('id', correction.place_id)
      .maybeSingle(),
  ]);
  const currentOverride = (overrideResult.data ?? null) as Record<string, any> | null;
  const currentPlace = (placeResult.data ?? null) as Record<string, any> | null;
  const hasSuggestedLat = hasSuggestedValue(payload, 'lat');
  const hasSuggestedLng = hasSuggestedValue(payload, 'lng');

  if (hasSuggestedLat !== hasSuggestedLng) {
    return { ok: false as const, message: 'กรุณาระบุ Latitude และ Longitude ให้ครบคู่' };
  }

  const suggestedLat = getSuggestedNumber(payload, 'lat');
  const suggestedLng = getSuggestedNumber(payload, 'lng');
  const overrideLat = toFiniteNumber(currentOverride?.lat);
  const overrideLng = toFiniteNumber(currentOverride?.lng);
  const placeLat = toFiniteNumber(currentPlace?.lat);
  const placeLng = toFiniteNumber(currentPlace?.lng);
  const currentLat = hasUsableCoordinates(overrideLat, overrideLng) ? overrideLat : placeLat;
  const currentLng = hasUsableCoordinates(overrideLat, overrideLng) ? overrideLng : placeLng;
  const lat = hasSuggestedLat ? suggestedLat : currentLat;
  const lng = hasSuggestedLng ? suggestedLng : currentLng;
  const provinceCode =
    correction.province_code ||
    currentOverride?.province_code ||
    currentPlace?.province_code ||
    null;

  if (!provinceCode) {
    return { ok: false as const, message: 'ไม่พบ provinceCode หรือพิกัดเดิมของสถานที่นี้' };
  }

  const updatedAt = new Date().toISOString();
  const shouldWriteCoordinates = lat != null && lng != null;
  const baseOverrideRow = {
    place_id: correction.place_id,
    province_code: provinceCode,
    name: getSuggestedText(payload, 'name') || currentOverride?.name || currentPlace?.name || correction.place_name,
    source: currentOverride?.source || currentPlace?.source || 'thailand_cultural_hub',
    category: currentOverride?.category || currentPlace?.category || 'cultural_attraction',
    district: getSuggestedText(payload, 'district') || currentOverride?.district || currentPlace?.district || null,
    map_url: getSuggestedText(payload, 'mapUrl') || currentOverride?.map_url || currentPlace?.map_url || null,
    image_url:
      getSuggestedText(payload, 'imageUrl') ||
      currentOverride?.image_url ||
      currentPlace?.image_urls?.[0] ||
      null,
    note:
      getSuggestedText(payload, 'description') ||
      currentOverride?.note ||
      currentPlace?.highlight ||
      correction.reason ||
      null,
    detail:
      getSuggestedText(payload, 'detail') ||
      currentOverride?.detail ||
      currentPlace?.description ||
      null,
    updated_at: updatedAt,
    updated_by_id: reviewer.id,
    updated_by_email: reviewer.email ?? null,
    updated_by_name: reviewer.displayName ?? reviewer.email ?? null,
  };
  const overrideRow = shouldWriteCoordinates
    ? { ...baseOverrideRow, lat, lng }
    : baseOverrideRow;
  const detailRow = {
    place_id: correction.place_id,
    province_code: provinceCode,
    name_th: getSuggestedText(payload, 'name') || correction.place_name,
    detail_th: getSuggestedText(payload, 'detail') || getSuggestedText(payload, 'description') || null,
    highlight: getSuggestedText(payload, 'description') || null,
    updated_at: updatedAt,
    updated_by_id: reviewer.id,
    updated_by_email: reviewer.email ?? null,
    updated_by_name: reviewer.displayName ?? reviewer.email ?? null,
  };

  if (!shouldWriteCoordinates && !currentOverride) {
    return { ok: false as const, message: 'ไม่พบ provinceCode หรือพิกัดเดิมของสถานที่นี้' };
  }

  const { error: overrideError } = currentOverride
    ? await supabase
        .from('cultural_place_overrides')
        .update(overrideRow)
        .eq('place_id', correction.place_id)
    : await supabase
        .from('cultural_place_overrides')
        .upsert(overrideRow, { onConflict: 'place_id' });

  if (overrideError) {
    return { ok: false as const, message: overrideError.message };
  }

  const { error: detailError } = await supabase
    .from('cultural_place_details')
    .upsert(detailRow, { onConflict: 'place_id' });

  if (detailError) {
    return { ok: false as const, message: detailError.message };
  }

  return { ok: true as const, appliedAt: updatedAt };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccessToken(
    getBearerToken(request.headers),
    ADMIN_PERMISSION.culturalPlaces
  );

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const status = request.nextUrl.searchParams.get('status')?.trim();
  let query = supabase.client
    .from('cultural_place_correction_requests')
    .select(PLACE_CORRECTION_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: ((data ?? []) as any[]).map(mapPlaceCorrection) });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccessToken(
    getBearerToken(request.headers),
    ADMIN_PERMISSION.culturalPlaces
  );

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id);
  const status = normalizeReviewStatus(cleanText(body.status));
  const reviewNote = cleanText(body.reviewNote);

  if (!id || !status) {
    return NextResponse.json({ message: 'Valid correction id and status are required' }, { status: 400 });
  }

  if (status === 'rejected' && !reviewNote) {
    return NextResponse.json({ message: 'กรุณาระบุเหตุผล reject' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data: correctionData, error: correctionError } = await supabase.client
    .from('cultural_place_correction_requests')
    .select(PLACE_CORRECTION_SELECT)
    .eq('id', id)
    .single();

  if (correctionError || !correctionData) {
    return NextResponse.json(
      { message: correctionError?.message ?? 'Correction request not found' },
      { status: 404 }
    );
  }

  let appliedAt: string | null = null;

  if (status === 'approved') {
    const applied = await applyCorrection(
      supabase.client,
      correctionData as PlaceCorrectionRow,
      auth.user
    );

    if (!applied.ok) {
      return NextResponse.json({ message: applied.message }, { status: 500 });
    }

    appliedAt = applied.appliedAt;
  }

  const reviewedAt = new Date().toISOString();
  const { data, error } = await supabase.client
    .from('cultural_place_correction_requests')
    .update({
      status,
      reviewed_at: reviewedAt,
      reviewed_by: auth.user.id,
      reviewer_email: auth.user.email ?? null,
      reviewer_name: auth.user.displayName ?? auth.user.email ?? null,
      review_note: reviewNote || null,
      applied_at: appliedAt,
    })
    .eq('id', id)
    .select(PLACE_CORRECTION_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapPlaceCorrection(data as any) });
}

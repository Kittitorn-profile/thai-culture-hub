import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { mapPlaceCorrection, PLACE_CORRECTION_SELECT } from 'src/server/place-correction';
import {
  cleanText,
  getBearerToken,
  verifyCreatorAccessToken,
  getCreatorProfileByUserId,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

function cleanPayload(body: Record<string, unknown>) {
  return {
    name: cleanText(body.name),
    district: cleanText(body.district),
    lat: cleanText(body.lat),
    lng: cleanText(body.lng),
    mapUrl: cleanText(body.mapUrl),
    imageUrl: cleanText(body.imageUrl),
    description: cleanText(body.description),
    detail: cleanText(body.detail),
  };
}

function isMissingCorrectionRequestsTable(error: { code?: string; message?: string }) {
  return (
    error.code === 'PGRST205' ||
    error.message?.includes("Could not find the table 'public.cultural_place_correction_requests'")
  );
}

function getMissingTableResponse(status = 500) {
  return NextResponse.json(
    {
      data: [],
      message:
        'ยังไม่ได้สร้างตาราง cultural_place_correction_requests ใน Supabase กรุณารัน SQL จาก docs/supabase-cultural-place-correction-requests.sql ก่อนใช้งานคำขอแก้ไข',
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  const { data, error } = await auth.supabase
    .from('cultural_place_correction_requests')
    .select(PLACE_CORRECTION_SELECT)
    .eq('creator_profile_id', profileResult.profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingCorrectionRequestsTable(error)) {
      return getMissingTableResponse(200);
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: ((data ?? []) as any[]).map(mapPlaceCorrection) });
}

export async function POST(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const placeId = cleanText(body.placeId);
  const provinceCode = cleanText(body.provinceCode);
  const placeName = cleanText(body.placeName);
  const reason = cleanText(body.reason);
  const suggestedPayload = cleanPayload(body);

  if (!placeId || !placeName) {
    return NextResponse.json(
      { message: 'placeId and placeName are required' },
      { status: 400 }
    );
  }

  if (!Object.values(suggestedPayload).some(Boolean)) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลที่ต้องการแก้ไข' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('cultural_place_correction_requests')
    .insert({
      place_id: placeId,
      province_code: provinceCode || null,
      place_name: placeName,
      creator_profile_id: profileResult.profile.id,
      requester_user_id: auth.user.id,
      requester_email: auth.user.email ?? profileResult.profile.email,
      requester_name: profileResult.profile.display_name,
      reason,
      original_snapshot:
        body.originalSnapshot && typeof body.originalSnapshot === 'object'
          ? body.originalSnapshot
          : {},
      suggested_payload: suggestedPayload,
      status: 'pending',
    })
    .select(PLACE_CORRECTION_SELECT)
    .single();

  if (error) {
    if (isMissingCorrectionRequestsTable(error)) {
      return getMissingTableResponse();
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapPlaceCorrection(data as any) }, { status: 201 });
}

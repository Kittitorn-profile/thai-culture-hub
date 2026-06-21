import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest, verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

type PlaceOverride = {
  place_id: string;
  province_code?: string | null;
  name?: string | null;
  source?: string | null;
  category?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  map_url?: string | null;
  image_url?: string | null;
  note?: string | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
  updated_by_name?: string | null;
};

const OVERRIDES_TABLE = process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides';

function toNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function applyOverride(place: CulturalPlace, override?: PlaceOverride) {
  if (!override) {
    return { ...place, override: null };
  }

  return {
    ...place,
    category: (override.category as CulturalPlace['category']) || place.category,
    district: override.district || place.district,
    lat: override.lat ?? place.lat,
    lng: override.lng ?? place.lng,
    mapUrl: override.map_url || place.mapUrl,
    imageUrls: override.image_url ? [override.image_url] : place.imageUrls,
    override,
  };
}

async function getOverrides(provinceCode: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error, data: [] as PlaceOverride[] };
  }

  const { data, error } = await supabase.client
    .from(OVERRIDES_TABLE)
    .select('*')
    .eq('province_code', provinceCode);

  if (error) {
    return { ok: false as const, error: error.message, data: [] as PlaceOverride[] };
  }

  return { ok: true as const, data: (data ?? []) as PlaceOverride[] };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';

  if (!provinceCode) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  const url = new URL('/api/culture/province-places', request.nextUrl.origin);

  url.searchParams.set('provinceCode', provinceCode);

  const [placesResponse, overridesResult] = await Promise.all([
    fetch(url, { signal: request.signal }),
    getOverrides(provinceCode),
  ]);
  const placesJson = (await placesResponse.json().catch(() => ({}))) as { data?: CulturalPlace[] };
  const places = Array.isArray(placesJson.data) ? placesJson.data : [];
  const overrideMap = new Map(
    overridesResult.data.map((override) => [override.place_id, override])
  );
  const data = places
    .map((place) => applyOverride(place, overrideMap.get(place.id)))
    .filter((place) => {
      if (!query) {
        return true;
      }

      return [place.name, place.district, place.highlight, place.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

  return NextResponse.json({
    data,
    overrideError: overridesResult.ok ? undefined : overridesResult.error,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.culturalPlaces);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    placeId?: string;
    provinceCode?: string;
    name?: string;
    source?: string;
    category?: string;
    district?: string;
    lat?: number | string;
    lng?: number | string;
    mapUrl?: string;
    imageUrl?: string;
    note?: string;
  };
  const placeId = body.placeId?.trim();
  const provinceCode = body.provinceCode?.trim();
  const lat = toNumber(body.lat);
  const lng = toNumber(body.lng);

  if (!placeId || !provinceCode || lat == null || lng == null) {
    return NextResponse.json(
      { message: 'placeId, provinceCode, lat and lng are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const row: PlaceOverride = {
    place_id: placeId,
    province_code: provinceCode,
    name: body.name ?? null,
    source: body.source ?? null,
    category: body.category ?? null,
    district: body.district?.trim() || null,
    lat,
    lng,
    map_url: body.mapUrl?.trim() || null,
    image_url: body.imageUrl?.trim() || null,
    note: body.note?.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by_id: auth.user.id,
    updated_by_email: auth.user.email ?? null,
    updated_by_name: auth.user.displayName ?? auth.user.email ?? null,
  };
  const { data, error } = await supabase.client
    .from(OVERRIDES_TABLE)
    .upsert(row, { onConflict: 'place_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.culturalPlaces))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim();

  if (!placeId) {
    return NextResponse.json({ message: 'placeId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.from(OVERRIDES_TABLE).delete().eq('place_id', placeId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

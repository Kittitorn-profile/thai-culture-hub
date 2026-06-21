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
  detail?: string | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
  updated_by_name?: string | null;
};

type PlaceDetailRow = {
  place_id: string;
  province_code?: string | null;
  detail_th?: string | null;
  highlight?: string | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
  updated_by_name?: string | null;
};

type CulturalPlaceRow = {
  id: string;
  province_code?: string | null;
  name: string | null;
  district: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  highlight: string | null;
  image_urls: string[] | null;
  source_url: string | null;
  map_url: string | null;
  source: string | null;
  payload?: Partial<CulturalPlace> | null;
};

type CulturalPlaceRemapRow = CulturalPlaceRow & {
  updated_at?: string | null;
};

type CulturalPlaceUpsertRow = {
  id: string;
  province_code: string;
  name: string;
  district: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  highlight: string;
  image_urls: string[];
  source_url: string | null;
  map_url: string | null;
  source: string;
  payload: Partial<CulturalPlace>;
  updated_at: string;
};

type RemappablePlacePayload = Partial<CulturalPlace> & {
  name: string;
  lat: number | string;
  lng: number | string;
};

const PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const OVERRIDES_TABLE = process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides';
const DETAILS_TABLE = process.env.CULTURAL_PLACE_DETAILS_TABLE ?? 'cultural_place_details';
const SUPABASE_PAGE_SIZE = 1000;
const UPSERT_CHUNK_SIZE = 500;

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

function mapPlaceRow(row: CulturalPlaceRow): (CulturalPlace & { provinceCode?: string }) | null {
  if (!row.id || !row.name) {
    return null;
  }

  return {
    ...(row.payload ?? {}),
    id: row.id,
    provinceCode: row.province_code ?? undefined,
    name: row.name,
    district: row.district ?? '',
    category: (row.category as CulturalPlace['category']) ?? 'cultural_attraction',
    lat: row.lat as number,
    lng: row.lng as number,
    description: row.description ?? '',
    highlight: row.highlight ?? '',
    imageUrls: row.image_urls ?? row.payload?.imageUrls ?? [],
    sourceUrl: row.source_url ?? row.payload?.sourceUrl,
    mapUrl: row.map_url ?? row.payload?.mapUrl,
    source: (row.source as CulturalPlace['source']) ?? row.payload?.source ?? 'local',
  };
}

function hasRemappablePayload(
  payload?: Partial<CulturalPlace> | null
): payload is RemappablePlacePayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      typeof payload.name === 'string' &&
      payload.name.trim() &&
      toNumber(payload.lat) != null &&
      toNumber(payload.lng) != null
  );
}

function mapPayloadToPlaceRow(row: CulturalPlaceRemapRow): CulturalPlaceUpsertRow | null {
  const payload = row.payload;

  if (!row.id || !row.province_code || !hasRemappablePayload(payload)) {
    return null;
  }

  const lat = toNumber(payload.lat);
  const lng = toNumber(payload.lng);

  if (lat == null || lng == null) {
    return null;
  }

  return {
    id: row.id,
    province_code: row.province_code,
    name: payload.name.trim(),
    district: payload.district?.trim() ?? row.district ?? '',
    category: payload.category ?? row.category ?? 'cultural_attraction',
    lat,
    lng,
    description: payload.description ?? row.description ?? '',
    highlight: payload.highlight ?? row.highlight ?? '',
    image_urls: payload.imageUrls ?? row.image_urls ?? [],
    source_url: payload.sourceUrl ?? row.source_url ?? null,
    map_url: payload.mapUrl ?? row.map_url ?? null,
    source: payload.source ?? row.source ?? 'local',
    payload,
    updated_at: new Date().toISOString(),
  };
}

async function getRemapRows(provinceCode?: string | null, source?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error, data: [] as CulturalPlaceRemapRow[] };
  }

  const rows: CulturalPlaceRemapRow[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const from = pageIndex * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.client
      .from(PLACES_TABLE)
      .select(
        'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload, updated_at'
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false as const, error: error.message, data: [] as CulturalPlaceRemapRow[] };
    }

    const nextRows = (data ?? []) as CulturalPlaceRemapRow[];

    rows.push(...nextRows);

    if (nextRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return { ok: true as const, data: rows };
}

async function getStoredPlaces(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const rows: CulturalPlaceRow[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const from = pageIndex * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.client
      .from(PLACES_TABLE)
      .select(
        'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload'
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    const nextRows = (data ?? []) as CulturalPlaceRow[];

    rows.push(...nextRows);

    if (nextRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows
    .map(mapPlaceRow)
    .filter((place): place is CulturalPlace & { provinceCode?: string } => Boolean(place));
}

function isReadyPlace(place: CulturalPlace) {
  return place.lat != null && place.lng != null && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng));
}

async function getOverrides(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error, data: [] as PlaceOverride[] };
  }

  let query = supabase.client
    .from(OVERRIDES_TABLE)
    .select('*');

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  }

  const { data, error } = await query;

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
  const status = request.nextUrl.searchParams.get('status') ?? '';
  const page = Math.max(Number(request.nextUrl.searchParams.get('page') ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get('pageSize') ?? 10), 1), 100);
  const district = request.nextUrl.searchParams.get('district') ?? '';
  const source = request.nextUrl.searchParams.get('source') ?? '';

  const [places, overridesResult] = await Promise.all([
    getStoredPlaces(provinceCode),
    getOverrides(provinceCode),
  ]);
  const overrideMap = new Map(
    overridesResult.data.map((override) => [override.place_id, override])
  );
  const allPlaces = places.map((place) => applyOverride(place, overrideMap.get(place.id)));
  const filteredData = allPlaces
    .filter((place) => {
      if (status === 'ready' && !isReadyPlace(place)) {
        return false;
      }

      if (status === 'not_ready' && isReadyPlace(place)) {
        return false;
      }

      if (district && place.district !== district) {
        return false;
      }

      if (source && place.source !== source) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [place.name, place.district, place.highlight, place.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  const total = filteredData.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const normalizedPage = Math.min(page, totalPages);
  const data = filteredData.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
  const districts = Array.from(
    new Set(
      allPlaces
        .map((place) => place.district)
        .filter((nextDistrict): nextDistrict is string => Boolean(nextDistrict))
    )
  ).sort((first, second) => first.localeCompare(second, 'th'));

  return NextResponse.json({
    data,
    districts,
    page: normalizedPage,
    pageSize,
    total,
    pagination: {
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
    },
    readiness: {
      ready: allPlaces.filter(isReadyPlace).length,
      notReady: allPlaces.filter((place) => !isReadyPlace(place)).length,
    },
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
    detail?: string;
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
    detail: null,
    updated_at: new Date().toISOString(),
    updated_by_id: auth.user.id,
    updated_by_email: auth.user.email ?? null,
    updated_by_name: auth.user.displayName ?? auth.user.email ?? null,
  };
  const updatedAt = new Date().toISOString();
  const detailRow: PlaceDetailRow = {
    place_id: placeId,
    province_code: provinceCode,
    detail_th: body.detail?.trim() || null,
    highlight: body.note?.trim() || null,
    updated_at: updatedAt,
    updated_by_id: auth.user.id,
    updated_by_email: auth.user.email ?? null,
    updated_by_name: auth.user.displayName ?? auth.user.email ?? null,
  };
  row.updated_at = updatedAt;

  const { data, error } = await supabase.client
    .from(OVERRIDES_TABLE)
    .upsert(row, { onConflict: 'place_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { data: detailData, error: detailError } = await supabase.client
    .from(DETAILS_TABLE)
    .upsert(detailRow, { onConflict: 'place_id' })
    .select('*')
    .single();

  if (detailError) {
    return NextResponse.json({ message: detailError.message }, { status: 500 });
  }

  return NextResponse.json({ data, details: detailData });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.culturalPlaces);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    provinceCode?: string;
    source?: string;
    dryRun?: boolean;
  };
  const provinceCode = body.provinceCode?.trim() || null;
  const source = body.source?.trim() || null;
  const rowsResult = await getRemapRows(provinceCode, source);

  if (!rowsResult.ok) {
    return NextResponse.json({ message: rowsResult.error }, { status: 500 });
  }

  const remapRows = rowsResult.data
    .map(mapPayloadToPlaceRow)
    .filter((row): row is CulturalPlaceUpsertRow => Boolean(row));

  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      scanned: rowsResult.data.length,
      remappable: remapRows.length,
      skipped: rowsResult.data.length - remapRows.length,
      provinceCode,
      source,
    });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  let updated = 0;

  for (let index = 0; index < remapRows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = remapRows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.client.from(PLACES_TABLE).upsert(chunk, {
      onConflict: 'id',
    });

    if (error) {
      return NextResponse.json(
        {
          updated,
          scanned: rowsResult.data.length,
          remappable: remapRows.length,
          skipped: rowsResult.data.length - remapRows.length,
          message: error.message,
        },
        { status: 500 }
      );
    }

    updated += chunk.length;
  }

  return NextResponse.json({
    updated,
    scanned: rowsResult.data.length,
    remappable: remapRows.length,
    skipped: rowsResult.data.length - remapRows.length,
    provinceCode,
    source,
    message: `Remapped ${updated} cultural places`,
  });
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

  const { error: detailError } = await supabase.client
    .from(DETAILS_TABLE)
    .delete()
    .eq('place_id', placeId);

  if (detailError) {
    return NextResponse.json({ message: detailError.message }, { status: 500 });
  }

  const { error } = await supabase.client.from(OVERRIDES_TABLE).delete().eq('place_id', placeId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

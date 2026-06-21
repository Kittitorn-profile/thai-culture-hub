import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

const PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const OVERRIDES_TABLE = process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides';
const QUERY_BATCH_SIZE = 1000;
const MAX_QUERY_ROWS = 50000;
const DEFAULT_LIMIT = 16;
const MAX_LIMIT = 100;

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  community_wisdom: 'ภูมิปัญญาชุมชน',
  craftsmanship: 'งานช่างฝีมือ',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  folk_art: 'ศิลปะพื้นบ้าน',
  learning_center: 'แหล่งเรียนรู้',
  local_food: 'อาหารพื้นบ้าน',
  local_tradition: 'ประเพณีท้องถิ่น',
  moral_community: 'ชุมชนคุณธรรม',
  museum: 'พิพิธภัณฑ์',
  performing_art: 'ศิลปะการแสดง',
  ritual: 'พิธีกรรม',
  temple: 'ศาสนสถาน',
  tourist_attraction: 'สถานที่ท่องเที่ยว',
};

type CulturalPlaceRow = {
  id: string;
  province_code: string;
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
};

function mapPlaceRow(row: CulturalPlaceRow): CulturalPlace & { provinceCode: string } | null {
  if (!row.id || !row.name || row.lat == null || row.lng == null) {
    return null;
  }

  return {
    ...(row.payload ?? {}),
    id: row.id,
    provinceCode: row.province_code,
    name: row.name,
    district: row.district ?? '',
    category: (row.category as CulturalPlace['category']) ?? 'cultural_attraction',
    lat: row.lat,
    lng: row.lng,
    description: row.description ?? '',
    highlight: row.highlight ?? '',
    imageUrls: row.image_urls ?? row.payload?.imageUrls ?? [],
    sourceUrl: row.source_url ?? row.payload?.sourceUrl,
    mapUrl: row.map_url ?? row.payload?.mapUrl,
    source: (row.source as CulturalPlace['source']) ?? row.payload?.source ?? 'local',
  };
}

function applyOverride<T extends CulturalPlace & { provinceCode: string }>(
  place: T,
  override?: PlaceOverride
) {
  if (!override) {
    return place;
  }

  return {
    ...place,
    name: override.name || place.name,
    source: (override.source as CulturalPlace['source']) || place.source,
    category: (override.category as CulturalPlace['category']) || place.category,
    district: override.district || place.district,
    lat: override.lat ?? place.lat,
    lng: override.lng ?? place.lng,
    mapUrl: override.map_url || place.mapUrl,
    imageUrls: override.image_url ? [override.image_url] : place.imageUrls,
    highlight: override.note || place.highlight,
    override,
  };
}

function getProvinceName(provinceCode: string) {
  return provinces.find((province) => province.code === provinceCode)?.name ?? provinceCode;
}

function getCategoryLabel(categoryKey: string) {
  return DEFAULT_CATEGORY_LABELS[categoryKey] ?? categoryKey;
}

function getPositiveInteger(value: string | null, fallback: number, maxValue?: number) {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  const integerValue = Math.max(Math.trunc(parsedValue), 0);

  return typeof maxValue === 'number' ? Math.min(integerValue, maxValue) : integerValue;
}

async function fetchPlaces({
  client,
  categoryKey,
  provinceCode,
}: {
  client: SupabaseClient;
  categoryKey?: string;
  provinceCode?: string;
}) {
  const rows: CulturalPlaceRow[] = [];

  for (let from = 0; from < MAX_QUERY_ROWS; from += QUERY_BATCH_SIZE) {
    let query = client
      .from(PLACES_TABLE)
      .select(
        'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload'
      )
      .order('province_code', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    if (categoryKey) {
      query = query.eq('category', categoryKey);
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false as const, error: error.message, data: [] as CulturalPlaceRow[] };
    }

    rows.push(...((data ?? []) as CulturalPlaceRow[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      break;
    }
  }

  return { ok: true as const, data: rows };
}

async function fetchOverrides({
  client,
  provinceCode,
}: {
  client: SupabaseClient;
  provinceCode?: string;
}) {
  const rows: PlaceOverride[] = [];

  for (let from = 0; from < MAX_QUERY_ROWS; from += QUERY_BATCH_SIZE) {
    let query = client
      .from(OVERRIDES_TABLE)
      .select(
        'place_id, province_code, name, source, category, district, lat, lng, map_url, image_url, note, updated_at'
      )
      .order('province_code', { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false as const, error: error.message, data: [] as PlaceOverride[] };
    }

    rows.push(...((data ?? []) as PlaceOverride[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      break;
    }
  }

  return { ok: true as const, data: rows };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const categoryKey = request.nextUrl.searchParams.get('categoryKey')?.trim();
  const provinceCode = request.nextUrl.searchParams.get('provinceCode')?.trim();
  const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
  const limit = getPositiveInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const offset = getPositiveInteger(request.nextUrl.searchParams.get('offset'), 0);

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error }, { status: 500 });
  }

  const placeRows = await fetchPlaces({
    client: supabase.client,
    categoryKey,
    provinceCode,
  });

  if (!placeRows.ok) {
    return NextResponse.json({ data: [], message: placeRows.error }, { status: 500 });
  }

  const overrideRows = await fetchOverrides({
    client: supabase.client,
    provinceCode,
  });

  if (!overrideRows.ok) {
    return NextResponse.json({ data: [], message: overrideRows.error }, { status: 500 });
  }

  const overrideMap = new Map(
    overrideRows.data.map((override) => [override.place_id, override])
  );
  const places = placeRows.data
    .map(mapPlaceRow)
    .filter((place): place is CulturalPlace & { provinceCode: string } => Boolean(place))
    .map((place) => applyOverride(place, overrideMap.get(place.id)))
    .filter((place) => !categoryKey || place.category === categoryKey)
    .filter((place) => {
      if (!query) {
        return true;
      }

      return [place.name, place.district, place.highlight, getProvinceName(place.provinceCode)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .map((place) => ({
      ...place,
      provinceName: getProvinceName(place.provinceCode),
    }))
    .sort((first, second) =>
      `${first.provinceName}${first.district}${first.name}`.localeCompare(
        `${second.provinceName}${second.district}${second.name}`,
        'th'
      )
    );

  const paginatedPlaces = places.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginatedPlaces,
    category: categoryKey
      ? {
          key: categoryKey,
          label: getCategoryLabel(categoryKey),
        }
      : null,
    total: places.length,
    limit,
    offset,
    hasMore: offset + paginatedPlaces.length < places.length,
    nextOffset: offset + paginatedPlaces.length,
  });
}

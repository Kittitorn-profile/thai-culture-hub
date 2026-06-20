import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

type PlaceSource =
  | 'culture_catalog'
  | 'tat'
  | 'finearts_monument'
  | 'finearts_archeology'
  | 'finearts_buddha'
  | 'finearts_museum';

type SourceResponse = {
  data?: CulturalPlace[];
  message?: string;
  source?: string;
};

type SourceResult = {
  key: PlaceSource;
  data: CulturalPlace[];
  source?: string;
  message?: string;
  status?: number;
};

type PlaceOverride = {
  place_id: string;
  name?: string | null;
  source?: CulturalPlace['source'] | string | null;
  category?: CulturalPlace['category'] | string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  map_url?: string | null;
  image_url?: string | null;
  note?: string | null;
  updated_at?: string | null;
};

const SOURCE_ENDPOINTS: Record<PlaceSource, string> = {
  tat: '/api/tat/places',
  finearts_monument: '/api/finearts/monument',
  finearts_archeology: '/api/finearts/archeology',
  finearts_buddha: '/api/finearts/buddha',
  finearts_museum: '/api/finearts/museum',
  culture_catalog: '/api/culture/places',
};
const SOURCE_KEYS: PlaceSource[] = [
  'tat',
  'finearts_monument',
  'finearts_archeology',
  'finearts_buddha',
  'finearts_museum',
  'culture_catalog',
];
const OVERRIDES_TABLE = process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides';

function getLimit(value: string | null) {
  if (value == null) {
    return null;
  }

  const limit = Number(value ?? 50);

  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 50;
}

function getPositiveInteger(value: string | null, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(Math.floor(numberValue), 1) : fallback;
}

function mergeCulturalPlaces(...placeGroups: CulturalPlace[][]) {
  const placeMap = new Map<string, CulturalPlace>();

  placeGroups.flat().forEach((place) => {
    const key = `${place.name}-${place.district}-${place.lat}-${place.lng}`;

    if (!placeMap.has(key)) {
      placeMap.set(key, place);
    }
  });

  return Array.from(placeMap.values());
}

async function getPlaceOverrides(provinceCode: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const { data, error } = await supabase.client
    .from(OVERRIDES_TABLE)
    .select(
      'place_id, name, source, category, district, lat, lng, map_url, image_url, note, updated_at'
    )
    .eq('province_code', provinceCode);

  if (error) {
    return [];
  }

  return (data ?? []) as PlaceOverride[];
}

type CulturalPlaceWithOverride = CulturalPlace & {
  override?: PlaceOverride | null;
};

function createPlaceFromOverride(override: PlaceOverride): CulturalPlaceWithOverride | null {
  if (override.lat == null || override.lng == null) {
    return null;
  }

  const source =
    override.source &&
    [
      'local',
      'tat',
      'culture_catalog',
      'thailand_cultural_hub',
      'finearts_monument',
      'finearts_archeology',
      'finearts_buddha',
      'finearts_museum',
    ].includes(override.source)
      ? (override.source as CulturalPlace['source'])
      : 'thailand_cultural_hub';

  return {
    id: override.place_id,
    name: override.name || 'สถานที่ใหม่',
    source,
    lat: override.lat,
    lng: override.lng,
    mapUrl: override.map_url || undefined,
    imageUrls: override.image_url ? [override.image_url] : undefined,
    district: override.district || '',
    category: (override.category as CulturalPlace['category']) || 'cultural_attraction',
    description: override.note || '',
    highlight: override.note || 'เพิ่มจาก CMS',
    override,
  };
}

function applyPlaceOverrides(places: CulturalPlace[], overrides: PlaceOverride[]) {
  if (!overrides.length) {
    return places;
  }

  const overrideMap = new Map(overrides.map((override) => [override.place_id, override]));
  const overriddenPlaces = places.map((place) => {
    const override = overrideMap.get(place.id);

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
  });
  const existingPlaceIds = new Set(places.map((place) => place.id));
  const overrideOnlyPlaces = overrides
    .filter((override) => !existingPlaceIds.has(override.place_id))
    .map(createPlaceFromOverride)
    .filter((place): place is CulturalPlaceWithOverride => !!place);

  return [...overrideOnlyPlaces, ...overriddenPlaces];
}

function getDistricts(places: CulturalPlace[]) {
  return Array.from(
    new Set(
      places.map((place) => place.district).filter((district): district is string => !!district)
    )
  ).sort((firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, 'th'));
}

function filterPlaces(places: CulturalPlace[], district: string, query: string, source: string) {
  const normalizedDistrict = district.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSource = source.trim().toLowerCase();

  return places.filter((place) => {
    if (normalizedDistrict && place.district?.trim().toLowerCase() !== normalizedDistrict) {
      return false;
    }

    if (normalizedSource && place.source?.trim().toLowerCase() !== normalizedSource) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [place.name, place.district, place.highlight, place.source]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

async function fetchSourcePlaces({
  key,
  limit,
  origin,
  signal,
  provinceCode,
  summary,
}: {
  key: PlaceSource;
  limit: number | null;
  origin: string;
  signal: AbortSignal;
  provinceCode: string;
  summary: boolean;
}): Promise<SourceResult> {
  const url = new URL(SOURCE_ENDPOINTS[key], origin);

  url.searchParams.set('provinceCode', provinceCode);

  if (limit != null) {
    url.searchParams.set('limit', `${limit}`);
  }

  if (summary) {
    url.searchParams.set('summary', 'true');
  }

  try {
    const response = await fetch(url, { signal });
    const json = (await response.json().catch(() => ({}))) as SourceResponse;
    const data = response.ok && Array.isArray(json.data) ? json.data : [];

    return {
      key,
      data,
      source: json.source,
      status: response.status,
      message: response.ok ? undefined : json.message,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    return {
      key,
      data: [],
      message: error instanceof Error ? error.message : 'Failed to load source data',
    };
  }
}

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const isSummary = request.nextUrl.searchParams.get('summary') === 'true';
  const requestedLimit = getLimit(request.nextUrl.searchParams.get('limit'));
  const page = getPositiveInteger(request.nextUrl.searchParams.get('page'), 1);
  const pageSizeParam = request.nextUrl.searchParams.get('pageSize');
  const pageSize = pageSizeParam ? Math.min(getPositiveInteger(pageSizeParam, 10), 100) : null;
  const district = request.nextUrl.searchParams.get('district') ?? '';
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const source = request.nextUrl.searchParams.get('source') ?? '';

  if (!provinceCode) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  const sourceResults = await Promise.all(
    SOURCE_KEYS.map((key) =>
      fetchSourcePlaces({
        key,
        summary: isSummary,
        signal: request.signal,
        origin: request.nextUrl.origin,
        provinceCode,
        limit: requestedLimit,
      })
    )
  );
  const sources = Object.fromEntries(
    sourceResults.map((result) => [
      result.key,
      {
        count: result.data.length,
        source: result.source,
        status: result.status,
        message: result.message,
      },
    ])
  );
  const mergedData = mergeCulturalPlaces(...sourceResults.map((result) => result.data));
  const allData = applyPlaceOverrides(mergedData, await getPlaceOverrides(provinceCode));
  const districts = getDistricts(allData);
  const filteredData = filterPlaces(allData, district, query, source);
  const total = filteredData.length;
  const totalPages = pageSize ? Math.max(Math.ceil(total / pageSize), 1) : 1;
  const normalizedPage = Math.min(page, totalPages);
  const data = pageSize
    ? filteredData.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)
    : filteredData;

  return NextResponse.json({
    data,
    districts,
    page: normalizedPage,
    pageSize: pageSize ?? total,
    total,
    pagination: {
      page: normalizedPage,
      pageSize: pageSize ?? total,
      total,
      totalPages,
    },
    sources,
    source: 'culture-province-places',
  });
}

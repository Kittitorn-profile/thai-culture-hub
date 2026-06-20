import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 10000;
const DEFAULT_TABLE_NAME = 'cultural_places';

const SOURCE_ENDPOINTS = {
  culture_catalog: '/api/culture/places',
  tat: '/api/tat/places',
  finearts_archeology: '/api/finearts/archeology',
} as const;

type SyncSource = keyof typeof SOURCE_ENDPOINTS;

type SyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  sources?: SyncSource[];
  limit?: number;
  dryRun?: boolean;
};

type SourceFetchResult = {
  source: SyncSource;
  data: CulturalPlace[];
  message?: string;
  status: number;
};

type CulturalPlaceRow = {
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
  payload: CulturalPlace;
  updated_at: string;
};

function getLimit(value?: number | string | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
}

function getSources(value?: string | SyncSource[] | null): SyncSource[] {
  const sourceValues = Array.isArray(value) ? value : value?.split(',');
  const sources = (sourceValues ?? Object.keys(SOURCE_ENDPOINTS)).filter(
    (source): source is SyncSource => source in SOURCE_ENDPOINTS
  );

  return sources.length ? sources : Object.keys(SOURCE_ENDPOINTS) as SyncSource[];
}

function getProvinceCodes(body: SyncBody, request: NextRequest) {
  const searchProvinceCode = request.nextUrl.searchParams.get('provinceCode');
  const searchProvinceCodes = request.nextUrl.searchParams.get('provinceCodes');
  const bodyProvinceCodes = body.provinceCodes ?? (body.provinceCode ? [body.provinceCode] : []);
  const requestedCodes = [
    ...bodyProvinceCodes,
    ...(searchProvinceCode ? [searchProvinceCode] : []),
    ...(searchProvinceCodes ? searchProvinceCodes.split(',') : []),
  ].filter(Boolean);

  if (!requestedCodes.length) {
    return provinces.map((province) => province.code);
  }

  return Array.from(new Set(requestedCodes));
}

function getValidProvinceCodes(provinceCodes: string[]) {
  const validCodes = new Set(provinces.map((province) => province.code));

  return provinceCodes.filter((provinceCode) => validCodes.has(provinceCode));
}

async function readSyncBody(request: NextRequest): Promise<SyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as SyncBody;
  } catch {
    return {};
  }
}

async function fetchSourcePlaces(
  request: NextRequest,
  provinceCode: string,
  source: SyncSource,
  limit: number
): Promise<SourceFetchResult> {
  const url = new URL(SOURCE_ENDPOINTS[source], request.nextUrl.origin);

  url.searchParams.set('provinceCode', provinceCode);
  url.searchParams.set('limit', `${limit}`);

  const response = await fetch(url, {
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  const data = Array.isArray(json?.data) ? json.data : [];

  return {
    source,
    data,
    status: response.status,
    message: json?.message,
  };
}

function mapPlaceToRow(place: CulturalPlace, provinceCode: string): CulturalPlaceRow {
  return {
    id: place.id,
    province_code: provinceCode,
    name: place.name,
    district: place.district,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    description: place.description,
    highlight: place.highlight,
    image_urls: place.imageUrls ?? [],
    source_url: place.sourceUrl ?? null,
    map_url: place.mapUrl ?? null,
    source: place.source ?? 'local',
    payload: place,
    updated_at: new Date().toISOString(),
  };
}

async function handleSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);
  const tableName = process.env.CULTURAL_PLACES_TABLE ?? DEFAULT_TABLE_NAME;
  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const sources = getSources(body.sources ?? request.nextUrl.searchParams.get('sources'));
  const provinceCodes = getValidProvinceCodes(getProvinceCodes(body, request));

  if (!provinceCodes.length) {
    return NextResponse.json(
      { inserted: 0, updated: 0, message: 'No valid province codes' },
      { status: 400 }
    );
  }

  const results: SourceFetchResult[] = [];

  for (const provinceCode of provinceCodes) {
    for (const source of sources) {
      results.push(await fetchSourcePlaces(request, provinceCode, source, limit));
    }
  }

  const rows = results.flatMap((result, index) => {
    const provinceCode = provinceCodes[Math.floor(index / sources.length)];

    return result.data.map((place) => mapPlaceToRow(place, provinceCode));
  });
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      table: tableName,
      total: uniqueRows.length,
      sources: results,
    });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json(
      {
        inserted: 0,
        updated: 0,
        total: uniqueRows.length,
        message: supabase.error,
      },
      { status: 500 }
    );
  }

  const { client } = supabase;
  const { error } = await client.from(tableName).upsert(uniqueRows, {
    onConflict: 'id',
  });

  if (error) {
    return NextResponse.json(
      {
        inserted: 0,
        updated: 0,
        total: uniqueRows.length,
        message: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    table: tableName,
    total: uniqueRows.length,
    upserted: uniqueRows.length,
    provinceCodes,
    sources: results.map((result) => ({
      source: result.source,
      status: result.status,
      total: result.data.length,
      message: result.message,
    })),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleSync(request, { defaultDryRun: true });
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

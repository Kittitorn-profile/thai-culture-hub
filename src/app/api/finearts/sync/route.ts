import type { NextRequest } from 'next/server';
import type { CulturalPlace, CulturalCategory } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const DEFAULT_TABLE_NAME = 'cultural_places';
const FINE_ARTS_API_BASE_URL = 'https://api.finearts.go.th/data/api';
const UPSERT_CHUNK_SIZE = 100;

const FINE_ARTS_SOURCES = {
  monument: {
    endpoint: `${FINE_ARTS_API_BASE_URL}/monument/search`,
    source: 'finearts_monument',
    category: 'heritage',
    fallbackHighlight: 'โบราณสถานกรมศิลปากร',
  },
  archeology: {
    endpoint: `${FINE_ARTS_API_BASE_URL}/archeology/search`,
    source: 'finearts_archeology',
    category: 'cultural_attraction',
    fallbackHighlight: 'แหล่งโบราณคดีกรมศิลปากร',
  },
  buddha: {
    endpoint: `${FINE_ARTS_API_BASE_URL}/buddha/search`,
    source: 'finearts_buddha',
    category: 'temple',
    fallbackHighlight: 'พระพุทธรูป/วัตถุศิลปะกรมศิลปากร',
  },
  museum: {
    endpoint: `${FINE_ARTS_API_BASE_URL}/museum/search`,
    source: 'finearts_museum',
    category: 'museum',
    fallbackHighlight: 'พิพิธภัณฑ์กรมศิลปากร',
  },
} as const;

type FineArtsSource = keyof typeof FINE_ARTS_SOURCES;
type FineArtsSourceConfig = (typeof FINE_ARTS_SOURCES)[FineArtsSource];

type SyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  sources?: FineArtsSource[];
  limit?: number;
  dryRun?: boolean;
};

type FineArtsRecord = Record<string, unknown>;

type SourceFetchResult = {
  source: FineArtsSource;
  provinceCode: string;
  status: number;
  total: number;
  mapped: number;
  message?: string;
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

function getFineArtsApiKey() {
  return (process.env.FINE_ARTS_API_KEY ?? process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY)?.trim();
}

function getLimit(value?: number | string | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
}

function getSources(value?: string | FineArtsSource[] | null): FineArtsSource[] {
  const sourceValues = Array.isArray(value) ? value : value?.split(',');
  const sources = (sourceValues ?? Object.keys(FINE_ARTS_SOURCES)).filter(
    (source): source is FineArtsSource => source in FINE_ARTS_SOURCES
  );

  return sources.length ? sources : (Object.keys(FINE_ARTS_SOURCES) as FineArtsSource[]);
}

function getProvinceCodes(body: SyncBody, request: NextRequest) {
  const searchProvinceCode = request.nextUrl.searchParams.get('provinceCode');
  const searchProvinceCodes = request.nextUrl.searchParams.get('provinceCodes');
  const bodyProvinceCodes = body.provinceCodes ?? (body.provinceCode ? [body.provinceCode] : []);
  const requestedCodes = [
    ...bodyProvinceCodes,
    ...(searchProvinceCode ? [searchProvinceCode] : []),
    ...(searchProvinceCodes ? searchProvinceCodes.split(',') : []),
  ]
    .map((provinceCode) => provinceCode.trim())
    .filter(Boolean);

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

function normalizeText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').trim();
}

function slugifyThai(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getString(record: FineArtsRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return '';
}

function toCoordinate(value: unknown) {
  const coordinate = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

function getCoordinate(record: FineArtsRecord, keys: string[]) {
  for (const key of keys) {
    const coordinate = toCoordinate(record[key]);

    if (coordinate != null) {
      return coordinate;
    }
  }

  return null;
}

function getRecords(json: unknown): FineArtsRecord[] {
  if (Array.isArray(json)) {
    return json as FineArtsRecord[];
  }

  if (!json || typeof json !== 'object') {
    return [];
  }

  const response = json as Record<string, unknown>;
  const candidates = [
    response.data,
    response.result,
    response.records,
    response.items,
    response.rows,
    response?.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>).items
      : null,
    response?.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>).records
      : null,
  ];

  return candidates.find(Array.isArray) as FineArtsRecord[] ?? [];
}

function getImageUrls(record: FineArtsRecord) {
  const values = [
    record.image,
    record.imageUrl,
    record.image_url,
    record.picture,
    record.pictureUrl,
    record.thumbnail,
  ];
  const imageUrls = values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && Boolean(item));
    }

    return typeof value === 'string' && value ? [value] : [];
  });

  return Array.from(new Set(imageUrls));
}

function mapFineArtsRecordToPlace(
  record: FineArtsRecord,
  provinceCode: string,
  sourceKey: FineArtsSource,
  config: FineArtsSourceConfig
): CulturalPlace | null {
  const name = getString(record, [
    'name',
    'title',
    'siteName',
    'monumentName',
    'archeologyName',
    'buddhaName',
    'museumName',
    'placeName',
    'thaiName',
    'nameTh',
    'name_th',
  ]);
  const lat = getCoordinate(record, ['latitude', 'lat', 'Latitude', 'LAT']);
  const lng = getCoordinate(record, ['longitude', 'lng', 'lon', 'long', 'Longitude', 'LON', 'LONG']);

  if (!name || lat == null || lng == null) {
    return null;
  }

  const id =
    getString(record, ['id', '_id', 'objectId', 'code', 'no', 'registrationNo']) ||
    `${provinceCode}-${slugifyThai(name)}-${lat}-${lng}`;
  const district = getString(record, [
    'amphoeName',
    'amphoe',
    'district',
    'districtName',
    'district_name',
    'county',
  ]);
  const highlight =
    getString(record, ['registerStatus', 'status', 'type', 'category', 'artifactType']) ||
    config.fallbackHighlight;
  const description = [
    getString(record, ['detail']),
    getString(record, ['description']),
    getString(record, ['history']),
    getString(record, ['address']),
    highlight,
  ]
    .filter(Boolean)
    .join(' ');
  const sourceUrl = getString(record, ['url', 'link', 'sourceUrl', 'source_url']) || config.endpoint;
  const mapUrl = getString(record, ['mapUrl', 'map_url', 'googleMapUrl']);

  return {
    id: `finearts-${sourceKey}-${id}-${slugifyThai(name)}`,
    name,
    district,
    category: config.category as CulturalCategory,
    lat,
    lng,
    description: description || config.fallbackHighlight,
    highlight,
    imageUrls: getImageUrls(record),
    sourceUrl,
    mapUrl: mapUrl || undefined,
    source: config.source,
  };
}

async function fetchFineArtsPlaces(
  provinceCode: string,
  source: FineArtsSource,
  limit: number,
  apiKey: string
) {
  const province = provinces.find((item) => item.code === provinceCode);
  const config = FINE_ARTS_SOURCES[source];
  const url = new URL(config.endpoint);

  if (!province) {
    return {
      source,
      provinceCode,
      status: 400,
      total: 0,
      mapped: 0,
      message: 'Invalid provinceCode',
      data: [] as CulturalPlace[],
    };
  }

  url.searchParams.set('province', province.name);
  url.searchParams.set('provinceName', province.name);
  url.searchParams.set('limit', `${limit}`);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'x-api-key': apiKey,
      'X-API-KEY': apiKey,
      'api-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      source,
      provinceCode,
      status: response.status,
      total: 0,
      mapped: 0,
      message: json?.errorMessage ?? json?.message ?? `Fine Arts API failed: ${response.status}`,
      data: [] as CulturalPlace[],
    };
  }

  const targetProvinceName = normalizeText(province.name);
  const records = getRecords(json).filter((record) => {
    const recordProvince = getString(record, ['provinceName', 'province', 'province_name']);

    return !recordProvince || normalizeText(recordProvince) === targetProvinceName;
  });
  const data = records
    .map((record) => mapFineArtsRecordToPlace(record, provinceCode, source, config))
    .filter((item: CulturalPlace | null): item is CulturalPlace => Boolean(item));

  return {
    source,
    provinceCode,
    status: response.status,
    total: records.length,
    mapped: data.length,
    data,
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

async function upsertRows(tableName: string, rows: CulturalPlaceRow[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.client.from(tableName).upsert(chunk, {
      onConflict: 'id',
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

async function handleSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const apiKey = getFineArtsApiKey();
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);
  const tableName = process.env.CULTURAL_PLACES_TABLE ?? DEFAULT_TABLE_NAME;
  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const sources = getSources(body.sources ?? request.nextUrl.searchParams.get('sources'));
  const provinceCodes = getValidProvinceCodes(getProvinceCodes(body, request));

  if (!apiKey) {
    return NextResponse.json(
      { table: tableName, total: 0, upserted: 0, message: 'Missing FINE_ARTS_API_KEY' },
      { status: 500 }
    );
  }

  if (!provinceCodes.length) {
    return NextResponse.json(
      { table: tableName, total: 0, upserted: 0, message: 'No valid province codes' },
      { status: 400 }
    );
  }

  const results: Array<SourceFetchResult & { data: CulturalPlace[] }> = [];

  for (const provinceCode of provinceCodes) {
    for (const source of sources) {
      results.push(await fetchFineArtsPlaces(provinceCode, source, limit, apiKey));
    }
  }

  const rows = results.flatMap((result) =>
    result.data.map((place) => mapPlaceToRow(place, result.provinceCode))
  );
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      table: tableName,
      total: uniqueRows.length,
      provinceCodes,
      sources: results.map(({ data, ...result }) => result),
    });
  }

  const failedResults = results.filter((result) => result.status >= 400);

  if (failedResults.length) {
    return NextResponse.json(
      {
        table: tableName,
        total: uniqueRows.length,
        upserted: 0,
        provinceCodes,
        sources: failedResults.map(({ data, ...result }) => result),
        message: 'Fine Arts API returned errors',
      },
      { status: failedResults[0].status }
    );
  }

  const upsertResult = await upsertRows(tableName, uniqueRows);

  if (!upsertResult.ok) {
    return NextResponse.json(
      {
        table: tableName,
        total: uniqueRows.length,
        upserted: 0,
        provinceCodes,
        message: upsertResult.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    table: tableName,
    total: uniqueRows.length,
    upserted: uniqueRows.length,
    provinceCodes,
    sources: results.map(({ data, ...result }) => result),
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

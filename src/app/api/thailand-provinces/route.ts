import type { NextRequest } from 'next/server';
import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';

import path from 'node:path';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const DEFAULT_PROVINCES_TABLE_NAME = 'thailand_provinces';
const KONGVUT_PROVINCES_API_URL =
  'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json';
const APISIT_PROVINCES_GEOJSON_URL =
  'https://raw.githubusercontent.com/apisit/thailand.json/master/thailandWithName.json';
const APISIT_PROVINCE_NAME_ALIASES: Record<string, string> = {
  'bangkok metropolis': 'bangkok',
  'lop buri': 'lopburi',
};
const THAILAND_PROVINCES_GEOJSON_FILE = path.join(
  process.cwd(),
  'public/assets/maps/thailand-provinces.geojson'
);

type GeoJsonFeature = Feature<Geometry, GeoJsonProperties>;
type KongvutProvince = {
  id: number;
  name_th: string;
  name_en: string;
  geography_id: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};
type ProvinceSyncBody = {
  provinceId?: string;
  provinceIds?: string[];
  dryRun?: boolean;
};
type ProvinceBoundaryRow = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  geometry: Geometry;
  properties: GeoJsonProperties;
  source: string;
  updated_at: string;
};

export const revalidate = 86400;
export const runtime = 'nodejs';

async function readProvincesGeoJsonText() {
  return readFile(THAILAND_PROVINCES_GEOJSON_FILE, 'utf8');
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchSourceProvinceRows() {
  const [provinceMetadata, provinceGeoJson] = await Promise.all([
    fetchJson<KongvutProvince[]>(KONGVUT_PROVINCES_API_URL),
    fetchJson<FeatureCollection>(APISIT_PROVINCES_GEOJSON_URL),
  ]);

  return { provinceMetadata, provinceGeoJson };
}

function getGeometryBounds(geometry: Geometry): [[number, number], [number, number]] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  function walk(coordinates: unknown) {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      minX = Math.min(minX, coordinates[0]);
      maxX = Math.max(maxX, coordinates[0]);
      minY = Math.min(minY, coordinates[1]);
      maxY = Math.max(maxY, coordinates[1]);
      return;
    }

    coordinates.forEach(walk);
  }

  if ('coordinates' in geometry) {
    walk(geometry.coordinates);
  }

  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function getGeometryCenter(geometry: Geometry) {
  const [[minX, minY], [maxX, maxY]] = getGeometryBounds(geometry);

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return null;
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number];
}

function getProvinceId(feature: GeoJsonFeature) {
  const provinceId =
    feature.properties?.shapeISO ??
    feature.properties?.id ??
    feature.properties?.shapeID ??
    feature.id;

  return typeof provinceId === 'string' || typeof provinceId === 'number' ? String(provinceId) : '';
}

function getProvinceName(feature: GeoJsonFeature, provinceId: string) {
  const province = provinces.find((item) => item.code === provinceId);
  const provinceName =
    province?.name ??
    feature.properties?.shapeName ??
    feature.properties?.name ??
    feature.properties?.NAME_1;

  return typeof provinceName === 'string' && provinceName.trim()
    ? provinceName.trim()
    : provinceId;
}

function normalizeProvinceName(value?: string | number | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeApisitProvinceName(value?: string | number | null) {
  const normalizedName = normalizeProvinceName(value);

  return APISIT_PROVINCE_NAME_ALIASES[normalizedName] ?? normalizedName;
}

function getProvinceRegion(provinceId: string) {
  return provinces.find((province) => province.code === provinceId)?.region ?? '';
}

function getProvinceCodeByThaiName(name: string) {
  return provinces.find((province) => province.name === name)?.code ?? '';
}

function getProvinceIds(body: ProvinceSyncBody, request: NextRequest) {
  const searchProvinceId = request.nextUrl.searchParams.get('provinceId');
  const searchProvinceIds = request.nextUrl.searchParams.get('provinceIds');
  const requestedProvinceIds = [
    ...(body.provinceIds ?? []),
    ...(body.provinceId ? [body.provinceId] : []),
    ...(searchProvinceId ? [searchProvinceId] : []),
    ...(searchProvinceIds ? searchProvinceIds.split(',') : []),
  ]
    .map((provinceId) => provinceId.trim())
    .filter(Boolean);

  return Array.from(new Set(requestedProvinceIds));
}

async function readSyncBody(request: NextRequest): Promise<ProvinceSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as ProvinceSyncBody;
  } catch {
    return {};
  }
}

function mapFeatureToRow(
  feature: GeoJsonFeature,
  updatedAt: string,
  provinceMetadataByName = new Map<string, KongvutProvince>()
): ProvinceBoundaryRow | null {
  const apisitProvinceName = normalizeApisitProvinceName(feature.properties?.name as string | undefined);
  const provinceMetadata = provinceMetadataByName.get(apisitProvinceName);
  const provinceId = provinceMetadata
    ? getProvinceCodeByThaiName(provinceMetadata.name_th)
    : getProvinceId(feature);
  const center = getGeometryCenter(feature.geometry);

  if (!provinceId || !center) {
    return null;
  }

  const [lng, lat] = center;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: provinceId,
    name: provinceMetadata?.name_th ?? getProvinceName(feature, provinceId),
    region: getProvinceRegion(provinceId),
    lat,
    lng,
    geometry: feature.geometry,
    properties: {
      ...(feature.properties ?? {}),
      kongvut: provinceMetadata ?? null,
      apisit: {
        name: feature.properties?.name ?? null,
      },
    },
    source: `${KONGVUT_PROVINCES_API_URL}, ${APISIT_PROVINCES_GEOJSON_URL}`,
    updated_at: updatedAt,
  };
}

function getExternalProvinceRows(
  geoJson: FeatureCollection,
  provinceMetadata: KongvutProvince[],
  provinceIds: string[]
) {
  const requestedProvinceIds = new Set(provinceIds);
  const updatedAt = new Date().toISOString();
  const features = Array.isArray(geoJson.features) ? (geoJson.features as GeoJsonFeature[]) : [];
  const provinceMetadataByName = new Map(
    provinceMetadata.map((province) => [normalizeProvinceName(province.name_en), province])
  );

  return features
    .map((feature) => mapFeatureToRow(feature, updatedAt, provinceMetadataByName))
    .filter((row): row is ProvinceBoundaryRow => Boolean(row))
    .filter((row) => !requestedProvinceIds.size || requestedProvinceIds.has(row.id));
}

async function upsertProvinceRows(tableName: string, rows: ProvinceBoundaryRow[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  const { error } = await supabase.client.from(tableName).upsert(rows, {
    onConflict: 'id',
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

async function handleProvinceSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);
  const tableName = process.env.THAILAND_PROVINCES_TABLE ?? DEFAULT_PROVINCES_TABLE_NAME;
  const provinceIds = getProvinceIds(body, request);
  const { provinceMetadata, provinceGeoJson } = await fetchSourceProvinceRows();
  const rows = getExternalProvinceRows(provinceGeoJson, provinceMetadata, provinceIds);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      table: tableName,
      total: rows.length,
      provinceIds,
      sources: {
        metadata: KONGVUT_PROVINCES_API_URL,
        geoJson: APISIT_PROVINCES_GEOJSON_URL,
      },
      sample: rows.slice(0, 3),
    });
  }

  const syncResult = await upsertProvinceRows(tableName, rows);

  if (!syncResult.ok) {
    return NextResponse.json(
      {
        table: tableName,
        total: rows.length,
        upserted: 0,
        provinceIds,
        message: syncResult.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    table: tableName,
    total: rows.length,
    upserted: rows.length,
    provinceIds,
    sources: {
      metadata: KONGVUT_PROVINCES_API_URL,
      geoJson: APISIT_PROVINCES_GEOJSON_URL,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('sync') === 'true') {
      return handleProvinceSync(request, { defaultDryRun: false });
    }

    const geoJson = await readProvincesGeoJsonText();

    return new NextResponse(geoJson, {
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Failed to load Thailand provinces GeoJSON' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleProvinceSync(request);
  } catch {
    return NextResponse.json(
      { message: 'Failed to sync Thailand provinces GeoJSON' },
      { status: 500 }
    );
  }
}

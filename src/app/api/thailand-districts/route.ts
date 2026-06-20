import type { NextRequest } from 'next/server';
import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';

import path from 'node:path';
import { geoCentroid } from 'd3-geo';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const THAILAND_DISTRICTS_GEOJSON_API_URL =
  'https://www.geoboundaries.org/api/current/gbOpen/THA/ADM2/';
const KONGVUT_PROVINCES_API_URL =
  'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json';
const KONGVUT_DISTRICTS_API_URL =
  'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json';
const DEFAULT_DISTRICTS_TABLE_NAME = 'thailand_districts';
const UPSERT_CHUNK_SIZE = 100;
const THAILAND_PROVINCES_GEOJSON_FILE = path.join(
  process.cwd(),
  'public/assets/maps/thailand-provinces.geojson'
);

type GeoBoundariesApiResponse = {
  simplifiedGeometryGeoJSON?: string;
  gjDownloadURL?: string;
};

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
type KongvutDistrict = {
  id: number;
  name_th: string;
  name_en: string;
  province_id: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};
type DistrictCenter = {
  name: string;
  lat: number;
  lng: number;
};
type DistrictCenterRow = {
  name: string | null;
  lat: number | null;
  lng: number | null;
};
type DistrictSyncBody = {
  provinceId?: string;
  provinceIds?: string[];
  dryRun?: boolean;
};
type DistrictBoundaryRow = {
  id: string;
  province_code: string;
  name: string;
  lat: number;
  lng: number;
  geometry: Geometry;
  properties: GeoJsonProperties;
  source: string;
  updated_at: string;
};

let districtsGeoJsonPromise: Promise<FeatureCollection> | null = null;
let provincesGeoJsonPromise: Promise<FeatureCollection> | null = null;
const districtCentersByProvincePromise = new Map<string, Promise<DistrictCenter[]>>();

export const revalidate = 86400;
export const runtime = 'nodejs';

async function getDistrictsGeoJson() {
  if (districtsGeoJsonPromise) {
    return districtsGeoJsonPromise;
  }

  districtsGeoJsonPromise = fetchDistrictsGeoJson().catch((error) => {
    districtsGeoJsonPromise = null;
    throw error;
  });

  return districtsGeoJsonPromise;
}

async function getProvincesGeoJson() {
  if (provincesGeoJsonPromise) {
    return provincesGeoJsonPromise;
  }

  provincesGeoJsonPromise = readFile(THAILAND_PROVINCES_GEOJSON_FILE, 'utf8')
    .then((geoJson) => JSON.parse(geoJson) as FeatureCollection)
    .catch((error) => {
      provincesGeoJsonPromise = null;
      throw error;
    });

  return provincesGeoJsonPromise;
}

async function fetchDistrictsGeoJson() {
  const apiResponse = await fetch(THAILAND_DISTRICTS_GEOJSON_API_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (!apiResponse.ok) {
    throw new Error(`Failed to load district GeoJSON API: ${apiResponse.status}`);
  }

  const boundaryData = (await apiResponse.json()) as GeoBoundariesApiResponse;
  const districtGeoJsonUrl = boundaryData.simplifiedGeometryGeoJSON ?? boundaryData.gjDownloadURL;

  if (!districtGeoJsonUrl) {
    throw new Error('District GeoJSON API did not return a geometry URL');
  }

  const geoJsonResponse = await fetch(districtGeoJsonUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (!geoJsonResponse.ok) {
    throw new Error(`Failed to load district GeoJSON: ${geoJsonResponse.status}`);
  }

  return (await geoJsonResponse.json()) as FeatureCollection;
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

async function fetchKongvutDistrictSource() {
  const [provinceMetadata, districtMetadata] = await Promise.all([
    fetchJson<KongvutProvince[]>(KONGVUT_PROVINCES_API_URL),
    fetchJson<KongvutDistrict[]>(KONGVUT_DISTRICTS_API_URL),
  ]);

  return { provinceMetadata, districtMetadata };
}

async function getProvinceFeature(provinceId: string) {
  const geoJson = await getProvincesGeoJson();

  return (
    geoJson?.features.find((feature) => feature.properties?.shapeISO === provinceId) ??
    null
  );
}

function doBoundsOverlap(
  [[minX1, minY1], [maxX1, maxY1]]: [[number, number], [number, number]],
  [[minX2, minY2], [maxX2, maxY2]]: [[number, number], [number, number]]
) {
  if (![minX1, minY1, maxX1, maxY1, minX2, minY2, maxX2, maxY2].every(Number.isFinite)) {
    return false;
  }

  return minX1 <= maxX2 && maxX1 >= minX2 && minY1 <= maxY2 && maxY1 >= minY2;
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
  const centroid = geoCentroid({
    type: 'Feature',
    properties: {},
    geometry,
  });

  if (centroid.every(Number.isFinite)) {
    return centroid as [number, number];
  }

  const [[minX, minY], [maxX, maxY]] = getGeometryBounds(geometry);

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return null;
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number];
}

function getDistrictName(feature: GeoJsonFeature) {
  const districtName =
    feature.properties?.shapeName ??
    feature.properties?.name ??
    feature.properties?.NAME_2 ??
    feature.properties?.ADM2_TH ??
    feature.properties?.ADM2_EN;

  return typeof districtName === 'string' && districtName.trim()
    ? districtName.trim()
    : 'ไม่ระบุอำเภอ';
}

function getProvinceCodeByThaiName(name: string) {
  return provinces.find((province) => province.name === name)?.code ?? '';
}

function toDistrictCenters(features: GeoJsonFeature[]) {
  return features.reduce<DistrictCenter[]>((districtCenters, feature) => {
    const center = getGeometryCenter(feature.geometry);

    if (!center) {
      return districtCenters;
    }

    const [lng, lat] = center;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return districtCenters;
    }

    districtCenters.push({
      name: getDistrictName(feature),
      lat,
      lng,
    });

    return districtCenters;
  }, []);
}

function toValidDistrictCenters(rows: DistrictCenterRow[]) {
  return rows.reduce<DistrictCenter[]>((districtCenters, row) => {
    const name = row.name?.trim();
    const lat = Number(row.lat);
    const lng = Number(row.lng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return districtCenters;
    }

    districtCenters.push({ name, lat, lng });

    return districtCenters;
  }, []);
}

function isPointInRing([x, y]: [number, number], ring: number[][]) {
  let isInside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index) {
    const [currentX, currentY] = ring[index];
    const [previousX, previousY] = ring[previousIndex];
    const crossesY = currentY > y !== previousY > y;
    const intersects =
      crossesY && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function isPointInPolygon(point: [number, number], polygon: number[][][]) {
  return isPointInRing(point, polygon[0]) && !polygon.slice(1).some((ring) => isPointInRing(point, ring));
}

function isPointInGeometry(point: [number, number], geometry: Geometry) {
  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => isPointInPolygon(point, polygon));
  }

  return false;
}

async function filterDistrictsByProvince(geoJson: FeatureCollection, provinceId: string) {
  const provinceFeature = await getProvinceFeature(provinceId);

  if (!provinceFeature) {
    return {
      ...geoJson,
      features: [],
    };
  }

  const provinceBounds = getGeometryBounds(provinceFeature.geometry);
  const containedDistricts = geoJson.features.filter((districtFeature) => {
    const center = getGeometryCenter(districtFeature.geometry);

    return center ? isPointInGeometry(center, provinceFeature.geometry) : false;
  });
  const provinceDistricts = containedDistricts.length
    ? containedDistricts
    : geoJson.features.filter((districtFeature) =>
        doBoundsOverlap(provinceBounds, getGeometryBounds(districtFeature.geometry))
      );

  return {
    ...geoJson,
    features: provinceDistricts as GeoJsonFeature[],
  };
}

function getProvinceIds(body: DistrictSyncBody, request: NextRequest) {
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

async function readSyncBody(request: NextRequest): Promise<DistrictSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as DistrictSyncBody;
  } catch {
    return {};
  }
}

function mapKongvutDistrictToRow(
  district: KongvutDistrict,
  provinceCodeById: Map<number, string>,
  updatedAt: string
): DistrictBoundaryRow | null {
  const provinceCode = provinceCodeById.get(district.province_id);

  if (!provinceCode) {
    return null;
  }

  return {
    id: `${provinceCode}:${district.id}`,
    province_code: provinceCode,
    name: district.name_th,
    lat: 0,
    lng: 0,
    geometry: {
      type: 'GeometryCollection',
      geometries: [],
    },
    properties: {
      kongvut: district,
    },
    source: KONGVUT_DISTRICTS_API_URL,
    updated_at: updatedAt,
  };
}

function getKongvutDistrictRows(
  provinceMetadata: KongvutProvince[],
  districtMetadata: KongvutDistrict[],
  provinceIds: string[]
) {
  const requestedProvinceIds = new Set(provinceIds);
  const updatedAt = new Date().toISOString();
  const provinceCodeById = new Map(
    provinceMetadata
      .map((province) => [province.id, getProvinceCodeByThaiName(province.name_th)] as const)
      .filter(([, provinceCode]) => Boolean(provinceCode))
  );

  return districtMetadata
    .map((district) => mapKongvutDistrictToRow(district, provinceCodeById, updatedAt))
    .filter((row): row is DistrictBoundaryRow => Boolean(row))
    .filter((row) => !requestedProvinceIds.size || requestedProvinceIds.has(row.province_code));
}

async function upsertDistrictRows(tableName: string, rows: DistrictBoundaryRow[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  const { client } = supabase;

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await client.from(tableName).upsert(chunk, {
      onConflict: 'id',
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

async function getDistrictCentersByProvince(geoJson: FeatureCollection, provinceId: string | null) {
  const provinceCacheKey = provinceId?.trim();

  if (!provinceCacheKey) {
    return toDistrictCenters(geoJson.features as GeoJsonFeature[]);
  }

  const cachedDistrictCenters = districtCentersByProvincePromise.get(provinceCacheKey);

  if (cachedDistrictCenters) {
    return cachedDistrictCenters;
  }

  const districtCentersPromise = filterDistrictsByProvince(geoJson, provinceCacheKey)
    .then((responseGeoJson) => toDistrictCenters(responseGeoJson.features as GeoJsonFeature[]))
    .catch((error) => {
      districtCentersByProvincePromise.delete(provinceCacheKey);
      throw error;
    });

  districtCentersByProvincePromise.set(provinceCacheKey, districtCentersPromise);

  return districtCentersPromise;
}

async function getDistrictCentersFromDatabase(provinceId: string | null) {
  const tableName = process.env.THAILAND_DISTRICTS_TABLE ?? DEFAULT_DISTRICTS_TABLE_NAME;
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  let query = supabase.client.from(tableName).select('name, lat, lng').order('name');

  if (provinceId) {
    query = query.eq('province_code', provinceId);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    return null;
  }

  const districtCenters = toValidDistrictCenters(data as DistrictCenterRow[]);

  return districtCenters.length ? districtCenters : null;
}

async function handleDistrictSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);
  const tableName = process.env.THAILAND_DISTRICTS_TABLE ?? DEFAULT_DISTRICTS_TABLE_NAME;
  const provinceIds = getProvinceIds(body, request);
  const { provinceMetadata, districtMetadata } = await fetchKongvutDistrictSource();
  const rows = getKongvutDistrictRows(provinceMetadata, districtMetadata, provinceIds);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      table: tableName,
      total: rows.length,
      provinceIds,
      sources: {
        provinceMetadata: KONGVUT_PROVINCES_API_URL,
        districtMetadata: KONGVUT_DISTRICTS_API_URL,
      },
      sample: rows.slice(0, 3),
    });
  }

  const syncResult = await upsertDistrictRows(tableName, rows);

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
      provinceMetadata: KONGVUT_PROVINCES_API_URL,
      districtMetadata: KONGVUT_DISTRICTS_API_URL,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('sync') === 'true') {
      return handleDistrictSync(request, { defaultDryRun: false });
    }

    const provinceId = request.nextUrl.searchParams.get('provinceId');
    const databaseDistrictCenters = await getDistrictCentersFromDatabase(provinceId);

    if (databaseDistrictCenters) {
      return NextResponse.json(
        {
          provinceId,
          source: 'database',
          districts: databaseDistrictCenters,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        }
      );
    }

    const districtsGeoJson = await getDistrictsGeoJson();
    const districtCenters = await getDistrictCentersByProvince(districtsGeoJson, provinceId);

    return NextResponse.json(
      {
        provinceId,
        source: 'geojson',
        districts: districtCenters,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load district GeoJSON' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDistrictSync(request);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to sync district GeoJSON' },
      { status: 502 }
    );
  }
}

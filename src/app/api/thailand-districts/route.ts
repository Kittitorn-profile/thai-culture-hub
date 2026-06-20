import type { Feature, Geometry, GeoJsonProperties, FeatureCollection } from 'geojson';

import path from 'node:path';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';

// ----------------------------------------------------------------------

const THAILAND_DISTRICTS_GEOJSON_API_URL =
  'https://www.geoboundaries.org/api/current/gbOpen/THA/ADM2/';
const THAILAND_PROVINCES_GEOJSON_FILE = path.join(
  process.cwd(),
  'public/assets/maps/thailand-provinces.geojson'
);

type GeoBoundariesApiResponse = {
  simplifiedGeometryGeoJSON?: string;
  gjDownloadURL?: string;
};

type GeoJsonFeature = Feature<Geometry, GeoJsonProperties>;
type DistrictCenter = {
  name: string;
  lat: number;
  lng: number;
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get('provinceId');
    const districtsGeoJson = await getDistrictsGeoJson();
    const districtCenters = await getDistrictCentersByProvince(districtsGeoJson, provinceId);

    return NextResponse.json(
      {
        provinceId,
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

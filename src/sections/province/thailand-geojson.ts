'use client';

import type { FeatureCollection } from 'geojson';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useQuery } from '@tanstack/react-query';

// ----------------------------------------------------------------------

export const THAILAND_PROVINCES_GEOJSON_API = '/api/thailand-provinces';
export const THAILAND_DISTRICTS_CENTERS_API = '/api/thailand-districts';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type ThailandDistrictCenter = {
  name: string;
  lat: number;
  lng: number;
};

export type ThailandDistrictCentersResponse = {
  provinceId?: string | null;
  districts: ThailandDistrictCenter[];
};

async function fetchGeoJsonApi(url: string, signal: AbortSignal): Promise<FeatureCollection> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      typeof errorData?.message === 'string'
        ? errorData.message
        : `Failed to load GeoJSON API: ${response.status}`;

    throw new Error(message);
  }

  return response.json();
}

async function fetchDistrictCentersApi(
  url: string,
  signal: AbortSignal
): Promise<ThailandDistrictCentersResponse> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      typeof errorData?.message === 'string'
        ? errorData.message
        : `Failed to load district centers API: ${response.status}`;

    throw new Error(message);
  }

  return response.json();
}

export function rewindGeometry(geometry: any) {
  const reverseRing = (ring: number[][]) => [...ring].reverse();

  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(reverseRing),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon: number[][][]) => polygon.map(reverseRing)),
    };
  }

  return geometry;
}

export function rewindGeoJson(geoJson: FeatureCollection): FeatureCollection {
  return {
    ...geoJson,
    features: geoJson.features.map((feature) => ({
      ...feature,
      geometry: rewindGeometry(feature.geometry),
    })),
  };
}

type ProvincesGeoJsonQueryOptions<TData> = Omit<
  UseQueryOptions<FeatureCollection, Error, TData>,
  'queryKey' | 'queryFn'
>;

export function useThailandProvincesGeoJson<TData = FeatureCollection>(
  options?: ProvincesGeoJsonQueryOptions<TData>
) {
  return useQuery<FeatureCollection, Error, TData>({
    staleTime: Infinity,
    gcTime: ONE_DAY_MS,
    ...options,
    queryKey: ['thailand', 'provinces-geojson'],
    queryFn: ({ signal }) => fetchGeoJsonApi(THAILAND_PROVINCES_GEOJSON_API, signal),
  });
}

export function useThailandDistrictCenters(provinceId?: string) {
  return useQuery<ThailandDistrictCentersResponse, Error>({
    enabled: Boolean(provinceId),
    queryKey: ['thailand', 'district-centers', provinceId],
    queryFn: ({ signal }) =>
      fetchDistrictCentersApi(
        `${THAILAND_DISTRICTS_CENTERS_API}?provinceId=${encodeURIComponent(provinceId ?? '')}`,
        signal
      ),
    retry: false,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
}

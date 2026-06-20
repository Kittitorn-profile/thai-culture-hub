import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

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

function getLimit(value: string | null) {
  if (value == null) {
    return null;
  }

  const limit = Number(value ?? 50);

  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 50;
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
  const data = mergeCulturalPlaces(...sourceResults.map((result) => result.data));

  return NextResponse.json({
    data,
    sources,
    source: 'culture-province-places',
  });
}

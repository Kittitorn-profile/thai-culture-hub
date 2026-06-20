import type { CulturalPlace, CulturalCategory } from 'src/sections/province/province-data';

import provinces from 'src/data/thailand-culture/provinces';

// ----------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const FINE_ARTS_API_BASE_URL = 'https://api.finearts.go.th/data/api';

export const FINE_ARTS_SOURCES = {
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

export type FineArtsSource = keyof typeof FINE_ARTS_SOURCES;

type FineArtsRecord = Record<string, unknown>;

export type FineArtsFetchResult = {
  status: number;
  data: CulturalPlace[];
  source: string;
  message?: string;
  upstreamStatus?: number;
};

export function getFineArtsApiKey() {
  return (process.env.FINE_ARTS_API_KEY ?? process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY)?.trim();
}

export function getFineArtsLimit(value?: string | number | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
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
  const data = response.data;
  const candidates = [
    response.data,
    response.result,
    response.records,
    response.items,
    response.rows,
    data && typeof data === 'object' ? (data as Record<string, unknown>).items : null,
    data && typeof data === 'object' ? (data as Record<string, unknown>).records : null,
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
  sourceKey: FineArtsSource
): CulturalPlace | null {
  const config = FINE_ARTS_SOURCES[sourceKey];
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

export async function fetchFineArtsPlaces({
  source,
  limit,
  apiKey,
  provinceCode,
  revalidate,
}: {
  source: FineArtsSource;
  limit?: number | null;
  apiKey: string;
  provinceCode: string;
  revalidate?: number;
}): Promise<FineArtsFetchResult> {
  const province = provinces.find((item) => item.code === provinceCode);
  const config = FINE_ARTS_SOURCES[source];

  if (!province) {
    return {
      status: 400,
      data: [],
      source: 'api.finearts.go.th',
      message: 'Invalid provinceCode',
    };
  }

  const url = new URL(config.endpoint);

  url.searchParams.set('province', province.name);
  url.searchParams.set('provinceName', province.name);

  if (limit != null) {
    url.searchParams.set('limit', `${getFineArtsLimit(limit)}`);
  }

  const response = await fetch(url, {
    cache: revalidate == null ? 'no-store' : undefined,
    next: revalidate == null ? undefined : { revalidate },
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
      status: response.status,
      data: [],
      source: 'api.finearts.go.th',
      upstreamStatus: response.status,
      message:
        typeof json === 'object' && json
          ? ((json as Record<string, string>).errorMessage ??
            (json as Record<string, string>).message ??
            `Fine Arts API failed: ${response.status}`)
          : `Fine Arts API failed: ${response.status}`,
    };
  }

  const targetProvinceName = normalizeText(province.name);
  const data = getRecords(json)
    .filter((record) => {
      const recordProvince = getString(record, ['provinceName', 'province', 'province_name']);

      return !recordProvince || normalizeText(recordProvince) === targetProvinceName;
    })
    .map((record) => mapFineArtsRecordToPlace(record, provinceCode, source))
    .filter((item: CulturalPlace | null): item is CulturalPlace => Boolean(item));
  const limitedData = limit == null ? data : data.slice(0, getFineArtsLimit(limit));

  return {
    status: 200,
    data: limitedData,
    source: 'api.finearts.go.th',
  };
}

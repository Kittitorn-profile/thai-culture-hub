import type { NextRequest } from 'next/server';
import type { CulturalPlace, CulturalCategory } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';

// ----------------------------------------------------------------------

const TAT_API_BASE_URL = 'https://tatdataapi.io/api/v2';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 500;

type TatProvince = {
  id?: number;
  provinceId?: number;
  name?: string | null;
};

type TatPlace = {
  placeId?: number;
  name?: string | null;
  introduction?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  category?: {
    name?: string | null;
  } | null;
  location?: {
    district?: {
      name?: string | null;
    } | null;
    province?: {
      name?: string | null;
    } | null;
  } | null;
  thumbnailUrl?: string[] | string | null;
  fullPathUrl?: string | null;
  googleMapUrl?: string | null;
  tags?: string[];
};

type TatFetchResult = Awaited<ReturnType<typeof tatFetch>>;

function getTatApiKey() {
  return process.env.TAT_DATA_API_KEY ?? process.env.NEXT_PRIVATE_TAT_DATA_API_KEY;
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

function getCategory(categoryName?: string | null): CulturalCategory {
  const name = categoryName ?? '';

  if (/วัด|ศาสนา|พระ|ธรรมะ/.test(name)) {
    return 'temple';
  }

  if (/พิพิธภัณฑ์/.test(name)) {
    return 'museum';
  }

  if (/ศูนย์|เรียนรู้|แหล่งเรียนรู้/.test(name)) {
    return 'learning_center';
  }

  if (/ชุมชนคุณธรรม/.test(name)) {
    return 'moral_community';
  }

  if (/อาหาร|ของกิน|ครัว|ร้าน/.test(name)) {
    return 'local_food';
  }

  if (/หัตถกรรม|เครื่องปั้น|ช่าง|จักสาน|แกะสลัก/.test(name)) {
    return 'craftsmanship';
  }

  if (/ชุมชน|ตลาด|วิถีชีวิต/.test(name)) {
    return 'community_wisdom';
  }

  if (/ประวัติ|โบราณ|มรดก|พระราชวัง/.test(name)) {
    return 'cultural_attraction';
  }

  if (/อุทยาน|น้ำตก|ภูเขา|ชายหาด|เกาะ|ธรรมชาติ|สวน/.test(name)) {
    return 'tourist_attraction';
  }

  return 'tourist_attraction';
}

function toCoordinate(value?: number | string | null) {
  const coordinate = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

function getPlaceImages(place: TatPlace) {
  if (Array.isArray(place.thumbnailUrl)) {
    return place.thumbnailUrl.filter(Boolean);
  }

  return place.thumbnailUrl ? [place.thumbnailUrl] : [];
}

async function tatFetch(pathname: string, params?: Record<string, string | number>) {
  const apiKey = getTatApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: 501,
      json: {
        message: 'Missing TAT_DATA_API_KEY',
      },
    };
  }

  const url = new URL(`${TAT_API_BASE_URL}${pathname}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, `${value}`);
  });

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'Accept-Language': 'th',
    },
    next: { revalidate: 3600 },
  });

  return {
    ok: response.ok,
    status: response.status,
    json: await response.json(),
  };
}

function mapTatPlaceToCulturalPlace(place: TatPlace, provinceCode: string): CulturalPlace | null {
  const lat = toCoordinate(place.latitude);
  const lng = toCoordinate(place.longitude);

  if (!place.placeId || !place.name || lat == null || lng == null) {
    return null;
  }

  const categoryName = place.category?.name;
  const category = getCategory(categoryName);
  const district = place.location?.district?.name ?? place.location?.province?.name ?? '';
  const introduction = place.introduction?.replace(/\s+/g, ' ').trim();

  return {
    id: `tat-${place.placeId}-${slugifyThai(place.name)}`,
    name: place.name,
    district,
    category,
    lat,
    lng,
    description: introduction || 'ข้อมูลสถานที่ท่องเที่ยวจากฐานข้อมูล ททท.',
    highlight: categoryName ?? place.tags?.[0] ?? 'ข้อมูลจาก ททท.',
    imageUrls: getPlaceImages(place),
    sourceUrl: place.fullPathUrl ?? undefined,
    mapUrl: place.googleMapUrl ?? undefined,
    source: 'tat',
  };
}

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const pageSizeParam = request.nextUrl.searchParams.get('pageSize');
  const maxPagesParam = request.nextUrl.searchParams.get('maxPages');
  const limit = limitParam == null ? null : Number(limitParam);
  const pageSize = Math.min(
    Math.max(Number(pageSizeParam ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const maxPages = Math.min(
    Math.max(Number(maxPagesParam ?? DEFAULT_MAX_PAGES) || DEFAULT_MAX_PAGES, 1),
    DEFAULT_MAX_PAGES
  );
  const province = provinces.find((item) => item.code === provinceCode);

  if (!provinceCode || !province) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  const provinceResponse = await tatFetch('/location/provinces');

  if (!provinceResponse.ok) {
    return NextResponse.json(
      { data: [], message: provinceResponse.json.message ?? 'Failed to load TAT provinces' },
      { status: provinceResponse.status }
    );
  }

  const tatProvinces = Array.isArray(provinceResponse.json?.data)
    ? provinceResponse.json.data
    : provinceResponse.json;
  const targetProvinceName = normalizeText(province.name);
  const tatProvince = (Array.isArray(tatProvinces) ? tatProvinces : []).find(
    (item: TatProvince) => normalizeText(item.name) === targetProvinceName
  ) as TatProvince | undefined;
  const tatProvinceId = tatProvince?.provinceId ?? tatProvince?.id;

  if (!tatProvinceId) {
    return NextResponse.json(
      { data: [], message: `TAT province id not found for ${provinceCode}` },
      { status: 404 }
    );
  }

  const requestedLimit = limit != null && Number.isFinite(limit) ? Math.max(limit, 1) : null;
  const tatPlaces: TatPlace[] = [];
  const pages: Array<{ page: number; status: number; total: number }> = [];
  let placesResponse: TatFetchResult | null = null;

  for (let page = 1; page <= maxPages; page += 1) {
    placesResponse = await tatFetch('/places', {
      page,
      limit: requestedLimit == null ? pageSize : Math.min(requestedLimit - tatPlaces.length, pageSize),
      status: 'approved',
      province_id: tatProvinceId,
      has_name: 'true',
      has_introduction: 'true',
    });

    if (!placesResponse.ok) {
      pages.push({ page, status: placesResponse.status, total: 0 });
      break;
    }

    const pagePlaces = Array.isArray(placesResponse.json?.data) ? placesResponse.json.data : [];

    tatPlaces.push(...pagePlaces);
    pages.push({ page, status: placesResponse.status, total: pagePlaces.length });

    if (
      pagePlaces.length < pageSize ||
      (requestedLimit != null && tatPlaces.length >= requestedLimit)
    ) {
      break;
    }
  }

  if (!placesResponse?.ok) {
    return NextResponse.json(
      { data: [], message: placesResponse?.json.message ?? 'Failed to load TAT places' },
      { status: placesResponse?.status ?? 500 }
    );
  }

  const data = tatPlaces
    .map((item: TatPlace) => mapTatPlaceToCulturalPlace(item, provinceCode))
    .filter((item: CulturalPlace | null): item is CulturalPlace => Boolean(item));

  return NextResponse.json({
    data,
    source: 'tatdataapi',
    total: data.length,
    fetched: tatPlaces.length,
    pages,
  });
}

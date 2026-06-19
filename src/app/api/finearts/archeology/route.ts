import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';

// ----------------------------------------------------------------------

const FINE_ARTS_ARCHEOLOGY_API_URL = 'https://api.finearts.go.th/data/api/archeology/search';

type FineArtsRecord = {
  id?: number | string;
  _id?: number | string;
  name?: string | null;
  title?: string | null;
  siteName?: string | null;
  archeologyName?: string | null;
  province?: string | null;
  provinceName?: string | null;
  amphoe?: string | null;
  district?: string | null;
  amphoeName?: string | null;
  latitude?: number | string | null;
  lat?: number | string | null;
  longitude?: number | string | null;
  lng?: number | string | null;
  lon?: number | string | null;
  detail?: string | null;
  description?: string | null;
  address?: string | null;
  registerStatus?: string | null;
  status?: string | null;
};

function getFineArtsApiKey() {
  return process.env.FINE_ARTS_API_KEY ?? process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY;
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

function toCoordinate(value?: number | string | null) {
  const coordinate = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

function getRecords(json: any): FineArtsRecord[] {
  if (Array.isArray(json?.data)) {
    return json.data;
  }

  if (Array.isArray(json?.result)) {
    return json.result;
  }

  if (Array.isArray(json?.records)) {
    return json.records;
  }

  if (Array.isArray(json?.items)) {
    return json.items;
  }

  return [];
}

function mapFineArtsRecordToPlace(
  record: FineArtsRecord,
  provinceCode: string
): CulturalPlace | null {
  const name = record.name ?? record.title ?? record.siteName ?? record.archeologyName;
  const lat = toCoordinate(record.latitude ?? record.lat);
  const lng = toCoordinate(record.longitude ?? record.lng ?? record.lon);

  if (!name || lat == null || lng == null) {
    return null;
  }

  const id = record.id ?? record._id ?? slugifyThai(name);
  const district = record.amphoeName ?? record.amphoe ?? record.district ?? record.provinceName ?? '';
  const description = [
    record.detail,
    record.description,
    record.address,
    record.registerStatus ?? record.status,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `finearts-${id}-${slugifyThai(name)}`,
    name,
    district,
    category: 'cultural_attraction',
    lat,
    lng,
    description: description || 'ข้อมูลโบราณสถานจากระบบภูมิสารสนเทศมรดกศิลปวัฒนธรรม GIS กรมศิลปากร',
    highlight: record.registerStatus ?? record.status ?? 'โบราณสถานกรมศิลปากร',
    sourceUrl: 'https://api.finearts.go.th/data/api/archeology/search',
    source: 'finearts_archeology',
  };
}

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  const province = provinces.find((item) => item.code === provinceCode);
  const apiKey = getFineArtsApiKey();

  if (!provinceCode || !province) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ data: [], message: 'Missing FINE_ARTS_API_KEY' }, { status: 501 });
  }

  const url = new URL(FINE_ARTS_ARCHEOLOGY_API_URL);

  url.searchParams.set('province', province.name);
  url.searchParams.set('provinceName', province.name);
  url.searchParams.set('limit', `${Math.min(Math.max(limit, 1), 50)}`);

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'api-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { data: [], message: 'Failed to load Fine Arts archeology data' },
      { status: response.status }
    );
  }

  const json = await response.json();
  const targetProvinceName = normalizeText(province.name);
  const data = getRecords(json)
    .filter((record) => {
      const recordProvince = record.provinceName ?? record.province;

      return !recordProvince || normalizeText(recordProvince) === targetProvinceName;
    })
    .map((record) => mapFineArtsRecordToPlace(record, provinceCode))
    .filter((item: CulturalPlace | null): item is CulturalPlace => Boolean(item))
    .slice(0, Math.min(Math.max(limit, 1), 50));

  return NextResponse.json({
    data,
    source: 'api.finearts.go.th',
  });
}

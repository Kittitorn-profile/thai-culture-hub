import type { NextRequest } from 'next/server';
import type { CulturalPlace, CulturalCategory } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';

// ----------------------------------------------------------------------

const CULTURE_CATALOG_RESOURCE_ID = '6400e87c-e5b2-4335-a4b2-6c6e21539f48';
const CULTURE_CATALOG_API_URL = 'https://culture.gdcatalog.go.th/api/3/action/datastore_search';

type CultureCatalogRecord = {
  _id?: number;
  id?: number;
  Name?: string | null;
  Literature?: number | string | null;
  Arts?: number | string | null;
  Festival?: number | string | null;
  Knowledge?: number | string | null;
  Craft?: number | string | null;
  'Folk games'?: number | string | null;
  PV_Year?: string | null;
  Remark_TH_PV?: string | null;
  Region?: string | null;
  Province?: string | null;
  Status?: string | null;
  Practice?: string | null;
  Latitude?: number | string | null;
  Longitude?: number | string | null;
};

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

function toNumber(value?: number | string | null) {
  const numberValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getDistrict(practice?: string | null) {
  const text = practice ?? '';
  const district = text.match(/อำเภอ([^,\s]+)/)?.[1] ?? text.match(/อ\.([^,\s]+)/)?.[1];

  return district ? district.replace(/^เมือง$/, 'เมือง') : '';
}

function getCategory(record: CultureCatalogRecord): CulturalCategory {
  const name = record.Name ?? '';

  if (/พิธี|บวงสรวง|ไหว้|ผีฟ้า|ทรงเจ้า|เซ่น|บายศรี/.test(name)) {
    return 'ritual';
  }

  if (/ผ้า|ซิ่น|ชุด|แต่งกาย|เครื่องแต่งกาย/.test(name)) {
    return 'costume';
  }

  if (/อาหาร|ขนม|แกง|ข้าว|น้ำพริก|เมี่ยง|หมี่|ปลา/.test(name)) {
    return 'local_food';
  }

  if (toNumber(record.Festival)) {
    return 'local_tradition';
  }

  if (toNumber(record.Craft)) {
    return 'craftsmanship';
  }

  if (toNumber(record.Knowledge)) {
    return 'community_wisdom';
  }

  if (toNumber(record['Folk games'])) {
    return 'folk_art';
  }

  if (toNumber(record.Literature)) {
    return 'folk_art';
  }

  if (toNumber(record.Arts)) {
    return 'performing_art';
  }

  return 'cultural_attraction';
}

function getHighlight(record: CultureCatalogRecord) {
  if (toNumber(record.Festival)) {
    return 'ประเพณีและเทศกาล';
  }

  if (toNumber(record.Craft)) {
    return 'งานช่างฝีมือดั้งเดิม';
  }

  if (toNumber(record.Knowledge)) {
    return 'ความรู้และแนวปฏิบัติ';
  }

  if (toNumber(record['Folk games'])) {
    return 'การละเล่นพื้นบ้าน';
  }

  if (toNumber(record.Literature)) {
    return 'วรรณกรรมพื้นบ้าน';
  }

  if (toNumber(record.Arts)) {
    return 'ศิลปะการแสดง';
  }

  return 'มรดกภูมิปัญญาทางวัฒนธรรม';
}

function mapCultureRecordToPlace(
  record: CultureCatalogRecord,
  provinceCode: string
): CulturalPlace | null {
  const lat = toNumber(record.Latitude);
  const lng = toNumber(record.Longitude);
  const name = record.Name?.replace(/^["“”]+|["“”]+$/g, '').trim();

  if (!record._id || !name || lat == null || lng == null) {
    return null;
  }

  const practice = record.Practice?.trim();
  const status = record.Status?.trim();
  const remark = record.Remark_TH_PV?.trim();
  const description = [practice, status, remark && remark !== '-' ? remark : undefined]
    .filter(Boolean)
    .join(' ');

  return {
    id: `culture-${record._id}-${slugifyThai(name)}`,
    name,
    district: getDistrict(practice) || record.Province || '',
    category: getCategory(record),
    lat,
    lng,
    description: description || 'ข้อมูลมรดกภูมิปัญญาทางวัฒนธรรมจากระบบบัญชีข้อมูลภาครัฐ',
    highlight: getHighlight(record),
    sourceUrl: `https://culture.gdcatalog.go.th/dataset/culture_heritage/resource/${CULTURE_CATALOG_RESOURCE_ID}`,
    source: 'culture_catalog',
  };
}

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 5);
  const isSummary = request.nextUrl.searchParams.get('summary') === 'true';
  const province = provinces.find((item) => item.code === provinceCode);

  if (!provinceCode || !province) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  const url = new URL(CULTURE_CATALOG_API_URL);

  url.searchParams.set('resource_id', CULTURE_CATALOG_RESOURCE_ID);
  url.searchParams.set('limit', '10000');
  url.searchParams.set('offset', '0');

  const response = await fetch(url, {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { data: [], message: 'Failed to load culture catalog data' },
      { status: response.status }
    );
  }

  const json = await response.json();
  const records = Array.isArray(json?.result?.records) ? json.result.records : [];
  const targetProvinceName = normalizeText(province.name);
  const responseLimit = isSummary ? 10000 : Math.min(Math.max(limit, 1), 50);
  const data = records
    .filter((record: CultureCatalogRecord) => normalizeText(record.Province) === targetProvinceName)
    .map((record: CultureCatalogRecord) => mapCultureRecordToPlace(record, provinceCode))
    .filter((item: CulturalPlace | null): item is CulturalPlace => Boolean(item))
    .slice(0, responseLimit);

  return NextResponse.json({
    data,
    source: 'culture.gdcatalog.go.th',
  });
}

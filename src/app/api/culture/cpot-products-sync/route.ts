import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const CPOT_RESOURCE_ID = '36fabb90-9ba1-4b8e-9f4a-e6116b1c21e6';
const CPOT_DATASET_URL = 'https://gdcatalog.m-culture.go.th/api/3/action/datastore_search';
const CPOT_TABLE = process.env.CULTURAL_PRODUCTS_CPOT_TABLE ?? 'cultural_products_cpot';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const THAILAND_PROVINCES_TABLE = process.env.THAILAND_PROVINCES_TABLE ?? 'thailand_provinces';
const UPSERT_CHUNK_SIZE = 500;

type CpotSyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  offset?: number;
  dryRun?: boolean;
};

type CpotRecord = Record<string, unknown>;
type CpotRow = ReturnType<typeof mapRecord>;
type ProvinceCenter = { lat: number; lng: number };

function cleanText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).replace(/^\uFEFF/, '').trim();

  return text && text !== '-' ? text : null;
}

function normalizeText(value: unknown) {
  return (value == null ? '' : String(value))
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function getLimit(value: unknown) {
  if (value == null || value === '') {
    return 10000;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? Math.max(Math.trunc(parsedValue), 1) : 10000;
}

function getOffset(value: unknown) {
  const parsedValue = Number(value ?? 0);

  return Number.isFinite(parsedValue) ? Math.max(Math.trunc(parsedValue), 0) : 0;
}

function getProvinceCodes(body: CpotSyncBody, request: NextRequest) {
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
  const validCodes = new Set(provinces.map((province) => province.code));

  return Array.from(new Set(requestedCodes)).filter((provinceCode) => validCodes.has(provinceCode));
}

function getField(record: CpotRecord, keys: string[]) {
  const entries = Object.entries(record);

  for (const key of keys) {
    const directValue = cleanText(record[key]);

    if (directValue) {
      return directValue;
    }

    const normalizedKey = normalizeText(key);
    const matchedEntry = entries.find(([entryKey]) => normalizeText(entryKey) === normalizedKey);
    const matchedValue = matchedEntry ? cleanText(matchedEntry[1]) : null;

    if (matchedValue) {
      return matchedValue;
    }
  }

  return null;
}

function toCoordinate(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function joinText(values: Array<string | null>) {
  const cleanedValues = values.filter((value): value is string => !!value);

  return cleanedValues.length ? cleanedValues.join(' ') : null;
}

function getProvinceCode(record: CpotRecord) {
  const provinceName = normalizeText(
    getField(record, ['province', 'province_name', 'province_name_th', 'จังหวัด'])
  );

  return provinces.find((province) => normalizeText(province.name) === provinceName)?.code ?? null;
}

function getStableId(record: CpotRecord) {
  const cpotId = getField(record, ['id', '_id', 'cpot_id', 'product_id', 'รหัส', 'รหัสผลิตภัณฑ์']);

  if (cpotId) {
    return `cpot-${cpotId}`;
  }

  const signature = [
    getField(record, ['product_name', 'name', 'title', 'ชื่อผลิตภัณฑ์', 'ผลิตภัณฑ์']),
    getField(record, ['producer', 'creator', 'ผู้ผลิต']),
    getField(record, ['province', 'จังหวัด']),
    getField(record, ['district', 'อำเภอ']),
  ]
    .map((value) => normalizeText(value))
    .join('|');
  const hash = crypto.createHash('sha1').update(signature || JSON.stringify(record)).digest('hex').slice(0, 16);

  return `cpot-${hash}`;
}

async function readSyncBody(request: NextRequest): Promise<CpotSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as CpotSyncBody;
  } catch {
    return {};
  }
}

async function fetchCpotRecords(limit: number, offset: number) {
  const url = new URL(CPOT_DATASET_URL);

  url.searchParams.set('resource_id', CPOT_RESOURCE_ID);
  url.searchParams.set('limit', `${limit}`);
  url.searchParams.set('offset', `${offset}`);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CPOT dataset: HTTP ${response.status}`);
  }

  const json = await response.json();

  return {
    total: typeof json?.result?.total === 'number' ? json.result.total : 0,
    records: Array.isArray(json?.result?.records) ? (json.result.records as CpotRecord[]) : [],
  };
}

function mapRecord(record: CpotRecord, now: string) {
  const provinceCode = getProvinceCode(record);
  const lat = toCoordinate(
    getField(record, ['latitude', 'lat', 'ละติจูด', 'Latitude', 'LATITUDE'])
  );
  const lng = toCoordinate(
    getField(record, ['longitude', 'lng', 'long', 'ลองจิจูด', 'Longitude', 'LONGITUDE'])
  );

  return {
    id: getStableId(record),
    cpot_id: getField(record, ['id', '_id', 'cpot_id', 'product_id', 'รหัส', 'รหัสผลิตภัณฑ์']),
    product_name: getField(record, ['product_name', 'name', 'title', 'ชื่อผลิตภัณฑ์', 'ผลิตภัณฑ์']),
    category: getField(record, ['category', 'main_category', 'ประเภท', 'หมวดหมู่']),
    product_type: getField(record, ['product_type', 'type', 'sub_category', 'ชนิด', 'ประเภทผลิตภัณฑ์']),
    description: getField(record, ['description', 'detail', 'รายละเอียด', 'รายละเอียดผลิตภัณฑ์']),
    producer: getField(record, ['producer', 'creator', 'owner', 'ผู้ผลิต', 'ผู้ประกอบการ']),
    community: getField(record, ['community', 'ชุมชน']),
    address: getField(record, ['address', 'ที่อยู่']),
    sub_district: getField(record, ['sub_district', 'subdistrict', 'ตำบล']),
    district: getField(record, ['district', 'อำเภอ']),
    province: getField(record, ['province', 'province_name', 'province_name_th', 'จังหวัด']),
    province_code: provinceCode,
    postcode: getField(record, ['postcode', 'zip_code', 'รหัสไปรษณีย์']),
    latitude: lat,
    longitude: lng,
    price: getField(record, ['price', 'ราคา']),
    contact_name: getField(record, ['contact_name', 'contact', 'ผู้ติดต่อ']),
    contact_phone: getField(record, ['contact_phone', 'phone', 'tel', 'เบอร์โทร', 'โทรศัพท์']),
    contact_email: getField(record, ['contact_email', 'email', 'อีเมล']),
    website: getField(record, ['website', 'url', 'เว็บไซต์']),
    facebook: getField(record, ['facebook', 'Facebook']),
    line: getField(record, ['line', 'LINE', 'ไลน์']),
    image_url: getField(record, ['image_url', 'picture', 'photo', 'รูปภาพ', 'ภาพ']),
    source_uri: `https://gdcatalog.m-culture.go.th/dataset/cpot/resource/${CPOT_RESOURCE_ID}`,
    source_payload: record,
    updated_at: now,
  };
}

async function getProvinceCenters(provinceCodes: string[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return new Map<string, ProvinceCenter>();
  }

  let query = supabase.client.from(THAILAND_PROVINCES_TABLE).select('id, lat, lng');

  if (provinceCodes.length) {
    query = query.in('id', provinceCodes);
  }

  const { data } = await query;
  const centers = new Map<string, ProvinceCenter>();

  (data ?? []).forEach((row) => {
    const provinceId = typeof row.id === 'string' ? row.id : '';
    const lat = toCoordinate(row.lat);
    const lng = toCoordinate(row.lng);

    if (provinceId && lat != null && lng != null) {
      centers.set(provinceId, { lat, lng });
    }
  });

  return centers;
}

function mapCpotRowToCulturalPlaceRow(
  row: CpotRow,
  provinceCenters: Map<string, ProvinceCenter>,
  now: string
) {
  if (!row.province_code || !row.product_name) {
    return null;
  }

  const provinceCenter = provinceCenters.get(row.province_code);
  const lat = row.latitude ?? provinceCenter?.lat ?? null;
  const lng = row.longitude ?? provinceCenter?.lng ?? null;

  if (lat == null || lng == null) {
    return null;
  }

  const usedProvinceCenter = row.latitude == null || row.longitude == null;
  const description =
    joinText([row.description, row.producer && `ผู้ผลิต: ${row.producer}`, row.community && `ชุมชน: ${row.community}`]) ??
    'ข้อมูลผลิตภัณฑ์วัฒนธรรมไทย (CPOT) จากกระทรวงวัฒนธรรม';
  const imageUrls = row.image_url ? [row.image_url] : [];

  return {
    id: row.id,
    province_code: row.province_code,
    name: row.product_name,
    district: row.district ?? '',
    category: 'craftsmanship',
    lat,
    lng,
    description,
    highlight: row.product_type ?? row.category ?? 'ผลิตภัณฑ์วัฒนธรรมไทย',
    image_urls: imageUrls,
    source_url: row.website ?? row.source_uri,
    map_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    source: 'cpot_products',
    payload: {
      ...row,
      content_category: 'craftsmanship',
      coordinate_source: usedProvinceCenter ? 'province_center' : 'record',
    },
    updated_at: now,
  };
}

async function upsertRows(tableName: string, rows: Record<string, unknown>[], onConflict: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.client.from(tableName).upsert(chunk, { onConflict });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

async function handleSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);

  if (!dryRun) {
    const auth = await verifyAdminAccessToken(
      getBearerToken(request),
      ADMIN_PERMISSION.culturalPlaces
    );

    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }
  }

  const provinceCodes = getProvinceCodes(body, request);
  const provinceFilter = new Set(provinceCodes);
  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const offset = getOffset(body.offset ?? request.nextUrl.searchParams.get('offset'));
  const now = new Date().toISOString();
  const { records, total } = await fetchCpotRecords(limit, offset);
  const filteredRecords = records.filter((record) => {
    const provinceCode = getProvinceCode(record);

    return !provinceFilter.size || (provinceCode ? provinceFilter.has(provinceCode) : false);
  });
  const rows = Array.from(
    new Map(filteredRecords.map((record) => {
      const row = mapRecord(record, now);

      return [row.id, row];
    })).values()
  );
  const provinceCenters = await getProvinceCenters(provinceCodes);
  const culturalPlaceRows = rows
    .map((row) => mapCpotRowToCulturalPlaceRow(row, provinceCenters, now))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      sourceUrl: CPOT_DATASET_URL,
      totalSourceRecords: total,
      filteredRecords: filteredRecords.length,
      mappedRecords: rows.length,
      provinceCodes,
      limit,
      offset,
      tables: {
        [CPOT_TABLE]: rows.length,
        [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
      },
    });
  }

  const result = await upsertRows(CPOT_TABLE, rows, 'id');

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  const culturalPlacesResult = await upsertRows(CULTURAL_PLACES_TABLE, culturalPlaceRows, 'id');

  if (!culturalPlacesResult.ok) {
    return NextResponse.json({ message: culturalPlacesResult.error }, { status: 500 });
  }

  return NextResponse.json({
    dryRun: false,
    sourceUrl: CPOT_DATASET_URL,
    totalSourceRecords: total,
    filteredRecords: filteredRecords.length,
    mappedRecords: rows.length,
    provinceCodes,
    limit,
    offset,
    upserted: {
      [CPOT_TABLE]: rows.length,
      [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
    },
    message: `Synced ${rows.length} CPOT products and ${culturalPlaceRows.length} cultural places`,
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

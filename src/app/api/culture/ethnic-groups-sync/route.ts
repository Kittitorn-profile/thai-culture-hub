import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const ETHNIC_GROUPS_RESOURCE_ID = '286cca68-b84d-4151-b95f-d31ba7a9f640';
const ETHNIC_GROUPS_DATASET_URL =
  'https://data.thailand.opendevelopmentmekong.net/th/api/3/action/datastore_search';
const ETHNIC_GROUPS_TABLE = process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const THAILAND_PROVINCES_TABLE = process.env.THAILAND_PROVINCES_TABLE ?? 'thailand_provinces';
const UPSERT_CHUNK_SIZE = 500;
const DATASTORE_PAGE_SIZE = 1000;

type EthnicGroupsSyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  offset?: number;
  dryRun?: boolean;
};

type EthnicGroupSourceRecord = Record<string, unknown> & {
  _id?: number | string | null;
  ภูมิภาค?: string | null;
  ชนเผ่าพื้นเมือง?: string | null;
  ตำบล?: string | null;
  อำเภอ?: string | null;
  จังหวัด?: string | null;
  Lat?: number | string | null;
  Long?: number | string | null;
  หมู่บ้าน?: string | null;
  คำอธิบาย?: string | null;
  หมู่ที่?: string | number | null;
  รายงานภาษาไทย?: string | null;
  แผ่นพับประชาสัมพันธ์ภ?: string | null;
  the_geom?: unknown;
};

type EthnicGroupRow = {
  ethnic_id: number;
  spatial: string | null;
  title: string;
  ip_group: string | null;
  sub_district_th: string | null;
  sub_district_en: string | null;
  district_th: string | null;
  district_en: string | null;
  province: string | null;
  province_en: string | null;
  lat: number | null;
  lng: number | null;
  village_name_th: string | null;
  village_name_en: string | null;
  village_no: string | null;
  description_th: string | null;
  description_en: string | null;
};

type ProvinceCenter = {
  lat: number;
  lng: number;
};

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

function getProvinceCodes(body: EthnicGroupsSyncBody, request: NextRequest) {
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

function toCoordinate(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getProvinceCode(record: EthnicGroupSourceRecord) {
  const provinceName = normalizeText(record.จังหวัด);

  return provinces.find((province) => normalizeText(province.name) === provinceName)?.code ?? null;
}

function joinText(values: Array<string | null>) {
  const cleanedValues = values.filter((value): value is string => !!value);

  return cleanedValues.length ? cleanedValues.join(' ') : null;
}

async function readSyncBody(request: NextRequest): Promise<EthnicGroupsSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as EthnicGroupsSyncBody;
  } catch {
    return {};
  }
}

async function fetchEthnicGroupRecords(limit: number, offset: number) {
  const records: EthnicGroupSourceRecord[] = [];
  let total = 0;

  while (records.length < limit) {
    const pageLimit = Math.min(DATASTORE_PAGE_SIZE, limit - records.length);
    const url = new URL(ETHNIC_GROUPS_DATASET_URL);

    url.searchParams.set('resource_id', ETHNIC_GROUPS_RESOURCE_ID);
    url.searchParams.set('limit', `${pageLimit}`);
    url.searchParams.set('offset', `${offset + records.length}`);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ethnic groups dataset: HTTP ${response.status}`);
    }

    const json = await response.json();
    const nextRecords = Array.isArray(json?.result?.records)
      ? (json.result.records as EthnicGroupSourceRecord[])
      : [];

    total = typeof json?.result?.total === 'number' ? json.result.total : total;
    records.push(...nextRecords);

    if (!nextRecords.length || nextRecords.length < pageLimit) {
      break;
    }
  }

  return { total, records };
}

function mapRecord(record: EthnicGroupSourceRecord): EthnicGroupRow | null {
  const ethnicId = Number(record._id);
  const tribe = cleanText(record.ชนเผ่าพื้นเมือง);
  const village = cleanText(record.หมู่บ้าน);
  const province = cleanText(record.จังหวัด);
  const region = cleanText(record.ภูมิภาค);
  const subDistrict = cleanText(record.ตำบล);
  const district = cleanText(record.อำเภอ);
  const lat = toCoordinate(record.Lat);
  const lng = toCoordinate(record.Long);

  if (!Number.isFinite(ethnicId) || !tribe || !province) {
    return null;
  }

  const description =
    cleanText(record.คำอธิบาย) ??
    joinText([
      tribe,
      village && `หมู่บ้าน/กลุ่ม: ${village}`,
      subDistrict && `ตำบล${subDistrict}`,
      district && `อำเภอ${district}`,
      `จังหวัด${province}`,
    ]);

  return {
    ethnic_id: ethnicId,
    spatial: region,
    title: village ? `${tribe} - ${village}` : tribe,
    ip_group: tribe,
    sub_district_th: subDistrict,
    sub_district_en: null,
    district_th: district,
    district_en: null,
    province,
    province_en: null,
    lat,
    lng,
    village_name_th: village,
    village_name_en: null,
    village_no: cleanText(record.หมู่ที่),
    description_th: description,
    description_en: null,
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

function mapEthnicGroupToCulturalPlaceRow(
  row: EthnicGroupRow,
  provinceCenters: Map<string, ProvinceCenter>,
  now: string
) {
  const provinceCode = provinces.find(
    (province) => normalizeText(province.name) === normalizeText(row.province)
  )?.code;

  if (!provinceCode) {
    return null;
  }

  const lat = row.lat ?? provinceCenters.get(provinceCode)?.lat ?? null;
  const lng = row.lng ?? provinceCenters.get(provinceCode)?.lng ?? null;

  if (lat == null || lng == null) {
    return null;
  }

  const usedProvinceCenter = row.lat == null || row.lng == null;

  return {
    id: `ethnic-group-${row.ethnic_id}`,
    province_code: provinceCode,
    name: row.title,
    district: row.district_th ?? '',
    category: 'ethnic_group',
    lat,
    lng,
    description: row.description_th ?? 'ข้อมูลกลุ่มชาติพันธุ์จาก Open Development Thailand',
    highlight: row.ip_group ?? 'กลุ่มชาติพันธุ์',
    image_urls: [],
    source_url: `${ETHNIC_GROUPS_DATASET_URL}?resource_id=${ETHNIC_GROUPS_RESOURCE_ID}`,
    map_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    source: 'ethnic_groups',
    payload: {
      ...row,
      content_category: 'ethnic_group',
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
  const { records, total } = await fetchEthnicGroupRecords(limit, offset);
  const filteredRecords = records.filter((record) => {
    const provinceCode = getProvinceCode(record);

    return !provinceFilter.size || (provinceCode ? provinceFilter.has(provinceCode) : false);
  });
  const ethnicGroupRows = Array.from(
    new Map(
      filteredRecords
        .map((record) => mapRecord(record))
        .filter((row): row is EthnicGroupRow => Boolean(row))
        .map((row) => [row.ethnic_id, row])
    ).values()
  );
  const provinceCenters = await getProvinceCenters(provinceCodes);
  const culturalPlaceRows = ethnicGroupRows
    .map((row) => mapEthnicGroupToCulturalPlaceRow(row, provinceCenters, now))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const skippedRecords = Math.max(filteredRecords.length - culturalPlaceRows.length, 0);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      sourceUrl: ETHNIC_GROUPS_DATASET_URL,
      resourceId: ETHNIC_GROUPS_RESOURCE_ID,
      totalSourceRecords: total,
      filteredRecords: filteredRecords.length,
      mappedRecords: ethnicGroupRows.length,
      culturalPlaces: culturalPlaceRows.length,
      skippedRecords,
      provinceCodes,
      limit,
      offset,
      tables: {
        [ETHNIC_GROUPS_TABLE]: ethnicGroupRows.length,
        [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
      },
    });
  }

  const ethnicGroupsResult = await upsertRows(ETHNIC_GROUPS_TABLE, ethnicGroupRows, 'ethnic_id');

  if (!ethnicGroupsResult.ok) {
    return NextResponse.json({ message: ethnicGroupsResult.error }, { status: 500 });
  }

  const culturalPlacesResult = await upsertRows(CULTURAL_PLACES_TABLE, culturalPlaceRows, 'id');

  if (!culturalPlacesResult.ok) {
    return NextResponse.json({ message: culturalPlacesResult.error }, { status: 500 });
  }

  return NextResponse.json({
    dryRun: false,
    sourceUrl: ETHNIC_GROUPS_DATASET_URL,
    resourceId: ETHNIC_GROUPS_RESOURCE_ID,
    totalSourceRecords: total,
    filteredRecords: filteredRecords.length,
    mappedRecords: ethnicGroupRows.length,
    culturalPlaces: culturalPlaceRows.length,
    skippedRecords,
    provinceCodes,
    limit,
    offset,
    upserted: {
      [ETHNIC_GROUPS_TABLE]: ethnicGroupRows.length,
      [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
    },
    message: `Synced ${ethnicGroupRows.length} ethnic group records and ${culturalPlaceRows.length} cultural places`,
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

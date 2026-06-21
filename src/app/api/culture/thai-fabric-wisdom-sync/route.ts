import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const THAI_FABRIC_WISDOM_RESOURCE_ID = 'd12cb480-0071-4b12-a601-d323cb481593';
const THAI_FABRIC_WISDOM_DATASET_URL =
  'https://gdcatalog.m-culture.go.th/api/3/action/datastore_search';
const THAI_FABRIC_WISDOM_TABLE =
  process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const THAILAND_PROVINCES_TABLE = process.env.THAILAND_PROVINCES_TABLE ?? 'thailand_provinces';
const UPSERT_CHUNK_SIZE = 500;

type ThaiFabricWisdomSyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  offset?: number;
  dryRun?: boolean;
};

type ThaiFabricWisdomRecord = Record<string, unknown>;
type ThaiFabricWisdomRow = ReturnType<typeof mapRecord>;
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

function getProvinceCodes(body: ThaiFabricWisdomSyncBody, request: NextRequest) {
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

function getField(record: ThaiFabricWisdomRecord, keys: string[]) {
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

function joinText(values: (string | null)[]) {
  const cleanedValues = values.filter((value): value is string => !!value);

  return cleanedValues.length ? cleanedValues.join('\n\n') : null;
}

function joinInlineText(values: Array<string | null>) {
  const cleanedValues = values.filter((value): value is string => !!value);

  return cleanedValues.length ? cleanedValues.join(' ') : null;
}

function toCoordinate(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getProvinceCode(record: ThaiFabricWisdomRecord) {
  const provinceName = normalizeText(getField(record, ['Column4', 'Province', 'จังหวัด']));

  return provinces.find((province) => normalizeText(province.name) === provinceName)?.code ?? null;
}

function isHeaderRecord(record: ThaiFabricWisdomRecord) {
  return (
    normalizeText(getField(record, ['Column1'])) === 'no' ||
    normalizeText(getField(record, ['Column2'])) === 'title'
  );
}

function getStableId(record: ThaiFabricWisdomRecord) {
  const fabricId = getField(record, ['Column1', 'no', 'id', '_id']);

  if (fabricId) {
    return `thai-fabric-${fabricId}`;
  }

  const signature = [
    getField(record, ['Column2', 'Title']),
    getField(record, ['Column4', 'Province']),
    getField(record, ['Column5', 'Collection']),
  ]
    .map((value) => normalizeText(value))
    .join('|');
  const hash = crypto.createHash('sha1').update(signature || JSON.stringify(record)).digest('hex').slice(0, 16);

  return `thai-fabric-${hash}`;
}

async function readSyncBody(request: NextRequest): Promise<ThaiFabricWisdomSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as ThaiFabricWisdomSyncBody;
  } catch {
    return {};
  }
}

async function fetchThaiFabricWisdomRecords(limit: number, offset: number) {
  const url = new URL(THAI_FABRIC_WISDOM_DATASET_URL);

  url.searchParams.set('resource_id', THAI_FABRIC_WISDOM_RESOURCE_ID);
  url.searchParams.set('limit', `${limit}`);
  url.searchParams.set('offset', `${offset}`);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Thai Fabric Wisdom dataset: HTTP ${response.status}`);
  }

  const json = await response.json();

  return {
    total: typeof json?.result?.total === 'number' ? json.result.total : 0,
    records: Array.isArray(json?.result?.records)
      ? (json.result.records as ThaiFabricWisdomRecord[])
      : [],
  };
}

function mapRecord(record: ThaiFabricWisdomRecord, now: string) {
  const provinceCode = getProvinceCode(record);
  const detail = getField(record, ['Column6', 'Detail']);
  const definition = getField(record, ['Column8', 'Definition']);
  const productionTechnique = getField(record, ['Column10', 'Production_Techiques']);
  const procedure = getField(record, ['Column11', 'Procedure']);

  return {
    id: getStableId(record),
    fabric_id: getField(record, ['Column1', 'no']),
    title: getField(record, ['Column2', 'Title']),
    type: getField(record, ['Column3', 'Physical_Feature']),
    category: 'มรดกภูมิปัญญาผ้าไทย',
    description: joinText([detail, definition]),
    wisdom: getField(record, ['Column9', 'Concept']),
    pattern: getField(record, ['Column7', 'Meaning']),
    material: getField(record, ['Column5', 'Collection']),
    technique: joinText([productionTechnique, procedure]),
    price: getField(record, ['Column12', 'Price']),
    producer: null,
    community: null,
    address: null,
    sub_district: null,
    district: null,
    province: getField(record, ['Column4', 'Province']),
    province_code: provinceCode,
    postcode: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    website: null,
    facebook: null,
    line: null,
    image_url: null,
    source_uri: `https://gdcatalog.m-culture.go.th/dataset/resource/${THAI_FABRIC_WISDOM_RESOURCE_ID}`,
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

function mapThaiFabricRowToCulturalPlaceRow(
  row: ThaiFabricWisdomRow,
  provinceCenters: Map<string, ProvinceCenter>,
  now: string
) {
  if (!row.province_code || !row.title) {
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
    joinInlineText([row.description, row.wisdom && `ภูมิปัญญา: ${row.wisdom}`, row.pattern && `ลวดลาย: ${row.pattern}`]) ??
    'ข้อมูลมรดกภูมิปัญญาผ้าไทยจากกระทรวงวัฒนธรรม';
  const imageUrls = row.image_url ? [row.image_url] : [];

  return {
    id: row.id,
    province_code: row.province_code,
    name: row.title,
    district: row.district ?? '',
    category: 'costume',
    lat,
    lng,
    description,
    highlight: row.type ?? row.material ?? 'มรดกภูมิปัญญาผ้าไทย',
    image_urls: imageUrls,
    source_url: row.website ?? row.source_uri,
    map_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    source: 'thai_fabric_wisdom',
    payload: {
      ...row,
      content_category: 'costume',
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
  const { records, total } = await fetchThaiFabricWisdomRecords(limit, offset);
  const sourceRecords = records.filter((record) => !isHeaderRecord(record));
  const filteredRecords = sourceRecords.filter((record) => {
    const provinceCode = getProvinceCode(record);

    return !provinceFilter.size || (provinceCode ? provinceFilter.has(provinceCode) : false);
  });
  const rows = Array.from(
    new Map(
      filteredRecords.map((record) => {
        const row = mapRecord(record, now);

        return [row.id, row];
      })
    ).values()
  );
  const provinceCenters = await getProvinceCenters(provinceCodes);
  const culturalPlaceRows = rows
    .map((row) => mapThaiFabricRowToCulturalPlaceRow(row, provinceCenters, now))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      sourceUrl: THAI_FABRIC_WISDOM_DATASET_URL,
      totalSourceRecords: total,
      sourceRecords: sourceRecords.length,
      filteredRecords: filteredRecords.length,
      mappedRecords: rows.length,
      provinceCodes,
      limit,
      offset,
      tables: {
        [THAI_FABRIC_WISDOM_TABLE]: rows.length,
        [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
      },
    });
  }

  const result = await upsertRows(THAI_FABRIC_WISDOM_TABLE, rows, 'id');

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  const culturalPlacesResult = await upsertRows(CULTURAL_PLACES_TABLE, culturalPlaceRows, 'id');

  if (!culturalPlacesResult.ok) {
    return NextResponse.json({ message: culturalPlacesResult.error }, { status: 500 });
  }

  return NextResponse.json({
    dryRun: false,
    sourceUrl: THAI_FABRIC_WISDOM_DATASET_URL,
    totalSourceRecords: total,
    sourceRecords: sourceRecords.length,
    filteredRecords: filteredRecords.length,
    mappedRecords: rows.length,
    provinceCodes,
    limit,
    offset,
    upserted: {
      [THAI_FABRIC_WISDOM_TABLE]: rows.length,
      [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
    },
    message: `Synced ${rows.length} Thai Fabric Wisdom records and ${culturalPlaceRows.length} cultural places`,
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

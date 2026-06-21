import type { NextRequest } from 'next/server';
import type { CulturalPlace } from 'src/sections/province/province-data';

import crypto from 'node:crypto';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const RELIGIOUS_PLACES_CSV_URL =
  'https://gdcatalog.m-culture.go.th/dataset/e24cf531-630a-4e49-8ae4-0a35008db51b/resource/55f88f53-8e19-48dd-be77-a0cdca05a423/download/vw_religious_place.csv';
const RELIGIOUS_PLACES_TABLE = process.env.RELIGIOUS_PLACES_TABLE ?? 'religious_places';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const DETAILS_TABLE = process.env.CULTURAL_PLACE_DETAILS_TABLE ?? 'cultural_place_details';
const UPSERT_CHUNK_SIZE = 500;
const SUPABASE_PAGE_SIZE = 1000;

type ReligiousPlaceSyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  dryRun?: boolean;
};

type ReligiousPlaceRecord = Record<string, string | null> & {
  title_name?: string | null;
  main_category?: string | null;
  sub_category?: string | null;
  full_description_th?: string | null;
  tag?: string | null;
  location?: string | null;
  address_no?: string | null;
  address_moo?: string | null;
  address_soi?: string | null;
  address_road?: string | null;
  sub_district?: string | null;
  district?: string | null;
  province?: string | null;
  postcode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type ExistingPlaceRow = {
  id: string;
  province_code: string | null;
  name: string | null;
  district: string | null;
  image_urls?: string[] | null;
  source_url?: string | null;
  map_url?: string | null;
};

function cleanText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).replace(/^\uFEFF/, '').trim();

  return text ? text : null;
}

function normalizeText(value: unknown) {
  return (value == null ? '' : String(value))
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function getPlaceKey(provinceCode: string | null | undefined, name: unknown, district?: unknown) {
  return [provinceCode ?? '', normalizeText(name), normalizeText(district)].join('|');
}

function getLimit(value: unknown) {
  if (value == null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? Math.max(Math.trunc(parsedValue), 1) : null;
}

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function getProvinceCode(record: ReligiousPlaceRecord) {
  const provinceName = normalizeText(record.province);

  return provinces.find((province) => normalizeText(province.name) === provinceName)?.code ?? null;
}

function getProvinceCodes(body: ReligiousPlaceSyncBody, request: NextRequest) {
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

function getStablePlaceId(record: ReligiousPlaceRecord, provinceCode: string) {
  const signature = [
    record.title_name,
    provinceCode,
    record.district,
    record.sub_district,
    record.latitude,
    record.longitude,
  ]
    .map((value) => normalizeText(value))
    .join('|');
  const hash = crypto.createHash('sha1').update(signature).digest('hex').slice(0, 16);

  return `m-culture-religious-${hash}`;
}

function getStableReligiousPlaceId(record: ReligiousPlaceRecord, provinceCode: string) {
  const signature = [
    record.title_name,
    provinceCode,
    record.main_category,
    record.sub_category,
    record.district,
    record.sub_district,
    record.latitude,
    record.longitude,
  ]
    .map((value) => normalizeText(value))
    .join('|');
  const hash = crypto.createHash('sha1').update(signature).digest('hex').slice(0, 16);

  return `religious-place-${hash}`;
}

function parseDelimitedCsv(text: string, delimiter = '|') {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (isQuoted && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (!isQuoted && character === delimiter) {
      row.push(value);
      value = '';
      continue;
    }

    if (!isQuoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += character;
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((header) => cleanText(header) ?? '');

  return dataRows.map((cells) =>
    Object.fromEntries(
      headers.map((header, index) => [header, cleanText(cells[index])])
    ) as ReligiousPlaceRecord
  );
}

async function readSyncBody(request: NextRequest): Promise<ReligiousPlaceSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as ReligiousPlaceSyncBody;
  } catch {
    return {};
  }
}

async function fetchReligiousPlaceRecords() {
  const response = await fetch(RELIGIOUS_PLACES_CSV_URL, {
    cache: 'no-store',
    headers: { Accept: 'text/csv,*/*' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch religious place CSV: HTTP ${response.status}`);
  }

  return parseDelimitedCsv(await response.text());
}

function getExistingPlaceMaps(existingPlaces: ExistingPlaceRow[]) {
  const exactPlaceMap = new Map<string, ExistingPlaceRow>();
  const provinceNamePlaceMap = new Map<string, ExistingPlaceRow>();

  existingPlaces.forEach((place) => {
    if (!place.id || !place.province_code || !place.name) {
      return;
    }

    exactPlaceMap.set(getPlaceKey(place.province_code, place.name, place.district), place);
    if (!provinceNamePlaceMap.has(getPlaceKey(place.province_code, place.name))) {
      provinceNamePlaceMap.set(getPlaceKey(place.province_code, place.name), place);
    }
  });

  return { exactPlaceMap, provinceNamePlaceMap };
}

async function getExistingPlaces(provinceCodes: string[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const rows: ExistingPlaceRow[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const from = pageIndex * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.client
      .from(CULTURAL_PLACES_TABLE)
      .select('id, province_code, name, district, image_urls, source_url, map_url')
      .range(from, to);

    if (provinceCodes.length) {
      query = query.in('province_code', provinceCodes);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    const nextRows = (data ?? []) as ExistingPlaceRow[];

    rows.push(...nextRows);

    if (nextRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function mapRecord(
  record: ReligiousPlaceRecord,
  now: string,
  existingPlaceMaps: ReturnType<typeof getExistingPlaceMaps>
) {
  const name = cleanText(record.title_name);
  const provinceCode = getProvinceCode(record);
  const lat = toCoordinate(record.latitude);
  const lng = toCoordinate(record.longitude);

  if (!name || !provinceCode || lat == null || lng == null) {
    return null;
  }

  const existingPlace =
    existingPlaceMaps.exactPlaceMap.get(getPlaceKey(provinceCode, name, record.district)) ??
    existingPlaceMaps.provinceNamePlaceMap.get(getPlaceKey(provinceCode, name));
  const placeId = existingPlace?.id ?? getStablePlaceId(record, provinceCode);
  const religiousPlaceId = getStableReligiousPlaceId(record, provinceCode);
  const description = cleanText(record.full_description_th) ?? 'ข้อมูลศาสนสถานจากกระทรวงวัฒนธรรม';
  const highlight = cleanText(record.tag) ?? cleanText(record.sub_category) ?? 'ศาสนสถาน';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const religiousPlaceRow = {
    id: religiousPlaceId,
    place_id: placeId,
    province_code: provinceCode,
    title_name: name,
    main_category: cleanText(record.main_category),
    sub_category: cleanText(record.sub_category),
    full_description_th: cleanText(record.full_description_th),
    tag: cleanText(record.tag),
    location: cleanText(record.location),
    address_no: cleanText(record.address_no),
    address_moo: cleanText(record.address_moo),
    address_soi: cleanText(record.address_soi),
    address_road: cleanText(record.address_road),
    sub_district: cleanText(record.sub_district),
    district: cleanText(record.district),
    province: cleanText(record.province),
    postcode: cleanText(record.postcode),
    latitude: lat,
    longitude: lng,
    source_payload: record,
    updated_at: now,
  };
  const culturalPlaceRow = {
    id: placeId,
    province_code: provinceCode,
    name,
    district: cleanText(record.district) ?? '',
    category: 'temple',
    lat,
    lng,
    description,
    highlight,
    image_urls: existingPlace?.image_urls ?? [],
    source_url: existingPlace?.source_url ?? RELIGIOUS_PLACES_CSV_URL,
    map_url: existingPlace?.map_url ?? mapUrl,
    source: 'religious_places' satisfies NonNullable<CulturalPlace['source']>,
    payload: record,
    updated_at: now,
  };
  const detailRow = {
    place_id: placeId,
    province_code: provinceCode,
    name_th: name,
    name_en: null,
    detail_th: description,
    detail_en: null,
    nearby_location: cleanText(record.location),
    category_id: null,
    category_label: cleanText(record.main_category),
    type_id: null,
    type_label: cleanText(record.sub_category),
    address: cleanText(record.address_no),
    address_alley: cleanText(record.address_soi),
    address_road: cleanText(record.address_road),
    province_name_th: cleanText(record.province),
    district_name_th: cleanText(record.district),
    subdistrict_name_th: cleanText(record.sub_district),
    postcode: cleanText(record.postcode),
    tel: null,
    email: null,
    opening_hours: null,
    fee_th: null,
    fee_th_kid: null,
    fee_en: null,
    fee_en_kid: null,
    activity: null,
    highlight,
    reward: null,
    suitable_duration: null,
    market_limitation: null,
    market_chance: null,
    rule: null,
    accessibility: null,
    facilities_contact: null,
    traveler_preparation: null,
    website: null,
    facebook: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    line: null,
    credit: null,
    cash: null,
    payment: null,
    remark: cleanText(record.address_moo),
    booking_detail: null,
    source_att_id: placeId,
    source_payload: record,
    updated_at: now,
  };

  return {
    religiousPlaceRow,
    culturalPlaceRow,
    detailRow,
    matchedExistingPlace: Boolean(existingPlace),
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
  const now = new Date().toISOString();
  const records = await fetchReligiousPlaceRecords();
  const filteredRecords = records.filter((record) => {
    const provinceCode = getProvinceCode(record);

    return !provinceFilter.size || (provinceCode ? provinceFilter.has(provinceCode) : false);
  });
  const limitedRecords = limit ? filteredRecords.slice(0, limit) : filteredRecords;
  const existingPlaceMaps = getExistingPlaceMaps(await getExistingPlaces(provinceCodes));
  const mappedRows = limitedRecords
    .map((record) => mapRecord(record, now, existingPlaceMaps))
    .filter((row): row is NonNullable<ReturnType<typeof mapRecord>> => Boolean(row));
  const matchedExistingPlaces = mappedRows.filter((row) => row.matchedExistingPlace).length;
  const culturalPlaceRows = Array.from(
    new Map(mappedRows.map((row) => [row.culturalPlaceRow.id, row.culturalPlaceRow])).values()
  );
  const detailRows = Array.from(
    new Map(mappedRows.map((row) => [row.detailRow.place_id, row.detailRow])).values()
  );
  const religiousPlaceRows = Array.from(
    new Map(mappedRows.map((row) => [row.religiousPlaceRow.id, row.religiousPlaceRow])).values()
  );

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      sourceUrl: RELIGIOUS_PLACES_CSV_URL,
      totalSourceRecords: records.length,
      filteredRecords: filteredRecords.length,
      mappedRecords: mappedRows.length,
      matchedExistingPlaces,
      skippedRecords: limitedRecords.length - mappedRows.length,
      provinceCodes,
      limit,
      tables: {
        [RELIGIOUS_PLACES_TABLE]: religiousPlaceRows.length,
        [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
        [DETAILS_TABLE]: detailRows.length,
      },
    });
  }

  const religiousPlaceResult = await upsertRows(RELIGIOUS_PLACES_TABLE, religiousPlaceRows, 'id');

  if (!religiousPlaceResult.ok) {
    return NextResponse.json({ message: religiousPlaceResult.error }, { status: 500 });
  }

  const placeResult = await upsertRows(CULTURAL_PLACES_TABLE, culturalPlaceRows, 'id');

  if (!placeResult.ok) {
    return NextResponse.json({ message: placeResult.error }, { status: 500 });
  }

  const detailResult = await upsertRows(DETAILS_TABLE, detailRows, 'place_id');

  if (!detailResult.ok) {
    return NextResponse.json({ message: detailResult.error }, { status: 500 });
  }

  return NextResponse.json({
    dryRun: false,
    sourceUrl: RELIGIOUS_PLACES_CSV_URL,
    totalSourceRecords: records.length,
    filteredRecords: filteredRecords.length,
    mappedRecords: mappedRows.length,
    matchedExistingPlaces,
    skippedRecords: limitedRecords.length - mappedRows.length,
    provinceCodes,
    limit,
    upserted: {
      [RELIGIOUS_PLACES_TABLE]: religiousPlaceRows.length,
      [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
      [DETAILS_TABLE]: detailRows.length,
    },
    message: `Synced ${detailRows.length} religious places`,
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

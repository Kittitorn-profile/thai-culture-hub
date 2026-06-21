import type { NextRequest } from 'next/server';
import type { CulturalCategory, CulturalPlace } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const ATTRACTION_JSON_URL =
  'https://datacatalog.tat.or.th/dataset/87442079-88ec-42eb-b507-dcf135fc4301/resource/9348705e-18b4-4815-8d2c-0fd2f649e88e/download/attraction.json';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const DETAILS_TABLE = process.env.CULTURAL_PLACE_DETAILS_TABLE ?? 'cultural_place_details';
const UPSERT_CHUNK_SIZE = 500;
const SUPABASE_PAGE_SIZE = 1000;

type AttractionSyncBody = {
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  dryRun?: boolean;
};

type TatAttractionRecord = Record<string, unknown> & {
  ATT_ID?: string | null;
  ATT_NAME_TH?: string | null;
  ATT_NAME_EN?: string | null;
  ATT_DETAIL_TH?: string | null;
  ATT_DETAIL_EN?: string | null;
  ATT_NEARBY_LOCATION?: string | null;
  ATT_CATEGORY?: number | string | null;
  ATT_TYPE?: number | string | null;
  ATT_ADDRESS?: string | null;
  ATT_ADDRESS_ALLEY?: string | null;
  ATT_ADDRESS_ROAD?: string | null;
  ATT_PROVINCE_ID?: string | null;
  ATT_DISTRICT_ID?: string | null;
  ATT_SUBDISTRICT_ID?: string | null;
  ATT_REGION_ID?: string | null;
  ATT_POSTCODE?: string | null;
  ATT_TEL?: string | null;
  ATT_EMAIL?: string | null;
  ATT_START_END?: string | null;
  ATT_FEE_TH?: string | number | null;
  ATT_FEE_TH_KID?: string | number | null;
  ATT_FEE_EN?: string | number | null;
  ATT_FEE_EN_KID?: string | number | null;
  ATT_ACTIVITY?: string | null;
  ATT_HILIGHT?: string | null;
  ATT_REWARD?: string | null;
  ATT_SUITABLE_DURATION?: string | null;
  ATT_MARKET_LIMITATION?: string | null;
  ATT_MARKET_CHANCE?: string | null;
  ATT_RULE?: string | null;
  ATT_ACCESSIBILITY?: string | null;
  ATT_LOCATION?: string | null;
  ATT_FACILITIES_CONTACT?: string | null;
  ATT_TRAVELER_PRE?: string | null;
  ATT_WEBSITE?: string | null;
  ATT_FACEBOOK?: string | null;
  ATT_INSTAGRAM?: string | null;
  ATT_TIKTOK?: string | null;
  ATT_YOUTUBE?: string | null;
  ATT_CREDIT?: string | null;
  ATT_CASH?: string | null;
  ATT_PAYMENT?: string | null;
  ATT_REMARK?: string | null;
  ATT_BOOKING_DETAIL?: string | null;
  ATT_LINE?: string | null;
  REGION_NAME_TH?: string | null;
  PROVINCE_NAME_TH?: string | null;
  DISTRICT_NAME_TH?: string | null;
  SUBDISTRICT_NAME_TH?: string | null;
  ATT_CATEGORY_LABEL?: string | null;
  ATT_TYPE_LABEL?: string | null;
};

type CulturalPlaceRow = {
  id: string;
  province_code: string;
  name: string;
  district: string;
  category: CulturalCategory;
  lat: number;
  lng: number;
  description: string;
  highlight: string;
  image_urls: string[];
  source_url: string | null;
  map_url: string | null;
  source: NonNullable<CulturalPlace['source']>;
  payload: TatAttractionRecord;
  updated_at: string;
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

type DetailRow = {
  place_id: string;
  province_code: string;
  name_th: string | null;
  name_en: string | null;
  detail_th: string | null;
  detail_en: string | null;
  nearby_location: string | null;
  category_id: string | null;
  category_label: string | null;
  type_id: string | null;
  type_label: string | null;
  address: string | null;
  address_alley: string | null;
  address_road: string | null;
  province_name_th: string | null;
  district_name_th: string | null;
  subdistrict_name_th: string | null;
  postcode: string | null;
  tel: string | null;
  email: string | null;
  opening_hours: string | null;
  fee_th: string | null;
  fee_th_kid: string | null;
  fee_en: string | null;
  fee_en_kid: string | null;
  activity: string | null;
  highlight: string | null;
  reward: string | null;
  suitable_duration: string | null;
  market_limitation: string | null;
  market_chance: string | null;
  rule: string | null;
  accessibility: string | null;
  facilities_contact: string | null;
  traveler_preparation: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  line: string | null;
  credit: string | null;
  cash: string | null;
  payment: string | null;
  remark: string | null;
  booking_detail: string | null;
  source_att_id: string;
  source_payload: TatAttractionRecord;
  updated_at: string;
};

function cleanText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();

  return text ? text : null;
}

function normalizeText(value: unknown) {
  return (value == null ? '' : String(value)).replace(/\s+/g, '').trim();
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

function getProvinceCodes(body: AttractionSyncBody, request: NextRequest) {
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

function getProvinceCode(record: TatAttractionRecord) {
  const provinceName = normalizeText(record.PROVINCE_NAME_TH);

  return provinces.find((province) => normalizeText(province.name) === provinceName)?.code ?? null;
}

function parseLocation(value: unknown) {
  const [latText, lngText] = String(value ?? '')
    .split(',')
    .map((part) => part.trim());
  const lat = Number(latText);
  const lng = Number(lngText);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function getCategory(record: TatAttractionRecord): CulturalCategory {
  const label = `${record.ATT_CATEGORY_LABEL ?? ''} ${record.ATT_TYPE_LABEL ?? ''}`;

  if (/วัด|ศาสน|พระ|มัสยิด|โบสถ์/.test(label)) {
    return 'temple';
  }

  if (/พิพิธภัณฑ์/.test(label)) {
    return 'museum';
  }

  if (/ศูนย์ศึกษา|ศูนย์เรียน|แหล่งเรียน/.test(label)) {
    return 'learning_center';
  }

  if (/ชุมชน|วิถีชีวิต|ภูมิปัญญา/.test(label)) {
    return 'community_wisdom';
  }

  if (/อาหาร|ตลาด/.test(label)) {
    return 'local_food';
  }

  if (/ประวัติ|วัฒนธรรม|โบราณ|วัง|พระราชวัง/.test(label)) {
    return 'cultural_attraction';
  }

  return 'tourist_attraction';
}

function getGoogleMapUrl(location: ReturnType<typeof parseLocation>) {
  return location ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : null;
}

function getRecords(payload: unknown): TatAttractionRecord[] {
  if (Array.isArray(payload)) {
    return payload as TatAttractionRecord[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const firstArray = Object.values(payload).find((value) => Array.isArray(value));

  return Array.isArray(firstArray) ? (firstArray as TatAttractionRecord[]) : [];
}

async function readSyncBody(request: NextRequest): Promise<AttractionSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as AttractionSyncBody;
  } catch {
    return {};
  }
}

async function fetchAttractionRecords() {
  const response = await fetch(ATTRACTION_JSON_URL, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch attraction.json: HTTP ${response.status}`);
  }

  return getRecords(await response.json());
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
  record: TatAttractionRecord,
  now: string,
  existingPlaceMaps: ReturnType<typeof getExistingPlaceMaps>
) {
  const sourceAttId = cleanText(record.ATT_ID);
  const name = cleanText(record.ATT_NAME_TH);
  const provinceCode = getProvinceCode(record);
  const location = parseLocation(record.ATT_LOCATION);

  if (!sourceAttId || !name || !provinceCode || !location) {
    return null;
  }

  const existingPlace =
    existingPlaceMaps.exactPlaceMap.get(getPlaceKey(provinceCode, name, record.DISTRICT_NAME_TH)) ??
    existingPlaceMaps.provinceNamePlaceMap.get(getPlaceKey(provinceCode, name));
  const placeId = existingPlace?.id ?? `tat-attraction-${sourceAttId}`;
  const category = getCategory(record);
  const detailTh = cleanText(record.ATT_DETAIL_TH);
  const highlight = cleanText(record.ATT_HILIGHT) ?? cleanText(record.ATT_TYPE_LABEL) ?? '';
  const mapUrl = getGoogleMapUrl(location);
  const culturalPlaceRow: CulturalPlaceRow = {
    id: placeId,
    province_code: provinceCode,
    name,
    district: cleanText(record.DISTRICT_NAME_TH) ?? '',
    category,
    lat: location.lat,
    lng: location.lng,
    description: detailTh ?? 'ข้อมูลแหล่งท่องเที่ยวจาก TAT Data Catalog',
    highlight,
    image_urls: existingPlace?.image_urls ?? [],
    source_url: existingPlace?.source_url ?? null,
    map_url: existingPlace?.map_url ?? mapUrl,
    source: 'tat',
    payload: record,
    updated_at: now,
  };
  const detailRow: DetailRow = {
    place_id: placeId,
    province_code: provinceCode,
    name_th: name,
    name_en: cleanText(record.ATT_NAME_EN),
    detail_th: detailTh,
    detail_en: cleanText(record.ATT_DETAIL_EN),
    nearby_location: cleanText(record.ATT_NEARBY_LOCATION),
    category_id: cleanText(record.ATT_CATEGORY),
    category_label: cleanText(record.ATT_CATEGORY_LABEL),
    type_id: cleanText(record.ATT_TYPE),
    type_label: cleanText(record.ATT_TYPE_LABEL),
    address: cleanText(record.ATT_ADDRESS),
    address_alley: cleanText(record.ATT_ADDRESS_ALLEY),
    address_road: cleanText(record.ATT_ADDRESS_ROAD),
    province_name_th: cleanText(record.PROVINCE_NAME_TH),
    district_name_th: cleanText(record.DISTRICT_NAME_TH),
    subdistrict_name_th: cleanText(record.SUBDISTRICT_NAME_TH),
    postcode: cleanText(record.ATT_POSTCODE),
    tel: cleanText(record.ATT_TEL),
    email: cleanText(record.ATT_EMAIL),
    opening_hours: cleanText(record.ATT_START_END),
    fee_th: cleanText(record.ATT_FEE_TH),
    fee_th_kid: cleanText(record.ATT_FEE_TH_KID),
    fee_en: cleanText(record.ATT_FEE_EN),
    fee_en_kid: cleanText(record.ATT_FEE_EN_KID),
    activity: cleanText(record.ATT_ACTIVITY),
    highlight: cleanText(record.ATT_HILIGHT),
    reward: cleanText(record.ATT_REWARD),
    suitable_duration: cleanText(record.ATT_SUITABLE_DURATION),
    market_limitation: cleanText(record.ATT_MARKET_LIMITATION),
    market_chance: cleanText(record.ATT_MARKET_CHANCE),
    rule: cleanText(record.ATT_RULE),
    accessibility: cleanText(record.ATT_ACCESSIBILITY),
    facilities_contact: cleanText(record.ATT_FACILITIES_CONTACT),
    traveler_preparation: cleanText(record.ATT_TRAVELER_PRE),
    website: cleanText(record.ATT_WEBSITE),
    facebook: cleanText(record.ATT_FACEBOOK),
    instagram: cleanText(record.ATT_INSTAGRAM),
    tiktok: cleanText(record.ATT_TIKTOK),
    youtube: cleanText(record.ATT_YOUTUBE),
    line: cleanText(record.ATT_LINE),
    credit: cleanText(record.ATT_CREDIT),
    cash: cleanText(record.ATT_CASH),
    payment: cleanText(record.ATT_PAYMENT),
    remark: cleanText(record.ATT_REMARK),
    booking_detail: cleanText(record.ATT_BOOKING_DETAIL),
    source_att_id: sourceAttId,
    source_payload: record,
    updated_at: now,
  };

  return { culturalPlaceRow, detailRow, matchedExistingPlace: Boolean(existingPlace) };
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
  const records = await fetchAttractionRecords();
  const filteredRecords = records.filter((record) => {
    const provinceCode = getProvinceCode(record);

    return !provinceFilter.size || (provinceCode ? provinceFilter.has(provinceCode) : false);
  });
  const limitedRecords = limit ? filteredRecords.slice(0, limit) : filteredRecords;
  const existingPlaces = await getExistingPlaces(provinceCodes);
  const existingPlaceMaps = getExistingPlaceMaps(existingPlaces);
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

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      sourceUrl: ATTRACTION_JSON_URL,
      totalSourceRecords: records.length,
      filteredRecords: filteredRecords.length,
      mappedRecords: mappedRows.length,
      matchedExistingPlaces,
      skippedRecords: limitedRecords.length - mappedRows.length,
      provinceCodes,
      limit,
      tables: {
        [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
        [DETAILS_TABLE]: detailRows.length,
      },
    });
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
    sourceUrl: ATTRACTION_JSON_URL,
    totalSourceRecords: records.length,
    filteredRecords: filteredRecords.length,
    mappedRecords: mappedRows.length,
    matchedExistingPlaces,
    skippedRecords: limitedRecords.length - mappedRows.length,
    provinceCodes,
    limit,
    upserted: {
      [CULTURAL_PLACES_TABLE]: culturalPlaceRows.length,
      [DETAILS_TABLE]: detailRows.length,
    },
    message: `Synced ${detailRows.length} TAT attraction details`,
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

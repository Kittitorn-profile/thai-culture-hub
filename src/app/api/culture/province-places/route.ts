import type { NextRequest } from 'next/server';
import type { CulturalPlace, CulturalPlaceDetails } from 'src/sections/province/province-data';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

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

type PlaceOverride = {
  place_id: string;
  province_code?: string | null;
  name?: string | null;
  source?: CulturalPlace['source'] | string | null;
  category?: CulturalPlace['category'] | string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  map_url?: string | null;
  image_url?: string | null;
  note?: string | null;
  detail?: string | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
  updated_by_name?: string | null;
};

type PlaceDetailRow = {
  place_id: string;
  province_code?: string | null;
  name_th?: string | null;
  name_en?: string | null;
  detail_th?: string | null;
  detail_en?: string | null;
  nearby_location?: string | null;
  category_id?: string | null;
  category_label?: string | null;
  type_id?: string | null;
  type_label?: string | null;
  address?: string | null;
  address_alley?: string | null;
  address_road?: string | null;
  province_name_th?: string | null;
  district_name_th?: string | null;
  subdistrict_name_th?: string | null;
  postcode?: string | null;
  tel?: string | null;
  email?: string | null;
  opening_hours?: string | null;
  fee_th?: string | null;
  fee_th_kid?: string | null;
  fee_en?: string | null;
  fee_en_kid?: string | null;
  activity?: string | null;
  highlight?: string | null;
  reward?: string | null;
  suitable_duration?: string | null;
  market_limitation?: string | null;
  market_chance?: string | null;
  rule?: string | null;
  accessibility?: string | null;
  facilities_contact?: string | null;
  traveler_preparation?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  line?: string | null;
  credit?: string | null;
  cash?: string | null;
  payment?: string | null;
  remark?: string | null;
  booking_detail?: string | null;
  source_att_id?: string | null;
  source_payload?: Record<string, unknown> | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
  updated_by_name?: string | null;
};

type CulturalPlaceRow = {
  id: string;
  province_code?: string | null;
  name: string | null;
  district: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  highlight: string | null;
  image_urls: string[] | null;
  source_url: string | null;
  map_url: string | null;
  source: string | null;
  payload?: Partial<CulturalPlace> | null;
};

type EthnicGroupRow = {
  ethnic_id: number | null;
  spatial: string | null;
  title: string | null;
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
  description_th: string | null;
  description_en: string | null;
  village_no: string | null;
};

type ProvincePlaceSummaryRow = {
  province_code: string;
  province_name?: string | null;
  counts?: Record<string, unknown> | null;
  dominant_category?: string | null;
  total?: number | null;
  refreshed_at?: string | null;
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
const OVERRIDES_TABLE = process.env.CULTURAL_PLACE_OVERRIDES_TABLE ?? 'cultural_place_overrides';
const PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const SUMMARY_TABLE = process.env.PROVINCE_PLACE_SUMMARIES_TABLE ?? 'province_place_summaries';
const DETAILS_TABLE = process.env.CULTURAL_PLACE_DETAILS_TABLE ?? 'cultural_place_details';
const ETHNIC_GROUPS_TABLE = process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups';
const SUPABASE_PAGE_SIZE = 1000;
const SUMMARY_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=604800';

type CulturalPlaceRecord = CulturalPlace & {
  provinceCode?: string;
  override?: PlaceOverride | null;
};

type ProvinceCategoryCounts = Record<string, number>;

type ProvincePlaceSummary = {
  counts: ProvinceCategoryCounts;
  dominantCategory: string;
  total: number;
};

type ProvincePlaceSummaryMap = Record<string, ProvincePlaceSummary>;

function getLimit(value: string | null) {
  if (value == null) {
    return null;
  }

  const limit = Number(value ?? 50);

  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 50;
}

function getPositiveInteger(value: string | null, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(Math.floor(numberValue), 1) : fallback;
}

function normalizePlaceKeyText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').trim().toLowerCase();
}

function getDuplicatePlaceKey(place: CulturalPlaceRecord) {
  return [
    place.provinceCode ?? '',
    normalizePlaceKeyText(place.name),
    normalizePlaceKeyText(place.district),
  ].join('|');
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

async function getPlaceOverrides(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  let query = supabase.client
    .from(OVERRIDES_TABLE)
    .select(
      'place_id, province_code, name, source, category, district, lat, lng, map_url, image_url, note, detail, updated_at, updated_by_id, updated_by_email, updated_by_name'
    );

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data ?? []) as PlaceOverride[];
}

function mapPlaceDetail(row: PlaceDetailRow): CulturalPlaceDetails {
  return {
    placeId: row.place_id,
    provinceCode: row.province_code,
    nameTh: row.name_th,
    nameEn: row.name_en,
    detailTh: row.detail_th,
    detailEn: row.detail_en,
    nearbyLocation: row.nearby_location,
    categoryId: row.category_id,
    categoryLabel: row.category_label,
    typeId: row.type_id,
    typeLabel: row.type_label,
    address: row.address,
    addressAlley: row.address_alley,
    addressRoad: row.address_road,
    provinceNameTh: row.province_name_th,
    districtNameTh: row.district_name_th,
    subdistrictNameTh: row.subdistrict_name_th,
    postcode: row.postcode,
    tel: row.tel,
    email: row.email,
    openingHours: row.opening_hours,
    feeTh: row.fee_th,
    feeThKid: row.fee_th_kid,
    feeEn: row.fee_en,
    feeEnKid: row.fee_en_kid,
    activity: row.activity,
    highlight: row.highlight,
    reward: row.reward,
    suitableDuration: row.suitable_duration,
    marketLimitation: row.market_limitation,
    marketChance: row.market_chance,
    rule: row.rule,
    accessibility: row.accessibility,
    facilitiesContact: row.facilities_contact,
    travelerPreparation: row.traveler_preparation,
    website: row.website,
    facebook: row.facebook,
    instagram: row.instagram,
    tiktok: row.tiktok,
    youtube: row.youtube,
    line: row.line,
    credit: row.credit,
    cash: row.cash,
    payment: row.payment,
    remark: row.remark,
    bookingDetail: row.booking_detail,
    sourceAttId: row.source_att_id,
    sourcePayload: row.source_payload,
    updatedAt: row.updated_at,
    updatedById: row.updated_by_id,
    updatedByEmail: row.updated_by_email,
    updatedByName: row.updated_by_name,
  };
}

async function getPlaceDetails(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  let query = supabase.client.from(DETAILS_TABLE).select('*');

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return ((data ?? []) as PlaceDetailRow[]).map(mapPlaceDetail);
}

async function getPlaceDetailsByPlaceIds(placeIds: string[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok || !placeIds.length) {
    return [];
  }

  const { data, error } = await supabase.client
    .from(DETAILS_TABLE)
    .select('*')
    .in('place_id', placeIds);

  if (error) {
    return [];
  }

  return ((data ?? []) as PlaceDetailRow[]).map(mapPlaceDetail);
}

function mapPlaceRow(row: CulturalPlaceRow): CulturalPlaceRecord | null {
  if (!row.id || !row.name || row.lat == null || row.lng == null) {
    return null;
  }

  return {
    ...(row.payload ?? {}),
    id: row.id,
    provinceCode: row.province_code ?? undefined,
    name: row.name,
    district: row.district ?? '',
    category: (row.category as CulturalPlace['category']) ?? 'cultural_attraction',
    lat: row.lat,
    lng: row.lng,
    description: row.description ?? '',
    highlight: row.highlight ?? '',
    imageUrls: row.image_urls ?? row.payload?.imageUrls ?? [],
    sourceUrl: row.source_url ?? row.payload?.sourceUrl,
    mapUrl: row.map_url ?? row.payload?.mapUrl,
    source: (row.source as CulturalPlace['source']) ?? row.payload?.source ?? 'local',
  };
}

function getProvinceCodeFromName(provinceName?: string | null) {
  const normalizedProvinceName = normalizePlaceKeyText(provinceName);

  return provinces.find((province) => normalizePlaceKeyText(province.name) === normalizedProvinceName)
    ?.code;
}

function getEthnicGroupPlaceId(row: EthnicGroupRow) {
  if (row.ethnic_id != null) {
    return `ethnic-group-${row.ethnic_id}`;
  }

  return [
    'ethnic-group',
    row.ip_group,
    row.province,
    row.district_th,
    row.sub_district_th,
    row.village_name_th,
    row.lat,
    row.lng,
  ]
    .filter((value) => value != null && value !== '')
    .map((value) => normalizePlaceKeyText(`${value}`))
    .join('-');
}

function mapEthnicGroupRow(row: EthnicGroupRow): CulturalPlaceRecord | null {
  const provinceCode = getProvinceCodeFromName(row.province);

  if (!provinceCode || !row.title || row.lat == null || row.lng == null) {
    return null;
  }

  return {
    id: getEthnicGroupPlaceId(row),
    provinceCode,
    name: row.title,
    district: row.district_th ?? '',
    category: 'ethnic_group',
    lat: row.lat,
    lng: row.lng,
    description: row.description_th || row.description_en || 'ข้อมูลกลุ่มชาติพันธุ์',
    highlight: row.ip_group ?? 'กลุ่มชาติพันธุ์',
    imageUrls: [],
    sourceUrl:
      'https://data.thailand.opendevelopmentmekong.net/th/api/3/action/datastore_search?resource_id=286cca68-b84d-4151-b95f-d31ba7a9f640',
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`,
    source: 'ethnic_groups',
  };
}

async function getEthnicGroupPlaces(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const { data, error } = await supabase.client
    .from(ETHNIC_GROUPS_TABLE)
    .select(
      'ethnic_id, spatial, title, ip_group, sub_district_th, sub_district_en, district_th, district_en, province, province_en, lat, lng, village_name_th, village_name_en, description_th, description_en, village_no'
    );

  if (error) {
    return [];
  }

  return ((data ?? []) as EthnicGroupRow[])
    .map(mapEthnicGroupRow)
    .filter((place): place is CulturalPlaceRecord => Boolean(place))
    .filter((place) => !provinceCode || place.provinceCode === provinceCode);
}

async function getStoredPlaces(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const rows: CulturalPlaceRow[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const from = pageIndex * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.client
      .from(PLACES_TABLE)
      .select(
        'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload'
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    const nextRows = (data ?? []) as CulturalPlaceRow[];

    rows.push(...nextRows);

    if (nextRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows
    .map(mapPlaceRow)
    .filter((place): place is CulturalPlaceRecord => Boolean(place));
}

async function getStoredDistricts(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return [];
  }

  const districts = new Set<string>();

  for (let pageIndex = 0; ; pageIndex += 1) {
    const from = pageIndex * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = supabase.client.from(PLACES_TABLE).select('district').range(from, to);

    if (provinceCode) {
      query = query.eq('province_code', provinceCode);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    const nextRows = (data ?? []) as Array<{ district?: string | null }>;

    nextRows.forEach((row) => {
      if (row.district) {
        districts.add(row.district);
      }
    });

    if (nextRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return Array.from(districts).sort((firstDistrict, secondDistrict) =>
    firstDistrict.localeCompare(secondDistrict, 'th')
  );
}

async function getStoredPlaceCount(provinceCode?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return 0;
  }

  let query = supabase.client
    .from(PLACES_TABLE)
    .select('id', { count: 'exact', head: true });

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

function escapeIlikeValue(value: string) {
  return value.replace(/[%_]/g, (character) => `\\${character}`).replace(/,/g, ' ');
}

async function getStoredPlacesPage({
  provinceCode,
  district,
  source,
  query: searchQuery,
  page,
  pageSize,
}: {
  provinceCode?: string | null;
  district: string;
  source: string;
  query: string;
  page: number;
  pageSize: number;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { data: [] as CulturalPlaceRecord[], total: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.client
    .from(PLACES_TABLE)
    .select(
      'id, province_code, name, district, category, lat, lng, description, highlight, image_urls, source_url, map_url, source, payload',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  }

  if (district) {
    query = query.eq('district', district);
  }

  if (source) {
    query = query.eq('source', source);
  }

  if (searchQuery) {
    const ilikeValue = `%${escapeIlikeValue(searchQuery)}%`;

    query = query.or(
      [
        `name.ilike.${ilikeValue}`,
        `district.ilike.${ilikeValue}`,
        `highlight.ilike.${ilikeValue}`,
        `source.ilike.${ilikeValue}`,
        `province_code.ilike.${ilikeValue}`,
      ].join(',')
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return { data: [] as CulturalPlaceRecord[], total: 0 };
  }

  return {
    data: ((data ?? []) as CulturalPlaceRow[])
      .map(mapPlaceRow)
      .filter((place): place is CulturalPlaceRecord => Boolean(place)),
    total: count ?? 0,
  };
}

type CulturalPlaceWithOverride = CulturalPlaceRecord & {
  override?: PlaceOverride | null;
};

function createPlaceFromOverride(override: PlaceOverride): CulturalPlaceWithOverride | null {
  if (override.lat == null || override.lng == null) {
    return null;
  }

  const source =
    override.source &&
    [
      'local',
      'tat',
      'culture_catalog',
      'thailand_cultural_hub',
      'finearts_monument',
      'finearts_archeology',
      'finearts_buddha',
      'finearts_museum',
    ].includes(override.source)
      ? (override.source as CulturalPlace['source'])
      : 'thailand_cultural_hub';
  const category = (override.category as CulturalPlace['category']) || 'cultural_attraction';

  return {
    id: override.place_id,
    provinceCode: override.province_code ?? undefined,
    name: override.name || 'สถานที่ใหม่',
    source,
    lat: override.lat,
    lng: override.lng,
    mapUrl: override.map_url || undefined,
    imageUrls: override.image_url ? [override.image_url] : undefined,
    district: override.district || '',
    category,
    description: override.detail || override.note || '',
    highlight: override.note || category,
    override,
  };
}

function applyPlaceOverrides(places: CulturalPlaceRecord[], overrides: PlaceOverride[]) {
  if (!overrides.length) {
    return places;
  }

  const overrideMap = new Map(overrides.map((override) => [override.place_id, override]));
  const overriddenPlaces = places.map((place) => {
    const override = overrideMap.get(place.id);

    if (!override) {
      return place;
    }

    return {
      ...place,
      provinceCode: override.province_code || place.provinceCode,
      name: override.name || place.name,
      source: (override.source as CulturalPlace['source']) || place.source,
      category: (override.category as CulturalPlace['category']) || place.category,
      district: override.district || place.district,
      lat: override.lat ?? place.lat,
      lng: override.lng ?? place.lng,
      mapUrl: override.map_url || place.mapUrl,
      imageUrls: override.image_url ? [override.image_url] : place.imageUrls,
      description: override.detail || place.description,
      highlight: override.note || place.highlight,
      override,
    };
  });
  const existingPlaceIds = new Set(places.map((place) => place.id));
  const overrideOnlyPlaces = overrides
    .filter((override) => !existingPlaceIds.has(override.place_id))
    .map(createPlaceFromOverride)
    .filter((place): place is CulturalPlaceWithOverride => !!place);

  return [...overrideOnlyPlaces, ...overriddenPlaces];
}

function applyPlaceDetails(
  places: CulturalPlaceRecord[],
  details: CulturalPlaceDetails[]
): CulturalPlaceRecord[] {
  if (!details.length) {
    return places;
  }

  const detailMap = new Map(details.map((detail) => [detail.placeId, detail]));

  return places.map((place) => {
    const detail = detailMap.get(place.id);

    if (!detail) {
      return place;
    }

    return {
      ...place,
      name: detail.nameTh || place.name,
      description: detail.detailTh || detail.detailEn || place.description,
      highlight: detail.highlight || detail.categoryLabel || detail.typeLabel || place.highlight,
      details: detail,
    };
  });
}

function hasImages(place: CulturalPlaceRecord) {
  return Boolean(place.imageUrls?.some(Boolean));
}

function getDuplicatePlaceScore(place: CulturalPlaceRecord) {
  return [
    place.override ? 16 : 0,
    hasImages(place) ? 8 : 0,
    place.details ? 4 : 0,
    place.id.startsWith('tat-attraction-') ? 0 : 2,
    place.description ? 1 : 0,
  ].reduce((total, score) => total + score, 0);
}

function mergeDuplicatePlace(
  currentPlace: CulturalPlaceRecord,
  nextPlace: CulturalPlaceRecord
): CulturalPlaceRecord {
  const preferredPlace =
    getDuplicatePlaceScore(nextPlace) > getDuplicatePlaceScore(currentPlace)
      ? nextPlace
      : currentPlace;
  const fallbackPlace = preferredPlace === currentPlace ? nextPlace : currentPlace;
  const details = preferredPlace.details ?? fallbackPlace.details;
  const override = preferredPlace.override ?? fallbackPlace.override;

  return {
    ...preferredPlace,
    details,
    override,
    imageUrls: hasImages(preferredPlace) ? preferredPlace.imageUrls : fallbackPlace.imageUrls,
    sourceUrl: preferredPlace.sourceUrl ?? fallbackPlace.sourceUrl,
    mapUrl: preferredPlace.mapUrl ?? fallbackPlace.mapUrl,
    description: details?.detailTh || details?.detailEn || preferredPlace.description || fallbackPlace.description,
    highlight:
      override?.note ||
      details?.highlight ||
      details?.categoryLabel ||
      details?.typeLabel ||
      preferredPlace.highlight ||
      fallbackPlace.highlight,
  };
}

function dedupePlaces(places: CulturalPlaceRecord[]) {
  const placeMap = new Map<string, CulturalPlaceRecord>();

  places.forEach((place) => {
    const key = getDuplicatePlaceKey(place);
    const existingPlace = placeMap.get(key);

    if (!existingPlace) {
      placeMap.set(key, place);
      return;
    }

    placeMap.set(key, mergeDuplicatePlace(existingPlace, place));
  });

  return Array.from(placeMap.values());
}

function getDistricts(places: CulturalPlaceRecord[]) {
  return Array.from(
    new Set(
      places.map((place) => place.district).filter((district): district is string => !!district)
    )
  ).sort((firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, 'th'));
}

function getDominantCategoryFromCounts(counts: ProvinceCategoryCounts) {
  return Object.entries(counts).reduce<string | null>((dominantCategory, [category, count]) => {
    if (!category || !count) {
      return dominantCategory;
    }

    if (!dominantCategory || count > (counts[dominantCategory] ?? 0)) {
      return category;
    }

    return dominantCategory;
  }, null);
}

function getProvincePlaceSummaries(places: CulturalPlaceRecord[]) {
  const summaries = places.reduce<ProvincePlaceSummaryMap>((provinceSummaries, place) => {
    if (!place.provinceCode || !place.category) {
      return provinceSummaries;
    }

    const summary = provinceSummaries[place.provinceCode] ?? {
      counts: {},
      dominantCategory: '',
      total: 0,
    };

    summary.counts[place.category] = (summary.counts[place.category] ?? 0) + 1;
    summary.total += 1;
    provinceSummaries[place.provinceCode] = summary;

    return provinceSummaries;
  }, {});

  Object.values(summaries).forEach((summary) => {
    summary.dominantCategory = getDominantCategoryFromCounts(summary.counts) ?? '';
  });

  return summaries;
}

function isProvinceCategoryCounts(value: unknown): value is ProvinceCategoryCounts {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every((count) => typeof count === 'number')
  );
}

function mapProvincePlaceSummaryRow(row: ProvincePlaceSummaryRow) {
  if (!row.province_code || !isProvinceCategoryCounts(row.counts)) {
    return null;
  }

  return [
    row.province_code,
    {
      counts: row.counts,
      dominantCategory:
        row.dominant_category || getDominantCategoryFromCounts(row.counts) || '',
      total: row.total ?? Object.values(row.counts).reduce((sum, count) => sum + count, 0),
    },
  ] as const;
}

async function getStoredProvincePlaceSummaries() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  const { data, error } = await supabase.client
    .from(SUMMARY_TABLE)
    .select('province_code, province_name, counts, dominant_category, total, refreshed_at')
    .order('province_code', { ascending: true });

  if (error) {
    return null;
  }

  return Object.fromEntries(
    ((data ?? []) as ProvincePlaceSummaryRow[])
      .map(mapProvincePlaceSummaryRow)
      .filter((entry): entry is readonly [string, ProvincePlaceSummary] => Boolean(entry))
  );
}

async function upsertProvincePlaceSummaries(summaries: ProvincePlaceSummaryMap) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return;
  }

  const refreshedAt = new Date().toISOString();
  const rows = Object.entries(summaries).map(([provinceCode, summary]) => ({
    province_code: provinceCode,
    province_name: provinces.find((province) => province.code === provinceCode)?.name ?? provinceCode,
    counts: summary.counts,
    dominant_category: summary.dominantCategory,
    total: summary.total,
    refreshed_at: refreshedAt,
    updated_at: refreshedAt,
  }));

  if (!rows.length) {
    return;
  }

  await supabase.client.from(SUMMARY_TABLE).upsert(rows, {
    onConflict: 'province_code',
  });
}

async function buildProvincePlaceSummaries() {
  const ethnicGroupPlaces = await getEthnicGroupPlaces();
  const storedPlaces = await getStoredPlaces();
  const allData = dedupePlaces(
    applyPlaceOverrides([...storedPlaces, ...ethnicGroupPlaces], await getPlaceOverrides())
  );
  const summaries = getProvincePlaceSummaries(allData);
  const total = Object.values(summaries).reduce((sum, summary) => sum + summary.total, 0);

  await upsertProvincePlaceSummaries(summaries);

  return { summaries, total };
}

function filterPlaces(places: CulturalPlaceRecord[], district: string, query: string, source: string) {
  const normalizedDistrict = district.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSource = source.trim().toLowerCase();

  return places.filter((place) => {
    if (normalizedDistrict && place.district?.trim().toLowerCase() !== normalizedDistrict) {
      return false;
    }

    if (normalizedSource && place.source?.trim().toLowerCase() !== normalizedSource) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [place.name, place.district, place.highlight, place.source, place.provinceCode]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
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
  const provinceCodeParam = request.nextUrl.searchParams.get('provinceCode');
  const provinceCode =
    provinceCodeParam && provinceCodeParam !== 'all' ? provinceCodeParam : '';
  const isSummary = request.nextUrl.searchParams.get('summary') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const requestedLimit = getLimit(request.nextUrl.searchParams.get('limit'));
  const page = getPositiveInteger(request.nextUrl.searchParams.get('page'), 1);
  const pageSizeParam = request.nextUrl.searchParams.get('pageSize');
  const pageSize = pageSizeParam ? Math.min(getPositiveInteger(pageSizeParam, 10), 100) : null;
  const district = request.nextUrl.searchParams.get('district') ?? '';
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const source = request.nextUrl.searchParams.get('source') ?? '';
  const shouldRefreshSummary = request.nextUrl.searchParams.get('refreshSummary') === 'true';
  const shouldReturnAllProvinceSummary =
    !provinceCode &&
    (isSummary || (!provinceCodeParam && !limitParam && !pageSizeParam && !district && !query && !source));

  if (shouldReturnAllProvinceSummary) {
    const storedSummaries = shouldRefreshSummary ? null : await getStoredProvincePlaceSummaries();
    const hasStoredSummaries = Boolean(storedSummaries && Object.keys(storedSummaries).length);
    const summaries: ProvincePlaceSummaryMap =
      hasStoredSummaries && storedSummaries
        ? storedSummaries
        : (await buildProvincePlaceSummaries()).summaries;
    const total = Object.values(summaries).reduce((sum, summary) => sum + summary.total, 0);

    return NextResponse.json(
      {
        data: [],
        summaries,
        total,
        pagination: {
          page: 1,
          pageSize: 0,
          total,
          totalPages: 1,
        },
        sources: {},
        source: hasStoredSummaries ? 'province-place-summaries' : 'generated-province-place-summaries',
      },
      {
        headers: {
          'Cache-Control': SUMMARY_CACHE_CONTROL,
        },
      }
    );
  }

  const hasStoredPlaces = (await getStoredPlaceCount(provinceCode)) > 0;
  const ethnicGroupPlaces = await getEthnicGroupPlaces(provinceCode);

  if (hasStoredPlaces && pageSize && !ethnicGroupPlaces.length) {
    const [{ data: storedPageData, total }, districts, overrides] = await Promise.all([
      getStoredPlacesPage({
        provinceCode,
        district,
        source,
        query,
        page,
        pageSize,
      }),
      getStoredDistricts(provinceCode),
      getPlaceOverrides(provinceCode),
    ]);
    const placeIds = storedPageData.map((place) => place.id);
    const details = await getPlaceDetailsByPlaceIds(placeIds);
    const allData = dedupePlaces(applyPlaceDetails(applyPlaceOverrides(storedPageData, overrides), details));
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const normalizedPage = Math.min(page, totalPages);

    return NextResponse.json({
      data: allData,
      districts,
      page: normalizedPage,
      pageSize,
      total,
      pagination: {
        page: normalizedPage,
        pageSize,
        total,
        totalPages,
      },
      sources: {},
      source: 'supabase-cultural-places',
    });
  }

  const storedPlaces = await getStoredPlaces(provinceCode);
  const sourceResults = storedPlaces.length || !provinceCode
    ? []
    : await Promise.all(
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
  const mergedData = storedPlaces.length
    ? [...storedPlaces, ...ethnicGroupPlaces]
    : mergeCulturalPlaces(...sourceResults.map((result) => result.data), ethnicGroupPlaces);
  const allData = dedupePlaces(applyPlaceDetails(
    applyPlaceOverrides(mergedData, await getPlaceOverrides(provinceCode)),
    await getPlaceDetails(provinceCode)
  ));
  const districts = getDistricts(allData);
  const filteredData = filterPlaces(allData, district, query, source);
  const total = filteredData.length;
  const totalPages = pageSize ? Math.max(Math.ceil(total / pageSize), 1) : 1;
  const normalizedPage = Math.min(page, totalPages);
  const data = pageSize
    ? filteredData.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)
    : filteredData;

  return NextResponse.json({
    data,
    districts,
    summaries: isSummary ? getProvincePlaceSummaries(allData) : undefined,
    page: normalizedPage,
    pageSize: pageSize ?? total,
    total,
    pagination: {
      page: normalizedPage,
      pageSize: pageSize ?? total,
      total,
      totalPages,
    },
    sources,
    source: storedPlaces.length ? 'supabase-cultural-places' : 'culture-province-places',
  });
}

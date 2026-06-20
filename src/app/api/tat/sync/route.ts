import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const TAT_API_BASE_URL = 'https://tatdataapi.io/api/v2';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const DEFAULT_MAX_PAGES = 1;
const UPSERT_CHUNK_SIZE = 100;

type TatSyncBody = {
  syncCategories?: boolean;
  syncSubCategories?: boolean;
  syncPlaces?: boolean;
  provinceCode?: string;
  provinceCodes?: string[];
  limit?: number;
  page?: number;
  maxPages?: number;
  dryRun?: boolean;
};

type TatCategory = {
  id?: number;
  categoryId?: number;
  name?: string | null;
};

type TatSubCategory = {
  id?: number;
  subCategoryId?: number;
  name?: string | null;
};

type TatPlace = {
  placeId?: number | string;
  status?: string | null;
  name?: string | null;
  introduction?: string | null;
  category?: {
    categoryId?: number;
    name?: string | null;
  } | null;
  subCategories?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
  subCategory?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: {
    address?: string | null;
    province?: {
      provinceId?: number;
      id?: number;
      name?: string | null;
    } | null;
    district?: {
      districtId?: number;
      id?: number;
      name?: string | null;
    } | null;
    subDistrict?: {
      subDistrictId?: number;
      id?: number;
      name?: string | null;
    } | null;
    postcode?: string | null;
  } | null;
  thumbnailUrl?: string[] | string | null;
  fullPathUrl?: string | null;
  googleMapUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  migrateId?: string | null;
  slug?: string | null;
};

type TatFetchResult = {
  ok: boolean;
  status: number;
  json: any;
};

function getTatApiKey() {
  return (process.env.TAT_DATA_API_KEY ?? process.env.NEXT_PRIVATE_TAT_DATA_API_KEY)?.trim();
}

function getLimit(value?: number | string | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
}

function getPositiveInteger(value: number | string | undefined | null, fallback: number) {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(Math.trunc(parsedValue), 1);
}

function normalizeText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').trim();
}

function toNumber(value?: number | string | null) {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const response = value as Record<string, unknown>;

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }
  }

  return [];
}

function getThumbnailUrls(place: TatPlace) {
  if (Array.isArray(place.thumbnailUrl)) {
    return place.thumbnailUrl.filter((url): url is string => Boolean(url));
  }

  return place.thumbnailUrl ? [place.thumbnailUrl] : [];
}

function getSubCategoryIds(place: TatPlace) {
  const subCategories = place.subCategories ?? place.subCategory ?? [];

  return subCategories
    .map((item) => item.id ?? item.subCategoryId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
}

function getProvinceCodes(body: TatSyncBody, request: NextRequest) {
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

  if (!requestedCodes.length) {
    return [];
  }

  const validCodes = new Set(provinces.map((province) => province.code));

  return Array.from(new Set(requestedCodes)).filter((provinceCode) => validCodes.has(provinceCode));
}

async function readSyncBody(request: NextRequest): Promise<TatSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as TatSyncBody;
  } catch {
    return {};
  }
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
    cache: 'no-store',
    headers: {
      'x-api-key': apiKey,
      'Accept-Language': 'th',
      Accept: 'application/json',
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    json: await response.json().catch(() => ({})),
  } satisfies TatFetchResult;
}

async function getTatProvinceIdByCode(provinceCode: string) {
  const province = provinces.find((item) => item.code === provinceCode);

  if (!province) {
    return null;
  }

  const provinceResponse = await tatFetch('/location/provinces');

  if (!provinceResponse.ok) {
    throw new Error(provinceResponse.json?.message ?? 'Failed to load TAT provinces');
  }

  const tatProvinces = getArray(provinceResponse.json);
  const targetProvinceName = normalizeText(province.name);
  const tatProvince = tatProvinces.find(
    (item: { id?: number; provinceId?: number; name?: string | null }) =>
      normalizeText(item.name) === targetProvinceName
  );

  return tatProvince?.provinceId ?? tatProvince?.id ?? null;
}

function mapCategory(category: TatCategory) {
  const id = category.id ?? category.categoryId;

  if (!id || !category.name) {
    return null;
  }

  return {
    id,
    name: category.name,
    payload: category,
    updated_at: new Date().toISOString(),
  };
}

function mapSubCategory(subCategory: TatSubCategory) {
  const id = subCategory.id ?? subCategory.subCategoryId;

  if (!id || !subCategory.name) {
    return null;
  }

  return {
    id,
    name: subCategory.name,
    payload: subCategory,
    updated_at: new Date().toISOString(),
  };
}

function mapPlace(place: TatPlace, provinceCodeByTatId: Map<number, string>) {
  const placeId = place.placeId == null ? '' : String(place.placeId);

  if (!placeId || !place.name) {
    return null;
  }

  const provinceId = place.location?.province?.provinceId ?? place.location?.province?.id ?? null;
  const categoryId = place.category?.categoryId ?? null;

  return {
    id: `tat-${placeId}`,
    place_id: placeId,
    name: place.name,
    status: place.status ?? '',
    slug: place.slug ?? null,
    province_code: provinceId ? provinceCodeByTatId.get(provinceId) ?? null : null,
    province_id: provinceId,
    province_name: place.location?.province?.name ?? null,
    district_id: place.location?.district?.districtId ?? place.location?.district?.id ?? null,
    district: place.location?.district?.name ?? '',
    sub_district_id:
      place.location?.subDistrict?.subDistrictId ?? place.location?.subDistrict?.id ?? null,
    sub_district: place.location?.subDistrict?.name ?? '',
    postcode: place.location?.postcode ?? null,
    address: place.location?.address ?? null,
    lat: toNumber(place.latitude),
    lng: toNumber(place.longitude),
    category_id: categoryId,
    category_name: place.category?.name ?? null,
    sub_category_ids: getSubCategoryIds(place),
    thumbnail_urls: getThumbnailUrls(place),
    source_url: place.fullPathUrl ?? null,
    map_url: place.googleMapUrl ?? null,
    payload: place,
    updated_at: new Date().toISOString(),
  };
}

async function upsertRows(tableName: string, rows: Record<string, unknown>[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.client.from(tableName).upsert(chunk, {
      onConflict: 'id',
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

async function syncCategories(dryRun: boolean) {
  const response = await tatFetch('/places/categories');
  const rows = getArray(response.json)
    .map((item) => mapCategory(item as TatCategory))
    .filter((row): row is NonNullable<ReturnType<typeof mapCategory>> => Boolean(row));

  if (dryRun || !response.ok || !rows.length) {
    return {
      table: 'place_categories',
      status: response.status,
      total: rows.length,
      upserted: 0,
      message: response.ok ? undefined : response.json?.message,
    };
  }

  const upsertResult = await upsertRows('place_categories', rows);

  return {
    table: 'place_categories',
    status: response.status,
    total: rows.length,
    upserted: upsertResult.ok ? rows.length : 0,
    message: upsertResult.ok ? undefined : upsertResult.error,
  };
}

async function syncSubCategories(dryRun: boolean) {
  const response = await tatFetch('/places/sub-categories');
  const rows = getArray(response.json)
    .map((item) => mapSubCategory(item as TatSubCategory))
    .filter((row): row is NonNullable<ReturnType<typeof mapSubCategory>> => Boolean(row));

  if (dryRun || !response.ok || !rows.length) {
    return {
      table: 'place_sub_categories',
      status: response.status,
      total: rows.length,
      upserted: 0,
      message: response.ok ? undefined : response.json?.message,
    };
  }

  const upsertResult = await upsertRows('place_sub_categories', rows);

  return {
    table: 'place_sub_categories',
    status: response.status,
    total: rows.length,
    upserted: upsertResult.ok ? rows.length : 0,
    message: upsertResult.ok ? undefined : upsertResult.error,
  };
}

async function getProvinceCodeByTatId(provinceCodes: string[]) {
  const provinceCodeByTatId = new Map<number, string>();

  if (!provinceCodes.length) {
    const provinceResponse = await tatFetch('/location/provinces');
    const tatProvinces = getArray(provinceResponse.json);
    const provinceCodeByName = new Map(
      provinces.map((province) => [normalizeText(province.name), province.code])
    );

    tatProvinces.forEach((province: { id?: number; provinceId?: number; name?: string | null }) => {
      const provinceId = province.provinceId ?? province.id;
      const provinceCode = provinceCodeByName.get(normalizeText(province.name));

      if (provinceId && provinceCode) {
        provinceCodeByTatId.set(provinceId, provinceCode);
      }
    });

    return provinceCodeByTatId;
  }

  for (const provinceCode of provinceCodes) {
    const tatProvinceId = await getTatProvinceIdByCode(provinceCode);

    if (tatProvinceId) {
      provinceCodeByTatId.set(tatProvinceId, provinceCode);
    }
  }

  return provinceCodeByTatId;
}

async function syncPlaces(options: {
  dryRun: boolean;
  page: number;
  limit: number;
  maxPages: number;
  provinceCodes: string[];
}) {
  const provinceCodeByTatId = await getProvinceCodeByTatId(options.provinceCodes);
  const provinceIds = Array.from(provinceCodeByTatId.keys());
  const rows: NonNullable<ReturnType<typeof mapPlace>>[] = [];
  const pages: Array<{ page: number; status: number; total: number; mapped: number; message?: string }> = [];

  for (const provinceId of provinceIds.length ? provinceIds : [null]) {
    for (let pageIndex = 0; pageIndex < options.maxPages; pageIndex += 1) {
      const page = options.page + pageIndex;
      const response = await tatFetch('/places', {
        page,
        limit: options.limit,
        status: 'approved',
        has_name: 'true',
        ...(provinceId ? { province_id: provinceId } : {}),
      });

      if (!response.ok) {
        pages.push({
          page,
          status: response.status,
          total: 0,
          mapped: 0,
          message: response.json?.message,
        });
        break;
      }

      const items = getArray(response.json);
      const mappedRows = items
        .map((item) => mapPlace(item as TatPlace, provinceCodeByTatId))
        .filter((row): row is NonNullable<ReturnType<typeof mapPlace>> => Boolean(row));

      rows.push(...mappedRows);
      pages.push({
        page,
        status: response.status,
        total: items.length,
        mapped: mappedRows.length,
      });

      if (items.length < options.limit) {
        break;
      }
    }
  }

  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());

  if (options.dryRun || !uniqueRows.length) {
    return {
      table: 'places',
      total: uniqueRows.length,
      upserted: 0,
      pages,
    };
  }

  const upsertResult = await upsertRows('places', uniqueRows);

  return {
    table: 'places',
    total: uniqueRows.length,
    upserted: upsertResult.ok ? uniqueRows.length : 0,
    pages,
    message: upsertResult.ok ? undefined : upsertResult.error,
  };
}

async function handleSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun);
  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const page = getPositiveInteger(body.page ?? request.nextUrl.searchParams.get('page'), 1);
  const maxPages = getPositiveInteger(
    body.maxPages ?? request.nextUrl.searchParams.get('maxPages'),
    DEFAULT_MAX_PAGES
  );
  const provinceCodes = getProvinceCodes(body, request);
  const syncCategoriesFlag =
    body.syncCategories ?? request.nextUrl.searchParams.get('syncCategories') !== 'false';
  const syncSubCategoriesFlag =
    body.syncSubCategories ?? request.nextUrl.searchParams.get('syncSubCategories') !== 'false';
  const syncPlacesFlag = body.syncPlaces ?? request.nextUrl.searchParams.get('syncPlaces') !== 'false';
  const results = [];

  if (syncCategoriesFlag) {
    results.push(await syncCategories(Boolean(dryRun)));
  }

  if (syncSubCategoriesFlag) {
    results.push(await syncSubCategories(Boolean(dryRun)));
  }

  if (syncPlacesFlag) {
    results.push(
      await syncPlaces({
        dryRun: Boolean(dryRun),
        page,
        limit,
        maxPages,
        provinceCodes,
      })
    );
  }

  const failedResults = results.filter((result) => result.message);
  const status = failedResults.length ? 500 : 200;

  return NextResponse.json(
    {
      dryRun: Boolean(dryRun),
      provinceCodes,
      limit,
      page,
      maxPages,
      results,
    },
    { status }
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleSync(request, { defaultDryRun: true });
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TAT_API_BASE_URL = 'https://tatdataapi.io/api/v2';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const DEFAULT_MAX_PAGES = 5;
const UPSERT_CHUNK_SIZE = 500;

const TAT_ROUTES_TABLE = process.env.TAT_ROUTES_TABLE ?? 'tat_routes';
const TAT_ROUTE_PLACES_TABLE = process.env.TAT_ROUTE_PLACES_TABLE ?? 'tat_route_places';
const TAT_ARTICLE_TYPES_TABLE = process.env.TAT_ARTICLE_TYPES_TABLE ?? 'tat_article_types';
const TAT_ARTICLES_TABLE = process.env.TAT_ARTICLES_TABLE ?? 'tat_articles';

type TatRoutesArticlesSyncBody = {
  syncRoutes?: boolean;
  syncRoutePlaces?: boolean;
  syncArticleTypes?: boolean;
  syncArticles?: boolean;
  limit?: number;
  page?: number;
  maxPages?: number;
  dryRun?: boolean;
};

type SyncResult = {
  table: string;
  endpoint: string;
  total: number;
  upserted: number;
  pages?: Array<{ page: number; status: number; total: number; message?: string }>;
  message?: string;
};

function getTatApiKey() {
  return (process.env.TAT_DATA_API_KEY ?? process.env.NEXT_PRIVATE_TAT_DATA_API_KEY)?.trim();
}

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function getPositiveInteger(value: number | string | undefined | null, fallback: number) {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(Math.trunc(parsedValue), 1);
}

function getLimit(value: number | string | undefined | null) {
  const parsedValue = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), MAX_LIMIT);
}

function cleanText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();

  return text ? text : null;
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

    if (Array.isArray(response.results)) {
      return response.results;
    }
  }

  return [];
}

function getStringField(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(payload[key]);

    if (value) {
      return value;
    }
  }

  return null;
}

function getStableId(prefix: string, payload: Record<string, unknown>, keys: string[]) {
  const id = getStringField(payload, keys);

  if (id) {
    return `${prefix}-${id}`;
  }

  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);

  return `${prefix}-${hash}`;
}

async function readSyncBody(request: NextRequest): Promise<TatRoutesArticlesSyncBody> {
  if (request.method !== 'POST') {
    return {};
  }

  try {
    return (await request.json()) as TatRoutesArticlesSyncBody;
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
      json: { message: 'Missing TAT_DATA_API_KEY' },
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
  };
}

async function fetchPaged(pathname: string, options: { page: number; limit: number; maxPages: number }) {
  const rows: Record<string, unknown>[] = [];
  const pages: Array<{ page: number; status: number; total: number; message?: string }> = [];

  for (let pageIndex = 0; pageIndex < options.maxPages; pageIndex += 1) {
    const page = options.page + pageIndex;
    const response = await tatFetch(pathname, {
      page,
      limit: options.limit,
    });

    if (!response.ok) {
      pages.push({
        page,
        status: response.status,
        total: 0,
        message: response.json?.message,
      });
      break;
    }

    const items = getArray(response.json) as Record<string, unknown>[];

    rows.push(...items);
    pages.push({ page, status: response.status, total: items.length });

    if (items.length < options.limit) {
      break;
    }
  }

  return { rows, pages };
}

async function upsertRows(tableName: string, rows: Record<string, unknown>[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.client.from(tableName).upsert(chunk, { onConflict: 'id' });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

function mapRoute(payload: Record<string, unknown>, now: string) {
  const routeId = getStringField(payload, ['routeId', 'route_id', 'id']);
  const slug = getStringField(payload, ['slug']);

  return {
    id: getStableId('tat-route', payload, ['routeId', 'route_id', 'id', 'slug']),
    route_id: routeId,
    slug,
    title: getStringField(payload, ['title', 'name', 'routeName']),
    description: getStringField(payload, ['description', 'introduction', 'detail']),
    payload,
    updated_at: now,
  };
}

function mapRoutePlace(routeId: string, payload: Record<string, unknown>, now: string) {
  const placeId = getStringField(payload, ['placeId', 'place_id', 'id']);

  return {
    id: getStableId(`tat-route-place-${routeId}`, payload, ['placeId', 'place_id', 'id', 'slug']),
    route_id: routeId,
    place_id: placeId,
    title: getStringField(payload, ['title', 'name', 'placeName']),
    payload,
    updated_at: now,
  };
}

function mapArticleType(payload: Record<string, unknown>, now: string) {
  const typeId = getStringField(payload, ['typeId', 'type_id', 'id']);

  return {
    id: getStableId('tat-article-type', payload, ['typeId', 'type_id', 'id', 'slug']),
    type_id: typeId,
    slug: getStringField(payload, ['slug']),
    title: getStringField(payload, ['title', 'name', 'typeName']),
    payload,
    updated_at: now,
  };
}

function mapArticle(payload: Record<string, unknown>, now: string) {
  const typePayload =
    payload.type && typeof payload.type === 'object' ? (payload.type as Record<string, unknown>) : {};

  return {
    id: getStableId('tat-article', payload, ['articleId', 'article_id', 'id', 'slug']),
    article_id: getStringField(payload, ['articleId', 'article_id', 'id']),
    slug: getStringField(payload, ['slug']),
    title: getStringField(payload, ['title', 'name']),
    type_id:
      getStringField(payload, ['typeId', 'type_id']) ??
      getStringField(typePayload, ['typeId', 'type_id', 'id']),
    type_slug: getStringField(payload, ['typeSlug', 'type_slug']) ?? getStringField(typePayload, ['slug']),
    payload,
    updated_at: now,
  };
}

async function syncRoutes(options: {
  dryRun: boolean;
  page: number;
  limit: number;
  maxPages: number;
  syncRoutePlaces: boolean;
}) {
  const now = new Date().toISOString();
  const { rows, pages } = await fetchPaged('/routes', options);
  const routeRows = Array.from(new Map(rows.map((row) => {
    const mappedRow = mapRoute(row, now);

    return [mappedRow.id, mappedRow];
  })).values());
  const results: SyncResult[] = [];

  if (!options.dryRun && routeRows.length) {
    const upsertResult = await upsertRows(TAT_ROUTES_TABLE, routeRows);

    results.push({
      table: TAT_ROUTES_TABLE,
      endpoint: '/api/v2/routes',
      total: routeRows.length,
      upserted: upsertResult.ok ? routeRows.length : 0,
      pages,
      message: upsertResult.ok ? undefined : upsertResult.error,
    });
  } else {
    results.push({
      table: TAT_ROUTES_TABLE,
      endpoint: '/api/v2/routes',
      total: routeRows.length,
      upserted: 0,
      pages,
    });
  }

  if (options.syncRoutePlaces) {
    const routePlaceRows: Record<string, unknown>[] = [];
    const routePlacesPages: SyncResult['pages'] = [];

    for (const route of routeRows) {
      const routeId = route.route_id ?? route.id.replace(/^tat-route-/, '');
      const response = await tatFetch(`/routes/places/${routeId}`);

      if (!response.ok) {
        routePlacesPages?.push({
          page: 1,
          status: response.status,
          total: 0,
          message: response.json?.message,
        });
        continue;
      }

      const items = getArray(response.json) as Record<string, unknown>[];

      routePlacesPages?.push({ page: 1, status: response.status, total: items.length });
      routePlaceRows.push(...items.map((item) => mapRoutePlace(String(routeId), item, now)));
    }

    const uniqueRoutePlaceRows = Array.from(
      new Map(routePlaceRows.map((row) => [String(row.id), row])).values()
    );

    if (!options.dryRun && uniqueRoutePlaceRows.length) {
      const upsertResult = await upsertRows(TAT_ROUTE_PLACES_TABLE, uniqueRoutePlaceRows);

      results.push({
        table: TAT_ROUTE_PLACES_TABLE,
        endpoint: '/api/v2/routes/places/{id}',
        total: uniqueRoutePlaceRows.length,
        upserted: upsertResult.ok ? uniqueRoutePlaceRows.length : 0,
        pages: routePlacesPages,
        message: upsertResult.ok ? undefined : upsertResult.error,
      });
    } else {
      results.push({
        table: TAT_ROUTE_PLACES_TABLE,
        endpoint: '/api/v2/routes/places/{id}',
        total: uniqueRoutePlaceRows.length,
        upserted: 0,
        pages: routePlacesPages,
      });
    }
  }

  return results;
}

async function syncArticleTypes(dryRun: boolean) {
  const now = new Date().toISOString();
  const response = await tatFetch('/articles/types');
  const rows = getArray(response.json).map((item) => mapArticleType(item as Record<string, unknown>, now));
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());

  if (dryRun || !response.ok || !uniqueRows.length) {
    return {
      table: TAT_ARTICLE_TYPES_TABLE,
      endpoint: '/api/v2/articles/types',
      total: uniqueRows.length,
      upserted: 0,
      message: response.ok ? undefined : response.json?.message,
    };
  }

  const upsertResult = await upsertRows(TAT_ARTICLE_TYPES_TABLE, uniqueRows);

  return {
    table: TAT_ARTICLE_TYPES_TABLE,
    endpoint: '/api/v2/articles/types',
    total: uniqueRows.length,
    upserted: upsertResult.ok ? uniqueRows.length : 0,
    message: upsertResult.ok ? undefined : upsertResult.error,
  };
}

async function syncArticles(options: { dryRun: boolean; page: number; limit: number; maxPages: number }) {
  const now = new Date().toISOString();
  const { rows, pages } = await fetchPaged('/articles', options);
  const articleRows = Array.from(
    new Map(
      rows.map((row) => {
        const mappedRow = mapArticle(row, now);

        return [mappedRow.id, mappedRow];
      })
    ).values()
  );

  if (options.dryRun || !articleRows.length) {
    return {
      table: TAT_ARTICLES_TABLE,
      endpoint: '/api/v2/articles',
      total: articleRows.length,
      upserted: 0,
      pages,
    };
  }

  const upsertResult = await upsertRows(TAT_ARTICLES_TABLE, articleRows);

  return {
    table: TAT_ARTICLES_TABLE,
    endpoint: '/api/v2/articles',
    total: articleRows.length,
    upserted: upsertResult.ok ? articleRows.length : 0,
    pages,
    message: upsertResult.ok ? undefined : upsertResult.error,
  };
}

async function handleSync(request: NextRequest, options?: { defaultDryRun?: boolean }) {
  const body = await readSyncBody(request);
  const dryRunParam = request.nextUrl.searchParams.get('dryRun');
  const dryRun = Boolean(
    body.dryRun ?? (dryRunParam ? dryRunParam === 'true' : options?.defaultDryRun)
  );

  if (!dryRun) {
    const auth = await verifyAdminAccessToken(
      getBearerToken(request),
      ADMIN_PERMISSION.culturalPlaces
    );

    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }
  }

  const limit = getLimit(body.limit ?? request.nextUrl.searchParams.get('limit'));
  const page = getPositiveInteger(body.page ?? request.nextUrl.searchParams.get('page'), 1);
  const maxPages = getPositiveInteger(
    body.maxPages ?? request.nextUrl.searchParams.get('maxPages'),
    DEFAULT_MAX_PAGES
  );
  const syncRoutesFlag =
    body.syncRoutes ?? request.nextUrl.searchParams.get('syncRoutes') !== 'false';
  const syncRoutePlacesFlag =
    body.syncRoutePlaces ?? request.nextUrl.searchParams.get('syncRoutePlaces') !== 'false';
  const syncArticleTypesFlag =
    body.syncArticleTypes ?? request.nextUrl.searchParams.get('syncArticleTypes') !== 'false';
  const syncArticlesFlag =
    body.syncArticles ?? request.nextUrl.searchParams.get('syncArticles') !== 'false';
  const results: SyncResult[] = [];

  if (syncRoutesFlag) {
    results.push(
      ...(await syncRoutes({
        dryRun,
        page,
        limit,
        maxPages,
        syncRoutePlaces: syncRoutePlacesFlag,
      }))
    );
  }

  if (syncArticleTypesFlag) {
    results.push(await syncArticleTypes(dryRun));
  }

  if (syncArticlesFlag) {
    results.push(await syncArticles({ dryRun, page, limit, maxPages }));
  }

  const failedResults = results.filter((result) => result.message);
  const totalUpserted = results.reduce((total, result) => total + result.upserted, 0);

  return NextResponse.json(
    {
      dryRun,
      limit,
      page,
      maxPages,
      total: totalUpserted,
      upserted: totalUpserted,
      results,
    },
    { status: failedResults.length ? 500 : 200 }
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

'use server';

import type { CategoryRow, CategoryFormInput } from './types';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = 'place_sub_categories';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const TAT_PLACES_TABLE = process.env.TAT_PLACES_TABLE ?? 'places';

type PlaceSubCategoryRow = {
  id: number;
  name: string;
  payload?: Record<string, any> | null;
  updated_at?: string | null;
};

type CulturalPlaceCategoryRow = {
  category?: string | null;
  source?: string | null;
};

type TatPlaceCategoryRow = {
  category_id?: number | null;
  category_name?: string | null;
  sub_category_ids?: number[] | null;
  payload?: {
    subCategories?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
    subCategory?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
  } | null;
};

type ActionError = {
  ok: false;
  status: number;
  message: string;
};

type ActionSuccess<T> = {
  ok: true;
  data: T;
};

function getAdminPayload(payload: Record<string, any>) {
  return payload.admin && typeof payload.admin === 'object'
    ? (payload.admin as Record<string, any>)
    : payload;
}

function getSourceValue(payload: Record<string, any>) {
  if (typeof payload.source === 'string') {
    return payload.source;
  }

  if (typeof payload.provider === 'string') {
    return payload.provider;
  }

  return 'tat';
}

function getSourceLabel(source: string, payload: Record<string, any>) {
  if (typeof payload.sourceLabel === 'string') {
    return payload.sourceLabel;
  }

  if (source === 'tat') {
    return 'ททท.';
  }

  return source;
}

function toCategoryRow(row: PlaceSubCategoryRow): CategoryRow {
  const payload = row.payload ?? {};
  const adminPayload = getAdminPayload(payload);
  const source = getSourceValue(payload);

  return {
    category_key: `${row.id}`,
    label: row.name,
    description: typeof adminPayload.description === 'string' ? adminPayload.description : null,
    color: typeof adminPayload.color === 'string' ? adminPayload.color : '#608D8C',
    icon: typeof adminPayload.icon === 'string' ? adminPayload.icon : null,
    image_url: typeof adminPayload.imageUrl === 'string' ? adminPayload.imageUrl : null,
    sort_order: typeof adminPayload.sortOrder === 'number' ? adminPayload.sortOrder : row.id,
    is_active: typeof adminPayload.isActive === 'boolean' ? adminPayload.isActive : true,
    source,
    source_label: getSourceLabel(source, payload),
    updated_at: row.updated_at,
  };
}

function getSystemCategoryRows(): CategoryRow[] {
  return [];
}

const CULTURE_CATEGORY_LABELS: Record<string, string> = {
  community_wisdom: 'ภูมิปัญญาชุมชน',
  craftsmanship: 'งานช่างฝีมือ',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  folk_art: 'ศิลปะพื้นบ้าน',
  learning_center: 'แหล่งเรียนรู้',
  local_food: 'อาหารพื้นบ้าน',
  local_tradition: 'ประเพณีท้องถิ่น',
  moral_community: 'ชุมชนคุณธรรม',
  museum: 'พิพิธภัณฑ์',
  performing_art: 'ศิลปะการแสดง',
  ritual: 'พิธีกรรม',
  temple: 'ศาสนสถาน',
  tourist_attraction: 'สถานที่ท่องเที่ยว',
};

function getCultureCategoryLabel(categoryKey: string) {
  return CULTURE_CATEGORY_LABELS[categoryKey] ?? categoryKey;
}

function getHashColor(value: string) {
  const palette = [
    '#608D8C',
    '#D19F46',
    '#CE7B48',
    '#947488',
    '#5B7B91',
    '#AB8395',
    '#B2865A',
    '#8F3D20',
    '#C89B3C',
    '#5A6F8F',
  ];
  const hash = Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return palette[hash % palette.length] ?? '#608D8C';
}

function getSourceDisplayLabel(source: string) {
  if (source === 'tat') {
    return 'ททท.';
  }

  if (source === 'culture_catalog') {
    return 'บัญชีข้อมูลวัฒนธรรม';
  }

  if (source.startsWith('finearts')) {
    return 'กรมศิลป์';
  }

  if (source === 'thailand_cultural_hub') {
    return 'Thailand Cultural Hub';
  }

  return source || 'ไม่ระบุแหล่งที่มา';
}

function buildActualCulturalCategoryRows(rows: CulturalPlaceCategoryRow[]): CategoryRow[] {
  const categoryMap = new Map<string, { count: number; source: string; category: string }>();

  rows.forEach((row) => {
    const category = row.category?.trim();
    const source = row.source?.trim() || 'unknown';

    if (!category) {
      return;
    }

    const key = `cultural_places:${source}:${category}`;
    const item = categoryMap.get(key) ?? { count: 0, source, category };

    item.count += 1;
    categoryMap.set(key, item);
  });

  return Array.from(categoryMap, ([key, item], index) => ({
    category_key: key,
    label: getCultureCategoryLabel(item.category),
    color:
      getHashColor(item.category),
    sort_order: 1000 + index,
    is_active: true,
    source: `cultural_places:${item.source}`,
    source_label: `${getSourceDisplayLabel(item.source)} / cultural_places`,
    count: item.count,
    editable: false,
  })).sort((first, second) =>
    `${first.source_label}${first.label}`.localeCompare(`${second.source_label}${second.label}`, 'th')
  );
}

function getTatSubCategories(row: TatPlaceCategoryRow) {
  return row.payload?.subCategories ?? row.payload?.subCategory ?? [];
}

function buildTatCategoryRows(rows: TatPlaceCategoryRow[]): CategoryRow[] {
  const categoryMap = new Map<string, { label: string; count: number }>();
  const subCategoryMap = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    if (row.category_id && row.category_name) {
      const key = `tat:category:${row.category_id}`;
      const item = categoryMap.get(key) ?? { label: row.category_name, count: 0 };

      item.count += 1;
      categoryMap.set(key, item);
    }

    getTatSubCategories(row).forEach((subCategory) => {
      const id = subCategory.id ?? subCategory.subCategoryId;
      const label = subCategory.name?.trim();

      if (!id || !label) {
        return;
      }

      const key = `tat:sub-category:${id}`;
      const item = subCategoryMap.get(key) ?? { label, count: 0 };

      item.count += 1;
      subCategoryMap.set(key, item);
    });
  });

  return [
    ...Array.from(categoryMap, ([key, item], index) => ({
      category_key: key,
      label: item.label,
      color: '#608D8C',
      sort_order: 2000 + index,
      is_active: true,
      source: 'tat_category',
      source_label: 'ททท. / category',
      count: item.count,
      editable: false,
    })),
    ...Array.from(subCategoryMap, ([key, item], index) => ({
      category_key: key,
      label: item.label,
      color: '#608D8C',
      sort_order: 3000 + index,
      is_active: true,
      source: 'tat_sub_category',
      source_label: 'ททท. / sub-category',
      count: item.count,
      editable: false,
    })),
  ];
}

function parseCategoryId(value: unknown) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

async function verifyAdminAccess(accessToken: string): Promise<ActionError | null> {
  const result = await verifyAdminAccessToken(accessToken, ADMIN_PERMISSION.categories);

  if (!result.ok) {
    return { ok: false, status: result.status, message: result.message };
  }

  return null;
}

function getAdminClient() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  return { ok: true as const, client: supabase.client };
}

export async function getCategoriesAction(
  accessToken: string
): Promise<ActionSuccess<CategoryRow[]> | ActionError> {
  const authError = await verifyAdminAccess(accessToken);

  if (authError) {
    return authError;
  }

  const supabase = getAdminClient();

  if (!supabase.ok) {
    return { ok: false, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('id, name, payload, updated_at')
    .order('id', { ascending: true });

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  const sourceCategoryRows = ((data ?? []) as PlaceSubCategoryRow[])
    .map(toCategoryRow)
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));

  const { data: culturalPlaceRows } = await supabase.client
    .from(CULTURAL_PLACES_TABLE)
    .select('category, source')
    .limit(50000);
  const { data: tatPlaceRows } = await supabase.client
    .from(TAT_PLACES_TABLE)
    .select('category_id, category_name, sub_category_ids, payload')
    .limit(50000);

  return {
    ok: true,
    data: [
      ...getSystemCategoryRows(),
      ...buildActualCulturalCategoryRows((culturalPlaceRows ?? []) as CulturalPlaceCategoryRow[]),
      ...buildTatCategoryRows((tatPlaceRows ?? []) as TatPlaceCategoryRow[]),
      ...sourceCategoryRows.map((row) => ({
        ...row,
        source_label: row.source_label ?? 'ททท. / synced sub-category',
      })),
    ],
  };
}

export async function saveCategoryAction(
  accessToken: string,
  input: CategoryFormInput
): Promise<ActionSuccess<CategoryRow> | ActionError> {
  const authError = await verifyAdminAccess(accessToken);

  if (authError) {
    return authError;
  }

  const categoryId = parseCategoryId(input.categoryKey);

  if (!categoryId) {
    return { ok: false, status: 400, message: 'numeric categoryKey is required' };
  }

  const supabase = getAdminClient();

  if (!supabase.ok) {
    return { ok: false, status: 500, message: supabase.error };
  }

  const { data: existingRow, error: existingError } = await supabase.client
    .from(TABLE_NAME)
    .select('id, name, payload, updated_at')
    .eq('id', categoryId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, status: 500, message: existingError.message };
  }

  if (!existingRow) {
    return {
      ok: false,
      status: 404,
      message: 'Category must come from the source sync before it can be edited',
    };
  }

  const existingCategory = existingRow as PlaceSubCategoryRow;
  const payload = existingCategory.payload ?? {};
  const sortOrder = Number(input.sortOrder);
  const row: PlaceSubCategoryRow = {
    id: categoryId,
    name: existingCategory.name,
    payload: {
      ...payload,
      admin: {
        description: input.description?.trim() || null,
        color: input.color?.trim() || '#608D8C',
        icon: input.icon?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : categoryId,
        isActive: input.isActive ?? true,
      },
    },
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .upsert(row, { onConflict: 'id' })
    .select('id, name, payload, updated_at')
    .single();

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  return { ok: true, data: toCategoryRow(data as PlaceSubCategoryRow) };
}

export async function deleteCategoryAction(
  accessToken: string,
  categoryKey: string
): Promise<ActionSuccess<{ ok: true }> | ActionError> {
  const authError = await verifyAdminAccess(accessToken);

  if (authError) {
    return authError;
  }

  const categoryId = parseCategoryId(categoryKey);

  if (!categoryId) {
    return { ok: false, status: 400, message: 'numeric categoryKey is required' };
  }

  return {
    ok: false,
    status: 405,
    message: 'Categories are source data and cannot be deleted from admin',
  };
}

'use server';

import type { CategoryRow, CategoryFormInput } from './types';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

import {
  CULTURE_CATEGORY_COLORS,
  CULTURE_CATEGORY_LABELS,
} from 'src/sections/province/province-data';

const TABLE_NAME = 'place_sub_categories';
const SYSTEM_SOURCE = 'system';

type PlaceSubCategoryRow = {
  id: number;
  name: string;
  payload?: Record<string, any> | null;
  updated_at?: string | null;
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
  return Object.entries(CULTURE_CATEGORY_LABELS).map(([categoryKey, label], index) => ({
    category_key: categoryKey,
    label,
    color: CULTURE_CATEGORY_COLORS[categoryKey as keyof typeof CULTURE_CATEGORY_COLORS],
    sort_order: index,
    is_active: true,
    source: SYSTEM_SOURCE,
    source_label: 'Thailand Cultural Hub',
  }));
}

function parseCategoryId(value: unknown) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

async function verifyAdminAccess(accessToken: string): Promise<ActionError | null> {
  if (!accessToken) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false, status: 500, message: supabase.error };
  }

  const { error } = await supabase.client.auth.getUser(accessToken);

  if (error) {
    return { ok: false, status: 401, message: 'Unauthorized' };
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

  return {
    ok: true,
    data: [...getSystemCategoryRows(), ...sourceCategoryRows],
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

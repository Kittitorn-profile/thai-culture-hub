import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = 'place_sub_categories';

type CulturalCategoryRow = {
  category_key: string;
  label: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  source?: string | null;
  source_label?: string | null;
  updated_at?: string | null;
};

type PlaceSubCategoryRow = {
  id: number;
  name: string;
  payload?: Record<string, any> | null;
  updated_at?: string | null;
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

function toCategoryRow(row: PlaceSubCategoryRow): CulturalCategoryRow {
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

function getSystemCategoryRows(): CulturalCategoryRow[] {
  return [];
}

function parseCategoryId(value: unknown) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.categories))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error, data: [] });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('id, name, payload, updated_at')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message, data: [] });
  }

  const sourceCategoryRows = ((data ?? []) as PlaceSubCategoryRow[])
    .map(toCategoryRow)
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));

  return NextResponse.json({
    data: [...getSystemCategoryRows(), ...sourceCategoryRows],
  });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.categories))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    categoryKey?: string;
    label?: string;
    description?: string;
    color?: string;
    icon?: string;
    imageUrl?: string;
    sortOrder?: number | string;
    isActive?: boolean;
  };
  const categoryId = parseCategoryId(body.categoryKey);

  if (!categoryId) {
    return NextResponse.json({ message: 'numeric categoryKey is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data: existingRow, error: existingError } = await supabase.client
    .from(TABLE_NAME)
    .select('id, name, payload, updated_at')
    .eq('id', categoryId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ message: existingError.message }, { status: 500 });
  }

  if (!existingRow) {
    return NextResponse.json(
      { message: 'Category must come from the source sync before it can be edited' },
      { status: 404 }
    );
  }

  const existingCategory = existingRow as PlaceSubCategoryRow;
  const payload = existingCategory.payload ?? {};
  const sortOrder = Number(body.sortOrder);
  const row: PlaceSubCategoryRow = {
    id: categoryId,
    name: existingCategory.name,
    payload: {
      ...payload,
      admin: {
        description: body.description?.trim() || null,
        color: body.color?.trim() || '#608D8C',
        icon: body.icon?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : categoryId,
        isActive: body.isActive ?? true,
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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: toCategoryRow(data as PlaceSubCategoryRow) });
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.categories))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const categoryId = parseCategoryId(request.nextUrl.searchParams.get('categoryKey'));

  if (!categoryId) {
    return NextResponse.json({ message: 'numeric categoryKey is required' }, { status: 400 });
  }

  return NextResponse.json(
    { message: 'Categories are source data and cannot be deleted from admin' },
    { status: 405 }
  );
}

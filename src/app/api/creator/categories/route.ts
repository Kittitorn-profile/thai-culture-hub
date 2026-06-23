import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

export const runtime = 'nodejs';

type PlaceSubCategoryRow = {
  id: number;
  name: string;
  payload?: Record<string, any> | null;
};

function getAdminPayload(payload: Record<string, any>) {
  return payload.admin && typeof payload.admin === 'object'
    ? (payload.admin as Record<string, any>)
    : payload;
}

function mapCategory(row: PlaceSubCategoryRow) {
  const payload = row.payload ?? {};
  const adminPayload = getAdminPayload(payload);

  return {
    key: `${row.id}`,
    label: row.name,
    description: typeof adminPayload.description === 'string' ? adminPayload.description : '',
    color: typeof adminPayload.color === 'string' ? adminPayload.color : '#608D8C',
    sortOrder: typeof adminPayload.sortOrder === 'number' ? adminPayload.sortOrder : row.id,
    isActive: typeof adminPayload.isActive === 'boolean' ? adminPayload.isActive : true,
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error });
  }

  const { data, error } = await supabase.client
    .from('place_sub_categories')
    .select('id, name, payload')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ data: [], message: error.message });
  }

  const categories = ((data ?? []) as PlaceSubCategoryRow[])
    .map(mapCategory)
    .filter((category) => category.isActive)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  return NextResponse.json({ data: categories });
}

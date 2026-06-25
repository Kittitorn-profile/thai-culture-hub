import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import {
  getCultureCategoryLabel,
  getCultureCategoryHashColor,
} from 'src/lib/culture-categories';

const CONFIG_TABLE = process.env.CULTURAL_CATEGORIES_TABLE ?? 'cultural_categories';
const PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';

type CategoryConfigRow = {
  key: string;
  label?: string | null;
  color?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type CulturalPlaceCategoryRow = {
  category?: string | null;
};

function toConfigItem(row: CategoryConfigRow, count?: number) {
  return {
    key: row.key,
    label: row.label || getCultureCategoryLabel(row.key),
    color: row.color || getCultureCategoryHashColor(row.key),
    icon: row.icon ?? null,
    imageUrl: row.image_url ?? null,
    sortOrder: row.sort_order ?? null,
    count: count ?? null,
  };
}

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error });
  }

  const { data: placeRows } = await supabase.client
    .from(PLACES_TABLE)
    .select('category')
    .limit(50000);
  const categoryCounts = new Map<string, number>();

  ((placeRows ?? []) as CulturalPlaceCategoryRow[]).forEach((row) => {
    const category = row.category?.trim();

    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  });

  const { data: configRows, error } = await supabase.client
    .from(CONFIG_TABLE)
    .select('key, label, color, icon, image_url, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!error && Array.isArray(configRows) && configRows.length) {
    const configuredItems = (configRows as CategoryConfigRow[]).map((row) =>
      toConfigItem(row, categoryCounts.get(row.key))
    );
    const configuredKeys = new Set(configuredItems.map((item) => item.key));
    const missingItems = Array.from(categoryCounts, ([key, count]) => ({ key, count }))
      .filter((item) => !configuredKeys.has(item.key))
      .map(({ key, count }) =>
        toConfigItem({ key, label: getCultureCategoryLabel(key), color: getCultureCategoryHashColor(key) }, count)
      );

    return NextResponse.json({ data: [...configuredItems, ...missingItems] });
  }

  return NextResponse.json({
    data: Array.from(categoryCounts, ([key, count]) =>
      toConfigItem({ key, label: getCultureCategoryLabel(key), color: getCultureCategoryHashColor(key) }, count)
    ).sort((first, second) => first.label.localeCompare(second.label, 'th')),
  });
}

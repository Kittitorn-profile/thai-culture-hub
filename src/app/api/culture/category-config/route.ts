import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

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

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  community_wisdom: 'ภูมิปัญญาชุมชน',
  costume: 'ผ้าและเครื่องแต่งกาย',
  craftsmanship: 'งานช่างฝีมือ',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  ethnic_group: 'กลุ่มชาติพันธุ์',
  folk_art: 'ศิลปะพื้นบ้าน',
  heritage: 'โบราณสถานและมรดกทางวัฒนธรรม',
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

function toConfigItem(row: CategoryConfigRow, count?: number) {
  return {
    key: row.key,
    label: row.label || DEFAULT_CATEGORY_LABELS[row.key] || row.key,
    color: row.color || getHashColor(row.key),
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
      .map(({ key, count }) => toConfigItem({ key, label: key, color: getHashColor(key) }, count));

    return NextResponse.json({ data: [...configuredItems, ...missingItems] });
  }

  return NextResponse.json({
    data: Array.from(categoryCounts, ([key, count]) =>
      toConfigItem({ key, label: key, color: getHashColor(key) }, count)
    ).sort((first, second) => first.label.localeCompare(second.label, 'th')),
  });
}

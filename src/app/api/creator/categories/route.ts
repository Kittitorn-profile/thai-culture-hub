import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import {
  SYSTEM_CULTURE_CATEGORIES,
  getCultureCategoryLabel,
  getSystemCultureCategoryKey,
  getCultureCategoryHashColor,
  normalizeCultureCategoryLabel,
  CULTURE_CATEGORY_KEY_BY_NORMALIZED_LABEL,
} from 'src/lib/culture-categories';

export const runtime = 'nodejs';

const TABLE_NAME = 'place_sub_categories';
const CULTURAL_PLACES_TABLE = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
const TAT_PLACES_TABLE = process.env.TAT_PLACES_TABLE ?? 'places';

type PlaceSubCategoryRow = {
  id: number;
  name: string;
  payload?: Record<string, any> | null;
  updated_at?: string | null;
};

type CreatorArticleCategoryRow = {
  category_key?: string | null;
  category_label?: string | null;
};

type CategoryRow = {
  category_key: string;
  label: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  source?: string | null;
  source_label?: string | null;
  count?: number | null;
};

type CulturalPlaceCategoryRow = {
  category?: string | null;
  source?: string | null;
};

type TatPlaceCategoryRow = {
  category_id?: number | null;
  category_name?: string | null;
  payload?: {
    subCategories?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
    subCategory?: Array<{ id?: number; subCategoryId?: number; name?: string | null }> | null;
  } | null;
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
    sort_order: typeof adminPayload.sortOrder === 'number' ? adminPayload.sortOrder : row.id,
    is_active: typeof adminPayload.isActive === 'boolean' ? adminPayload.isActive : true,
    source,
    source_label: getSourceLabel(source, payload),
  };
}

function getSystemCategoryRows(): CategoryRow[] {
  return SYSTEM_CULTURE_CATEGORIES.map((category, index) => ({
    category_key: category.key,
    label: category.label,
    color: getCultureCategoryHashColor(category.key),
    sort_order: index,
    is_active: true,
    source: 'culture_category',
    source_label: 'หมวดวัฒนธรรมของระบบ',
  }));
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
  if (source === 'tat') return 'ททท.';
  if (source === 'culture_catalog') return 'บัญชีข้อมูลวัฒนธรรม';
  if (source === 'religious_places') return 'ศาสนสถาน';
  if (source === 'cpot_products') return 'ผลิตภัณฑ์วัฒนธรรมไทย';
  if (source === 'thai_fabric_wisdom') return 'มรดกภูมิปัญญาผ้าไทย';
  if (source === 'ethnic_groups') return 'กลุ่มชาติพันธุ์';
  if (source.startsWith('finearts')) return 'กรมศิลป์';
  if (source === 'thailand_cultural_hub') return 'Thailand Cultural Hub';

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
    color: getHashColor(item.category),
    sort_order: 1000 + index,
    is_active: true,
    source: `cultural_places:${item.source}`,
    source_label: `${getSourceDisplayLabel(item.source)} / cultural_places`,
    count: item.count,
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
    })),
  ];
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ data: [], message: supabase.error });
  }

  const [{ data, error }, culturalPlacesResult, tatPlacesResult, articlesResult] =
    await Promise.all([
    supabase.client
      .from(TABLE_NAME)
      .select('id, name, payload, updated_at')
      .order('id', { ascending: true }),
    supabase.client.from(CULTURAL_PLACES_TABLE).select('category, source').limit(50000),
    supabase.client
      .from(TAT_PLACES_TABLE)
      .select('category_id, category_name, sub_category_ids, payload')
      .limit(50000),
    supabase.client.from('creator_articles').select('category_key, category_label'),
  ]);

  if (error) {
    return NextResponse.json({ data: [], message: error.message });
  }

  const usageCountMap = new Map<string, number>();

  if (!articlesResult.error) {
    ((articlesResult.data ?? []) as CreatorArticleCategoryRow[]).forEach((article) => {
      const categoryKey = getSystemCultureCategoryKey(article.category_key, article.category_label);

      if (categoryKey) {
        usageCountMap.set(categoryKey, (usageCountMap.get(categoryKey) ?? 0) + 1);
      }
    });
  }

  const sourceCategoryRows = ((data ?? []) as PlaceSubCategoryRow[])
    .map(toCategoryRow)
    .filter(
      (row) =>
        !CULTURE_CATEGORY_KEY_BY_NORMALIZED_LABEL[normalizeCultureCategoryLabel(row.label)]
    )
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));

  const categoryRows = [
    ...getSystemCategoryRows(),
    ...buildActualCulturalCategoryRows(
      (culturalPlacesResult.data ?? []) as CulturalPlaceCategoryRow[]
    ),
    ...buildTatCategoryRows((tatPlacesResult.data ?? []) as TatPlaceCategoryRow[]),
    ...sourceCategoryRows.map((row) => ({
      ...row,
      source_label: row.source_label ?? 'ททท. / synced sub-category',
    })),
  ];

  const categories = categoryRows
    .filter((category) => category.is_active !== false)
    .map((category) => ({
      key: category.category_key,
      label: category.label,
      description: category.description ?? category.source_label ?? '',
      color: category.color ?? '#608D8C',
      sortOrder: category.sort_order ?? 0,
      isActive: category.is_active !== false,
      source: category.source ?? '',
      sourceLabel: category.source_label ?? '',
      usageCount: category.count ?? usageCountMap.get(category.category_key) ?? 0,
    }))
    .sort(
      (first, second) =>
        second.usageCount - first.usageCount || first.sortOrder - second.sortOrder
    );

  return NextResponse.json({ data: categories });
}

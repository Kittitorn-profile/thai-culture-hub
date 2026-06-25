export type SystemCultureCategory = {
  key: string;
  label: string;
};

export const DEFAULT_CULTURE_CATEGORY_COLOR = '#608D8C';

export const SYSTEM_CULTURE_CATEGORIES = [
  { key: 'community_wisdom', label: 'ภูมิปัญญาชุมชน' },
  { key: 'costume', label: 'ผ้าและเครื่องแต่งกาย' },
  { key: 'craftsmanship', label: 'งานช่างฝีมือ' },
  { key: 'cultural_attraction', label: 'แหล่งท่องเที่ยวทางวัฒนธรรม' },
  { key: 'ethnic_group', label: 'กลุ่มชาติพันธุ์' },
  { key: 'folk_art', label: 'ศิลปะพื้นบ้าน' },
  { key: 'heritage', label: 'โบราณสถานและมรดกทางวัฒนธรรม' },
  { key: 'learning_center', label: 'แหล่งเรียนรู้' },
  { key: 'local_food', label: 'อาหารพื้นบ้าน' },
  { key: 'local_tradition', label: 'ประเพณีท้องถิ่น' },
  { key: 'moral_community', label: 'ชุมชนคุณธรรม' },
  { key: 'museum', label: 'พิพิธภัณฑ์' },
  { key: 'performing_art', label: 'ศิลปะการแสดง' },
  { key: 'ritual', label: 'พิธีกรรม' },
  { key: 'temple', label: 'ศาสนสถาน' },
  { key: 'tourist_attraction', label: 'สถานที่ท่องเที่ยว' },
] as const satisfies readonly SystemCultureCategory[];

export const CULTURE_CATEGORY_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  SYSTEM_CULTURE_CATEGORIES.map((category) => [category.key, category.label])
);

export const CULTURE_CATEGORY_KEY_BY_TITLE: Record<string, string> = Object.fromEntries(
  SYSTEM_CULTURE_CATEGORIES.map((category) => [category.label, category.key])
);

export const SYSTEM_CULTURE_CATEGORY_KEYS: ReadonlySet<string> = new Set(
  SYSTEM_CULTURE_CATEGORIES.map((category) => category.key)
);

export function normalizeCultureCategoryLabel(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').trim().toLowerCase();
}

export const CULTURE_CATEGORY_KEY_BY_NORMALIZED_LABEL: Record<string, string> = Object.fromEntries(
  SYSTEM_CULTURE_CATEGORIES.map((category) => [
    normalizeCultureCategoryLabel(category.label),
    category.key,
  ])
);

export function getCultureCategoryLabel(categoryKey?: string | null) {
  const key = categoryKey?.trim() ?? '';

  return CULTURE_CATEGORY_LABEL_BY_KEY[key] ?? key;
}

export function getSystemCultureCategoryKey(
  categoryKey?: string | null,
  categoryLabel?: string | null
) {
  const cleanCategoryKey = categoryKey?.trim() ?? '';

  if (SYSTEM_CULTURE_CATEGORY_KEYS.has(cleanCategoryKey)) {
    return cleanCategoryKey;
  }

  return (
    CULTURE_CATEGORY_KEY_BY_NORMALIZED_LABEL[normalizeCultureCategoryLabel(categoryLabel)] ??
    cleanCategoryKey
  );
}

export function getCultureCategoryKeyByTitle(title: string) {
  return CULTURE_CATEGORY_KEY_BY_TITLE[title] ?? 'cultural_attraction';
}

export function getCultureCategoryHref(categoryKey?: string | null, categoryLabel?: string | null) {
  const systemCategoryKey = getSystemCultureCategoryKey(categoryKey, categoryLabel);

  return SYSTEM_CULTURE_CATEGORY_KEYS.has(systemCategoryKey)
    ? `/culture-category/${systemCategoryKey}`
    : '/culture-category';
}

export function getCultureCategoryHashColor(value: string) {
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

  return palette[hash % palette.length] ?? DEFAULT_CULTURE_CATEGORY_COLOR;
}

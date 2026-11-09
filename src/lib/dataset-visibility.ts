import { z } from 'zod';

export const DATASET_VISIBILITY_KEY = 'public-dataset-visibility';
export const DATASET_SOURCES = [
  {
    key: 'tat',
    label: 'สถานที่ — การท่องเที่ยวแห่งประเทศไทย (ททท.)',
    inventory: 'tat',
    origin: 'TAT Data API / ชุด attraction.json',
  },
  {
    key: 'culture_catalog',
    label: 'แค็ตตาล็อกวัฒนธรรม',
    inventory: 'culture_catalog',
    origin: 'culture.gdcatalog.go.th',
  },
  {
    key: 'religious_places',
    label: 'ชุดข้อมูลศาสนสถาน',
    inventory: 'religious_places',
    origin: 'กระทรวงวัฒนธรรม',
  },
  {
    key: 'finearts_monument',
    label: 'โบราณสถาน — กรมศิลปากร',
    inventory: 'finearts_monument',
    origin: 'Fine Arts Open Data',
  },
  {
    key: 'finearts_archeology',
    label: 'แหล่งโบราณคดี — กรมศิลปากร',
    inventory: 'finearts_archeology',
    origin: 'Fine Arts Open Data',
  },
  {
    key: 'finearts_buddha',
    label: 'พระพุทธรูป — กรมศิลปากร',
    inventory: 'finearts_buddha',
    origin: 'Fine Arts Open Data',
  },
  {
    key: 'finearts_museum',
    label: 'พิพิธภัณฑ์ — กรมศิลปากร',
    inventory: 'finearts_museum',
    origin: 'Fine Arts Open Data',
  },
  {
    key: 'cpot_products',
    label: 'ผลิตภัณฑ์วัฒนธรรมไทย CPOT',
    inventory: 'cpot_raw',
    origin: 'กระทรวงวัฒนธรรม · รวมรายการที่นำเข้าเป็นสถานที่',
  },
  {
    key: 'thai_fabric_wisdom',
    label: 'ชุดมรดกภูมิปัญญาผ้าไทย',
    inventory: 'fabric_raw',
    origin: 'กระทรวงวัฒนธรรม · รวมรายการที่นำเข้าเป็นสถานที่',
  },
  {
    key: 'ethnic_groups',
    label: 'ชุดกลุ่มชาติพันธุ์ — Open Development Thailand',
    inventory: 'ethnic_raw',
    origin: 'Open Development Thailand · รวมรายการบนแผนที่',
  },
  {
    key: 'ethnic_supplements',
    label: 'ชุดข้อมูลชุมชนเสริม',
    inventory: 'ethnic_supplements',
    origin: 'ชุดรวบรวมอ้างอิงวิกิชุมชนและแหล่งข้อมูลรายชุมชน',
  },
  {
    key: 'artists_registry',
    label: 'ทะเบียนและชุดรวบรวมศิลปิน',
    inventory: 'artists',
    origin: 'ทะเบียนศิลปินและประวัติอ้างอิงที่รวมในระบบ',
  },
  {
    key: 'heritage_registry',
    label: 'ทะเบียนมรดกภูมิปัญญา — กรมส่งเสริมวัฒนธรรม',
    inventory: 'heritage',
    origin: 'data.go.th/dataset/ich_51_02',
  },
  {
    key: 'community_weaving',
    label: 'ชุดรวบรวมผ้าและการทอผ้าชุมชน',
    inventory: 'community_weaving',
    origin: 'ชุดรวบรวมชุมชนพร้อมแหล่งอ้างอิงรายเรื่อง',
  },
  {
    key: 'community_crafts',
    label: 'ชุดรวบรวมงานช่างและวิถีชีวิตชุมชน',
    inventory: 'community_crafts',
    origin: 'ชุดรวบรวมชุมชนพร้อมแหล่งอ้างอิงรายเรื่อง',
  },
  {
    key: 'local',
    label: 'ข้อมูลสถานที่ที่ทีมงานเพิ่มเอง',
    inventory: 'local',
    origin: 'Thailand Cultural Hub',
  },
] as const;
export const SOURCE_KEYS = DATASET_SOURCES.map((source) => source.key);
const LEGACY_KEYS = [
  'places',
  'artists',
  'heritage',
  'community',
  'ethnic-groups',
  'products',
  'crafts',
] as const;
export const DATASET_KEYS = [...SOURCE_KEYS, ...LEGACY_KEYS];
export type DatasetKey = (typeof DATASET_KEYS)[number];
const GROUP_SOURCES: Record<string, readonly DatasetKey[]> = {
  places: [
    'tat',
    'culture_catalog',
    'religious_places',
    'finearts_monument',
    'finearts_archeology',
    'finearts_buddha',
    'finearts_museum',
    'cpot_products',
    'thai_fabric_wisdom',
    'ethnic_groups',
    'local',
  ],
  artists: ['artists_registry'],
  heritage: ['heritage_registry'],
  community: ['community_weaving', 'community_crafts'],
  'ethnic-groups': ['ethnic_groups', 'ethnic_supplements'],
  products: ['cpot_products'],
  crafts: ['thai_fabric_wisdom', 'community_weaving', 'community_crafts'],
  fabric: ['thai_fabric_wisdom'],
};
export const datasetVisibilitySchema = z.object({
  hidden: z.array(z.enum(DATASET_KEYS)).max(DATASET_KEYS.length),
});
export function datasetKey(value: string) {
  return value === 'ethnic' ? 'ethnic-groups' : value === 'cpot' ? 'products' : value;
}
export function isDatasetEnabled(value: string, hidden: readonly DatasetKey[]) {
  const key = datasetKey(value);
  if (hidden.includes(key as DatasetKey)) return false;
  const sources = GROUP_SOURCES[key];
  return !sources || sources.some((source) => !hidden.includes(source));
}
export function normalizeHiddenSources(hidden: readonly DatasetKey[]): DatasetKey[] {
  return [...new Set(hidden.flatMap((key) => GROUP_SOURCES[key] ?? [key]))];
}
export function isPublicPlaceVisible(
  source: string | null | undefined,
  hidden: readonly DatasetKey[]
) {
  const key = source || 'local';
  return !hidden.includes('places') && !hidden.includes(key as DatasetKey);
}

import type { SupabaseClient } from '@supabase/supabase-js';

import { isDatasetEnabled } from 'src/lib/dataset-visibility';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';

import { getCulturalHeritage } from './cultural-heritage';
import { getCulturalArtistDirectory } from './cultural-artists';
import { isDatasetVisible, getDatasetVisibility } from './dataset-visibility';
import { ETHNIC_SUPPLEMENTS_KEY, ethnicSupplementDirectorySchema } from './ethnic-supplements';

// Keep successful counts independently so a failing source does not invalidate the others.
const countCaches = new WeakMap<
  SupabaseClient,
  Map<string, { count: number; expiresAt: number }>
>();
const pendingCounts = new WeakMap<SupabaseClient, Map<string, Promise<number>>>();

function readCachedCount(db: SupabaseClient, key: string, read: () => Promise<number>) {
  let counts = countCaches.get(db);
  if (!counts) countCaches.set(db, (counts = new Map()));
  const cached = counts.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.count);

  let pending = pendingCounts.get(db);
  if (!pending) pendingCounts.set(db, (pending = new Map()));
  const existing = pending.get(key);
  if (existing) return existing;
  const result = read()
    .then((count) => {
      counts.set(key, { count, expiresAt: Date.now() + 300000 });
      return count;
    })
    .finally(() => pending.delete(key));
  pending.set(key, result);
  return result;
}

export async function getCulturalDataSummary(db: SupabaseClient) {
  const { hidden } = await getDatasetVisibility();
  async function countTable(table: string) {
    let request = db.from(table).select('*', { count: 'exact', head: true });
    if (table === (process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places')) {
      const sources = hidden.filter((key) =>
        [
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
        ].includes(key)
      );
      if (sources.length)
        request = hidden.includes('local')
          ? request.not('source', 'is', null).not('source', 'in', `(${sources.join(',')})`)
          : request.or(`source.is.null,source.not.in.(${sources.join(',')})`);
    }
    const result = await request.abortSignal(AbortSignal.timeout(10000));
    if (result.error || result.count === null) throw new Error('Count unavailable');
    return result.count;
  }
  const definitions = [
    {
      key: 'places',
      label: 'สถานที่และข้อมูลวัฒนธรรม',
      unit: 'รายการ',
      source: 'ททท. · กระทรวงวัฒนธรรม',
      note: 'รายการในฐานข้อมูล อาจมีสถานที่ซ้ำระหว่างแหล่ง',
      read: () => countTable(process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places'),
    },
    {
      key: 'artists',
      label: 'ศิลปิน',
      unit: 'คน',
      source: 'ทะเบียนศิลปินและประวัติอ้างอิง',
      note: 'รวมรายที่ยังอยู่ระหว่างตรวจสอบจังหวัด',
      read: async () => (await getCulturalArtistDirectory()).artists.length,
    },
    {
      key: 'heritage',
      label: 'มรดกภูมิปัญญา',
      unit: 'รายการ',
      source: 'กรมส่งเสริมวัฒนธรรม · Data.go.th',
      note: 'อ่านจำนวนจากทะเบียนต้นทาง',
      read: async () => (await getCulturalHeritage({ limit: 1 })).total,
    },
    {
      key: 'ethnic',
      label: 'ชุมชนชาติพันธุ์',
      unit: 'รายการ',
      source: 'Open Development Mekong · ศูนย์มานุษยวิทยาสิรินธร',
      note: 'นับรายการชุมชน ไม่ใช่จำนวนชาติพันธุ์',
      read: async () => {
        const [total, supplemental] = await Promise.all([
          hidden.includes('ethnic_groups')
            ? Promise.resolve(0)
            : countTable(process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups'),
          db
            .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
            .select('content')
            .eq('section_key', ETHNIC_SUPPLEMENTS_KEY)
            .abortSignal(AbortSignal.timeout(10000))
            .maybeSingle(),
        ]);
        if (supplemental.error) throw new Error('Supplement count unavailable');
        return (
          total +
          (!hidden.includes('ethnic_supplements') && supplemental.data
            ? ethnicSupplementDirectorySchema.parse(supplemental.data.content).items.length
            : 0)
        );
      },
    },
    {
      key: 'products',
      label: 'ผลิตภัณฑ์วัฒนธรรม',
      unit: 'รายการ',
      source: 'ชุดข้อมูล CPOT · กระทรวงวัฒนธรรม',
      note: 'ผลิตภัณฑ์วัฒนธรรมไทยในฐานข้อมูล',
      read: () => countTable(process.env.CULTURAL_PRODUCTS_CPOT_TABLE ?? 'cultural_products_cpot'),
    },
    {
      key: 'crafts',
      label: 'ผ้าและหัตถกรรม',
      unit: 'รายการ',
      source: 'ชุดข้อมูลภูมิปัญญาผ้าไทย · ชุดรวบรวมชุมชนพร้อมแหล่งอ้างอิง',
      note: 'ผ้าและการทอผ้า ทอเสื่อ จักสาน และวิถีชีวิตชุมชน',
      read: async () => {
        const [fabric, community] = await Promise.all([
          hidden.includes('thai_fabric_wisdom')
            ? Promise.resolve(0)
            : countTable(process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom'),
          !isDatasetEnabled('community', hidden)
            ? Promise.resolve({ total: 0 })
            : getCulturalHeritage({ collection: 'community', limit: 1, publicOnly: true }),
        ]);
        return fabric + community.total;
      },
    },
  ];
  const visible = await Promise.all(
    definitions.map(async (definition) =>
      (await isDatasetVisible(definition.key)) ? definition : null
    )
  );
  const groups = await Promise.all(
    visible
      .filter((definition) => definition !== null)
      .map(async ({ read, ...definition }) => {
        try {
          return {
            ...definition,
            count: await readCachedCount(db, `${definition.key}:${hidden.join(',')}`, read),
          };
        } catch {
          return { ...definition, count: null };
        }
      })
  );
  return {
    groups: groups.map((group) => ({
      ...group,
      label:
        PUBLIC_DATA_GROUPS.find((definition) => definition.key === group.key)?.label ?? group.label,
    })),
    updatedAt: new Date().toISOString(),
    complete: groups.every((group) => group.count !== null),
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';

import { getCulturalHeritage } from './cultural-heritage';
import { getCulturalArtistDirectory } from './cultural-artists';
import crafts from '../../data/cultural-heritage/community-crafts.json';
import weaving from '../../data/cultural-heritage/community-weaving.json';
import { ETHNIC_SUPPLEMENTS_KEY, ethnicSupplementDirectorySchema } from './ethnic-supplements';

export type InventoryRow = {
  key: string;
  group: string;
  label: string;
  count: number | null;
  basis: string;
  scope: 'province' | 'all';
  error?: string;
};
export async function getCulturalDataInventory(
  db: SupabaseClient,
  provinceCode = '',
  provinceName = ''
) {
  const places = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
  const rows: InventoryRow[] = [];
  const definitions = [
    ['places_all', 'สถานที่', 'สถานที่ทั้งหมด (แถวข้อมูลดิบ)', places, '', 'province_code'],
    ...[
      ['tat', 'ททท. — รวมสถานที่จาก API และ attraction.json'],
      ['culture_catalog', 'แค็ตตาล็อกวัฒนธรรม'],
      ['religious_places', 'ศาสนสถาน — กระทรวงวัฒนธรรม'],
      ['cpot_products', 'CPOT ที่นำเข้าเป็นสถานที่'],
      ['thai_fabric_wisdom', 'ผ้าไทยที่นำเข้าเป็นสถานที่'],
      ['ethnic_groups', 'กลุ่มชาติพันธุ์ที่นำเข้าเป็นสถานที่'],
      ['finearts_monument', 'กรมศิลปากร — โบราณสถาน'],
      ['finearts_archeology', 'กรมศิลปากร — แหล่งโบราณคดี'],
      ['finearts_buddha', 'กรมศิลปากร — พระพุทธรูป'],
      ['finearts_museum', 'กรมศิลปากร — พิพิธภัณฑ์'],
    ].map(([key, label]) => [key, 'สถานที่', label, places, key, 'province_code']),
    [
      'tat_metadata_places',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — ตารางสถานที่ต้นฉบับ',
      'places',
      '',
      '',
    ],
    ['tat_categories', 'ข้อมูลประกอบและชุดต้นฉบับ', 'ททท. — หมวดหลัก', 'place_categories', '', ''],
    [
      'tat_subcategories',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — หมวดย่อย',
      'place_sub_categories',
      '',
      '',
    ],
    [
      'tat_routes',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — เส้นทาง',
      process.env.TAT_ROUTES_TABLE ?? 'tat_routes',
      '',
      '',
    ],
    [
      'tat_route_places',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — สถานที่ในเส้นทาง',
      process.env.TAT_ROUTE_PLACES_TABLE ?? 'tat_route_places',
      '',
      '',
    ],
    [
      'tat_article_types',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — ประเภทบทความ',
      process.env.TAT_ARTICLE_TYPES_TABLE ?? 'tat_article_types',
      '',
      '',
    ],
    [
      'tat_articles',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ททท. — บทความ',
      process.env.TAT_ARTICLES_TABLE ?? 'tat_articles',
      '',
      '',
    ],
    [
      'cpot_raw',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ชุดผลิตภัณฑ์วัฒนธรรมไทย CPOT',
      process.env.CULTURAL_PRODUCTS_CPOT_TABLE ?? 'cultural_products_cpot',
      '',
      'province_code',
    ],
    [
      'fabric_raw',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ชุดมรดกภูมิปัญญาผ้าไทย',
      process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom',
      '',
      'province_code',
    ],
    [
      'ethnic_raw',
      'ข้อมูลประกอบและชุดต้นฉบับ',
      'ชุดกลุ่มชาติพันธุ์',
      process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups',
      '',
      'province',
    ],
    [
      'categories',
      'หมวดข้อมูลวัฒนธรรม',
      'หมวดที่เปิดใช้งานในระบบ',
      process.env.CULTURAL_CATEGORIES_TABLE ?? 'cultural_categories',
      '',
      '',
    ],
  ];
  const databaseRows = await Promise.all(
    definitions.map(
      async ([key, group, label, table, source, provinceField]): Promise<InventoryRow> => {
        let query = db.from(table).select('*', { head: true, count: 'exact' });
        if (source) query = query.eq('source', source);
        if (provinceCode && provinceField)
          query = query.eq(
            provinceField,
            provinceField === 'province' ? provinceName : provinceCode
          );
        if (key === 'categories') query = query.eq('is_active', true);
        const result = await query.abortSignal(AbortSignal.timeout(15000));
        return {
          key,
          group,
          label,
          count: result.error ? null : result.count,
          basis: 'นับแถวที่มีอยู่ในฐานข้อมูล',
          scope: provinceField ? 'province' : 'all',
          ...(result.error ? { error: 'อ่านจำนวนไม่ได้หรือยังไม่มีตารางนี้' } : {}),
        };
      }
    )
  );
  rows.push(...databaseRows);
  const otherRows = await Promise.all([
    (async (): Promise<InventoryRow> => {
      try {
        const directory = await getCulturalArtistDirectory();
        const artists = directory.artists.filter(
          (a) =>
            !provinceCode || a.provinceAssociations.some((p) => p.provinceCode === provinceCode)
        );
        return {
          key: 'artists',
          group: 'ศิลปิน',
          label: 'ทะเบียนศิลปินและชุดศิลปินเสริม',
          count: artists.length,
          basis: provinceCode
            ? 'เฉพาะรายที่มีหลักฐานจังหวัดนี้'
            : 'รายชื่อที่เก็บในระบบหลังรวมชื่อซ้ำ',
          scope: 'province',
        };
      } catch {
        return {
          key: 'artists',
          group: 'ศิลปิน',
          label: 'ทะเบียนศิลปินและชุดศิลปินเสริม',
          count: null,
          basis: 'ทะเบียนในระบบ',
          scope: 'province',
          error: 'อ่านทะเบียนศิลปินไม่ได้',
        };
      }
    })(),
    (async (): Promise<InventoryRow> => {
      try {
        const data = await getCulturalHeritage({ province: provinceName, limit: 1 });
        return {
          key: 'heritage',
          group: 'มรดกและภูมิปัญญา',
          label: 'ทะเบียนมรดก — กรมส่งเสริมวัฒนธรรม',
          count: data.total,
          basis: 'จำนวนจากต้นทาง CKAN ไม่ใช่แถวที่นำเข้าไว้',
          scope: 'province',
        };
      } catch {
        return {
          key: 'heritage',
          group: 'มรดกและภูมิปัญญา',
          label: 'ทะเบียนมรดก — กรมส่งเสริมวัฒนธรรม',
          count: null,
          basis: 'อ่านจากต้นทาง CKAN',
          scope: 'province',
          error: 'ต้นทางไม่ตอบสนอง',
        };
      }
    })(),
  ]);
  try {
    const result = await db
      .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
      .select('content')
      .eq('section_key', ETHNIC_SUPPLEMENTS_KEY)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle();
    if (result.error) throw new Error('Unavailable');
    const items = result.data
      ? ethnicSupplementDirectorySchema.parse(result.data.content).items
      : [];
    rows.push({
      key: 'ethnic_supplements',
      group: 'ข้อมูลประกอบและชุดต้นฉบับ',
      label: 'ชุมชนชาติพันธุ์เสริม — ศูนย์มานุษยวิทยาสิรินธร',
      count: items.filter((item) => !provinceName || item.province === provinceName).length,
      basis: 'ชุดเสริมพร้อมหลักฐานพิกัด เก็บแยกจากตารางต้นฉบับ',
      scope: 'province',
    });
  } catch {
    rows.push({
      key: 'ethnic_supplements',
      group: 'ข้อมูลประกอบและชุดต้นฉบับ',
      label: 'ชุมชนชาติพันธุ์เสริม — ศูนย์มานุษยวิทยาสิรินธร',
      count: null,
      basis: 'ชุดข้อมูลเสริม',
      scope: 'province',
      error: 'อ่านจำนวนชุดเสริมไม่ได้',
    });
  }
  rows.push(...otherRows);
  for (const [key, label, data] of [
    ['community_weaving', 'ชุดวิถีชีวิตและการทอผ้า', weaving],
    ['community_crafts', 'ชุดทอเสื่อ จักสาน ผลิตภัณฑ์ชุมชน และศิลปาชีพ', crafts],
  ] as const)
    rows.push({
      key,
      group: 'มรดกและภูมิปัญญา',
      label,
      count: data.filter((item) => !provinceName || item.province === provinceName).length,
      basis: 'ข้อมูลที่รวบรวมและเก็บในโปรเจกต์ พร้อมแหล่งอ้างอิงรายเรื่อง',
      scope: 'province',
    });
  return { data: rows, checkedAt: new Date().toISOString(), provinceCode };
}

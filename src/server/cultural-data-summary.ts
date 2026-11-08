import type { SupabaseClient } from '@supabase/supabase-js';

import { getCulturalHeritage } from './cultural-heritage';
import { getEthnicGroupDirectory } from './ethnic-groups';
import { getCulturalArtistDirectory } from './cultural-artists';

export async function getCulturalDataSummary(db: SupabaseClient) {
  async function countTable(table: string) {
    const result = await db
      .from(table)
      .select('*', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(10000));
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
      read: async () => (await getEthnicGroupDirectory(db)).length,
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
      key: 'fabric',
      label: 'ภูมิปัญญาผ้าไทย',
      unit: 'รายการ',
      source: 'ชุดข้อมูลภูมิปัญญาผ้าไทย',
      note: 'ข้อมูลผ้าและภูมิปัญญาที่เกี่ยวข้อง',
      read: () => countTable(process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom'),
    },
    {
      key: 'community',
      label: 'วิถีชีวิตและหัตถกรรม',
      unit: 'เรื่อง',
      source: 'ชุดรวบรวมชุมชนพร้อมแหล่งอ้างอิง',
      note: 'การทอผ้า จักสาน และงานช่างชุมชน',
      read: async () => (await getCulturalHeritage({ collection: 'community', limit: 1 })).total,
    },
  ];
  const groups = await Promise.all(
    definitions.map(async ({ read, ...definition }) => {
      try {
        return { ...definition, count: await read() };
      } catch {
        return { ...definition, count: null };
      }
    })
  );
  return {
    groups,
    updatedAt: new Date().toISOString(),
    complete: groups.every((group) => group.count !== null),
  };
}

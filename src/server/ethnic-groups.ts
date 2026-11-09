import type { SupabaseClient } from '@supabase/supabase-js';

import { createHash } from 'node:crypto';

import { parseCoordinate, isValidCoordinatePair } from 'src/utils/coordinates';

import { getDatasetVisibility } from './dataset-visibility';
import { ETHNIC_SUPPLEMENTS_KEY, ethnicSupplementDirectorySchema } from './ethnic-supplements';

export const ETHNIC_GROUPS_SOURCE_URL =
  'https://data.thailand.opendevelopmentmekong.net/th/api/3/action/datastore_search?resource_id=286cca68-b84d-4151-b95f-d31ba7a9f640';
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
export function mapEthnicGroup(row: Record<string, unknown>) {
  const valid = isValidCoordinatePair(row.lat, row.lng);
  return {
    id: createHash('sha256')
      .update(
        JSON.stringify([
          row.ethnic_id,
          row.title,
          row.ip_group,
          row.province,
          row.district_th,
          row.sub_district_th,
          row.village_name_th,
          row.lat,
          row.lng,
        ])
      )
      .digest('hex')
      .slice(0, 20),
    title: text(row.title),
    groups: [text(row.ip_group) || text(row.title)].filter(Boolean),
    sourceName: 'Open Development Thailand',
    coordinateSourceUrl: ETHNIC_GROUPS_SOURCE_URL,
    coordinateKind: 'source_record',
    checkedAt: '',
    group: text(row.ip_group) || text(row.title),
    province: text(row.province),
    provinceEnglish: text(row.province_en),
    district: text(row.district_th),
    subDistrict: text(row.sub_district_th),
    village: text(row.village_name_th),
    villageEnglish: text(row.village_name_en),
    region: text(row.spatial),
    description: text(row.description_th) || text(row.description_en),
    latitude: valid ? parseCoordinate(row.lat) : null,
    longitude: valid ? parseCoordinate(row.lng) : null,
    sourceUrl: ETHNIC_GROUPS_SOURCE_URL,
  };
}
export type EthnicGroupRecord = ReturnType<typeof mapEthnicGroup>;
export async function getEthnicGroupDirectory(db: SupabaseClient, publicOnly = false) {
  const records: EthnicGroupRecord[] = [];
  const table = process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups';
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select(
        'ethnic_id,spatial,title,ip_group,sub_district_th,district_th,province,province_en,lat,lng,village_name_th,village_name_en,description_th,description_en'
      )
      .order('province')
      .order('ip_group')
      .order('village_name_th')
      .order('district_th')
      .order('sub_district_th')
      .order('title')
      .order('lat')
      .order('lng')
      .range(offset, offset + 999)
      .abortSignal(AbortSignal.timeout(15000));
    if (error || !data) throw new Error('อ่านข้อมูลกลุ่มชาติพันธุ์ไม่ได้');
    records.push(...data.map(mapEthnicGroup));
    if (data.length < 1000) {
      const originalIds = new Set(records.map((item) => item.id));
      const supplemental = await db
        .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
        .select('content')
        .eq('section_key', ETHNIC_SUPPLEMENTS_KEY)
        .abortSignal(AbortSignal.timeout(15000))
        .maybeSingle();
      if (supplemental.error) throw new Error('อ่านชุดข้อมูลชุมชนเสริมไม่ได้');
      if (supplemental.data) {
        const directory = ethnicSupplementDirectorySchema.parse(supplemental.data.content);
        const ids = new Set(records.map((item) => item.id));
        for (const item of directory.items) {
          if (ids.has(item.id)) throw new Error('รหัสชุมชนเสริมซ้ำ');
          ids.add(item.id);
          records.push(item);
        }
      }
      if (!publicOnly) return records;
      const { hidden } = await getDatasetVisibility();
      return records.filter(
        (item) =>
          !hidden.includes(originalIds.has(item.id) ? 'ethnic_groups' : 'ethnic_supplements')
      );
    }
  }
  throw new Error('ข้อมูลเกินขอบเขตที่รองรับ');
}
export function filterEthnicGroups(
  records: EthnicGroupRecord[],
  { q = '', province = '', group = '' }: { q?: string; province?: string; group?: string }
) {
  const query = q.trim().toLocaleLowerCase('th');
  return records.filter(
    (record) =>
      (!province || record.province === province) &&
      (!group || record.groups.includes(group)) &&
      (!query ||
        [
          record.title,
          record.group,
          record.province,
          record.district,
          record.subDistrict,
          record.village,
          record.villageEnglish,
          record.description,
        ]
          .join(' ')
          .toLocaleLowerCase('th')
          .includes(query))
  );
}

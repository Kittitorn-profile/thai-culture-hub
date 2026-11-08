import type { SupabaseClient } from '@supabase/supabase-js';

import { ARTIST_GROUPS } from 'src/lib/cultural-data-groups';
import {
  CRAFT_CATEGORIES,
  normalizeCraftCategory,
  getPrimaryCraftCategory,
} from 'src/lib/public-cultural-data';

import { applyCraftOverrides } from './craft-overrides';
import { getCulturalHeritage } from './cultural-heritage';
import fabricImages from '../../data/cultural-images/fabric-images.json';
import qsdsTextiles from '../../data/cultural-heritage/qsds-textiles.json';
import { filterEthnicGroups, getEthnicGroupDirectory } from './ethnic-groups';
import { filterCulturalArtists, getCulturalArtistDirectory } from './cultural-artists';

export const PROVINCE_DATA_SECTIONS = [
  'artists',
  'heritage',
  'crafts',
  'ethnic',
  'cpot',
  'groups',
  'events',
] as const;
export type ProvinceDataSection = (typeof PROVINCE_DATA_SECTIONS)[number] | 'community' | 'fabric';
export type ProvinceDataItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sourceUrl: string;
  sourceUrls?: string[];
  detailUrl?: string;
  images?: { url: string; caption: string; credit: string }[];
  imageUrl?: string;
  imageCredit?: string;
  craftCategory?: string;
  mapUrl?: string;
  details: { label: string; value: string }[];
};
export type ProvinceDataResult = {
  key: ProvinceDataSection;
  total: number | null;
  data: ProvinceDataItem[];
  error?: string;
  page: number;
  pageSize: number;
};
export async function getProvinceCulturalSection(
  db: SupabaseClient,
  code: string,
  name: string,
  section: ProvinceDataSection,
  page = 0,
  pageSize = 9,
  query = '',
  options: { category?: string; offset?: number; recordId?: string } = {}
): Promise<ProvinceDataResult> {
  const result = async (rows: ProvinceDataItem[], total: number) => {
    const data = options.recordId ? rows.filter((item) => item.id === options.recordId) : rows;
    const kind = section === 'cpot' ? 'products' : section;
    const projected = ['artists', 'heritage', 'ethnic', 'products'].includes(kind)
      ? await applyCraftOverrides(db, data, kind as 'artists' | 'heritage' | 'ethnic' | 'products')
      : data;
    return { key: section, data: projected, total, page, pageSize };
  };
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  if (section === 'crafts') {
    const category = CRAFT_CATEGORIES.find(
      (item) => item.key === normalizeCraftCategory(options.category ?? '')
    );
    // The community collection is local and small; only database rows are paginated remotely.
    const community = await getProvinceCulturalSection(
      db,
      code,
      name,
      'community',
      0,
      Number.MAX_SAFE_INTEGER,
      query,
      {}
    );
    const matchingCommunity = category
      ? community.data.filter((item) => item.craftCategory === category.key)
      : community.data;
    const offset = page * pageSize;
    const local = matchingCommunity.slice(offset, offset + pageSize).map((item) => ({
      ...item,
      id: `community:${item.id}`,
    }));
    if (category && category.key !== 'weaving') return result(local, matchingCommunity.length);
    const fabric = await getProvinceCulturalSection(
      db,
      code,
      name,
      'fabric',
      0,
      Math.max(1, pageSize - local.length),
      query,
      { offset: Math.max(0, offset - matchingCommunity.length) }
    );
    return result(
      [
        ...local,
        ...fabric.data.slice(0, pageSize - local.length).map((item) => ({
          ...item,
          id: `fabric:${item.id}`,
        })),
      ],
      matchingCommunity.length + (fabric.total ?? 0)
    );
  }
  if (section === 'cpot' || section === 'fabric') {
    const fabric = section === 'fabric';
    const table = fabric
      ? (process.env.THAI_FABRIC_WISDOM_TABLE ?? 'thai_fabric_wisdom')
      : (process.env.CULTURAL_PRODUCTS_CPOT_TABLE ?? 'cultural_products_cpot');
    const fields = fabric
      ? 'id,title,type,description,wisdom,pattern,material,technique,province,source_uri,image_url'
      : 'id,product_name,category,product_type,description,community,district,province,source_uri,image_url';
    let request = db.from(table).select(fields, { count: 'exact' });
    if (options.recordId) request = request.eq('id', options.recordId);
    if (code && name) request = request.or(`province_code.eq.${code},province.eq.${name}`);
    if (query)
      request = request.ilike(
        fabric ? 'title' : 'product_name',
        `%${query.replace(/[%_\\]/g, '')}%`
      );
    const { data, count, error } = await request
      .order('id')
      .range(options.offset ?? page * pageSize, (options.offset ?? page * pageSize) + pageSize - 1);
    if (error) throw new Error('อ่านชุดผลิตภัณฑ์ไม่ได้');
    const projected = ((data as unknown as Record<string, unknown>[]) ?? []).map((a) => {
      const qsds = fabric
        ? qsdsTextiles.items.find(
            (item) =>
              item.recordType === 'fabric' &&
              item.recordId === String(a.id) &&
              item.recordTitle === a.title &&
              item.province === a.province
          )
        : undefined;
      return {
        id: String(a.id),
        title: text(fabric ? a.title : a.product_name),
        subtitle: text(fabric ? a.type : a.category),
        description: text(a.description),
        sourceUrl: text(a.source_uri),
        imageUrl:
          text(a.image_url) ||
          (fabric
            ? fabricImages.find(
                (image) =>
                  image.id === String(a.id) &&
                  image.title === a.title &&
                  image.province === a.province
              )?.imageUrl
            : undefined),
        imageCredit:
          !text(a.image_url) && fabric
            ? fabricImages.find(
                (image) =>
                  image.id === String(a.id) &&
                  image.title === a.title &&
                  image.province === a.province
              )?.imageCredit
            : undefined,
        sourceUrls: fabric
          ? [
              text(a.source_uri),
              ...(qsds ? [qsds.sourceUrl] : []),
              ...fabricImages
                .filter(
                  (image) =>
                    image.id === String(a.id) &&
                    image.title === a.title &&
                    image.province === a.province
                )
                .map((image) => image.sourceUrl),
            ].filter(Boolean)
          : undefined,
        details: [
          {
            label: 'พื้นที่/ชุมชน',
            value: [a.community, a.district, a.province].filter(Boolean).join(' · '),
          },
          { label: 'ประเภทผลิตภัณฑ์', value: text(a.product_type) },
          { label: 'วัสดุ', value: text(a.material) },
          { label: 'ลวดลาย', value: text(a.pattern) },
          { label: 'เทคนิค', value: text(a.technique) },
          { label: 'ภูมิปัญญา', value: text(a.wisdom) },
          { label: 'ภูมิปัญญาที่เกี่ยวข้อง (กรมหม่อนไหม)', value: qsds?.description ?? '' },
          { label: 'เทคนิคจากกรมหม่อนไหม', value: qsds?.technique ?? '' },
        ].filter((d) => d.value),
      };
    });
    return result(
      fabric ? await applyCraftOverrides(db, projected, 'fabric') : projected,
      count ?? 0
    );
  }
  if (section === 'groups') {
    const { data, error } = await db
      .from(process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections')
      .select('content')
      .eq('section_key', 'performance-groups')
      .maybeSingle();
    if (error) throw new Error('อ่านวงดนตรีไม่ได้');
    const groups = (
      Array.isArray(data?.content?.groups) ? (data.content.groups as Record<string, unknown>[]) : []
    ).filter(
      (a) => a.isPublished !== false && (a.provinceCode === code || a.provinceName === name)
    );
    return result(
      groups.slice(page * pageSize, (page + 1) * pageSize).map((a) => ({
        id: text(a.id) || text(a.name),
        title: text(a.name),
        subtitle: text(a.category),
        description: text(a.description),
        sourceUrl: text(a.sourceUrl),
        imageUrl: text(a.logoUrl),
        detailUrl: `/performance-groups/${encodeURIComponent(text(a.id) || text(a.name))}/`,
        details: [
          { label: 'จังหวัด', value: name },
          { label: 'แหล่งข้อมูล', value: text(a.sourceLabel) },
        ].filter((d) => d.value),
      })),
      groups.length
    );
  }
  if (section === 'events') {
    const { data, count, error } = await db
      .from(process.env.EVENTS_TABLE ?? 'events')
      .select(
        'id,slug,title,description,starts_at,ends_at,location,organizer,source_label,source_url',
        { count: 'exact' }
      )
      .eq('is_active', true)
      .or(`province_code.eq.${code},province_name.eq.${name}`)
      .order('starts_at', { ascending: false })
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error('อ่านกิจกรรมไม่ได้');
    return result(
      (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: text(a.organizer),
        description: text(a.description),
        sourceUrl: text(a.source_url),
        detailUrl: `/events/${encodeURIComponent(a.slug || a.id)}/`,
        details: [
          { label: 'เริ่มกิจกรรม', value: text(a.starts_at) },
          { label: 'สิ้นสุดกิจกรรม', value: text(a.ends_at) },
          { label: 'สถานที่', value: text(a.location) },
          { label: 'แหล่งข้อมูล', value: text(a.source_label) },
        ].filter((d) => d.value),
      })),
      count ?? 0
    );
  }
  if (section === 'artists') {
    const directory = await getCulturalArtistDirectory();
    const artists = filterCulturalArtists(directory.artists, { provinceCode: code, q: query });
    return result(
      artists.slice(page * pageSize, (page + 1) * pageSize).map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: a.genres.join(' · ') || a.fields.join(' · '),
        description: a.aliases.join(' · '),
        sourceUrl: a.sources[0]?.url ?? '',
        sourceUrls: [
          ...new Set([
            ...a.sources.map((source) => source.url),
            ...a.provinceAssociations
              .filter((p) => !code || p.provinceCode === code)
              .map((p) => p.sourceUrl),
          ]),
        ],
        imageUrl: a.image?.url,
        imageCredit: a.image?.credit,
        details: [
          {
            label: 'ประเภท',
            value: a.types
              .map((type) => ARTIST_GROUPS.find((group) => group.key === type)?.label ?? type)
              .join(' · '),
          },
          {
            label: 'ความเกี่ยวข้องกับจังหวัด',
            value: a.provinceAssociations
              .filter((p) => !code || p.provinceCode === code)
              .map(
                (p) =>
                  ({
                    birthplace: 'จังหวัดเกิด',
                    origin: 'ภูมิลำเนา',
                    work_area: 'พื้นที่ทำงาน',
                    learning_site: 'แหล่งเรียนรู้',
                    cultural_legacy: 'มรดกผลงานวัฒนธรรม',
                  })[p.relationship]
              )
              .join(' · '),
          },
          {
            label: 'จังหวัดที่มีหลักฐาน',
            value:
              [...new Set(a.provinceAssociations.map((p) => p.provinceName))].join(' · ') ||
              'อยู่ระหว่างตรวจสอบจังหวัด',
          },
          { label: 'สาขา', value: a.fields.join(' · ') },
          {
            label: 'ประวัติการยกย่องตามต้นทาง',
            value: a.recognitions
              .map((r) => `พ.ศ. ${r.yearBE} ${r.field} ${r.specialty}`)
              .join('\n'),
          },
          {
            label: 'รางวัล',
            value: a.awards?.map((r) => `${r.title} พ.ศ. ${r.yearBE}`).join('\n') ?? '',
          },
        ].filter((d) => d.value),
      })),
      artists.length
    );
  }
  if (section === 'ethnic') {
    const records = filterEthnicGroups(await getEthnicGroupDirectory(db), {
      province: name,
      q: query,
    });
    return result(
      records.slice(page * pageSize, (page + 1) * pageSize).map((a) => ({
        id: a.id,
        title: a.village || a.title,
        subtitle: a.groups.join(' · '),
        description: a.description,
        sourceUrl: a.sourceUrl,
        ...(a.latitude !== null && a.longitude !== null
          ? {
              mapUrl: `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`,
            }
          : {}),
        details: [
          { label: 'กลุ่มตามต้นทาง', value: a.groups.join(' · ') },
          {
            label: 'พื้นที่',
            value: [a.subDistrict, a.district, a.province].filter(Boolean).join(' · '),
          },
          {
            label: 'พิกัด',
            value:
              a.latitude !== null && a.longitude !== null
                ? `${a.latitude}, ${a.longitude} — จุดอ้างอิงตามต้นทาง ไม่ใช่ขอบเขตพื้นที่`
                : 'ยังไม่มีพิกัดยืนยัน',
          },
          { label: 'แหล่งข้อมูล', value: a.sourceName },
        ],
      })),
      records.length
    );
  }
  const records = await getCulturalHeritage({
    collection: section === 'community' ? 'community' : 'registry',
    category: options.category,
    recordId: options.recordId,
    province: name,
    query,
    page,
    limit: pageSize,
  });
  const projected = records.data.map((a) => ({
    id: a.id,
    craftCategory: section === 'community' ? getPrimaryCraftCategory(a.categories) : undefined,
    title: a.name,
    subtitle: a.categories.join(' · '),
    description: a.description || a.practice || a.note,
    sourceUrl: a.sourceUrl,
    sourceUrls: a.sourceUrls,
    ...(a.latitude !== null && a.longitude !== null && a.latitude !== 0 && a.longitude !== 0
      ? { mapUrl: `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}` }
      : {}),
    details: [
      { label: 'จังหวัด', value: a.province },
      { label: 'พื้นที่ปฏิบัติ', value: a.practice },
      { label: 'เทคนิคและภูมิปัญญา', value: a.technique },
      { label: 'วิถีชีวิต', value: a.lifestyle },
      { label: 'ปีขึ้นบัญชีระดับชาติ', value: a.nationalYear },
      { label: 'ปีขึ้นบัญชีระดับจังหวัด', value: a.provincialYear },
      { label: 'หมายเหตุ', value: a.note },
      { label: 'ผู้เผยแพร่', value: a.organization },
    ].filter((d) => d.value),
  }));
  return result(
    section === 'community' ? await applyCraftOverrides(db, projected, 'community') : projected,
    records.total
  );
}

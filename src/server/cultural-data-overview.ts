import type { SupabaseClient } from '@supabase/supabase-js';

import { SYSTEM_CULTURE_CATEGORIES } from 'src/lib/culture-categories';
import { ARTIST_GROUPS, COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';

import { getCulturalArtistDirectory } from './cultural-artists';
import { getCulturalDataInventory } from './cultural-data-inventory';
import crafts from '../../data/cultural-heritage/community-crafts.json';
import weaving from '../../data/cultural-heritage/community-weaving.json';
import { HERITAGE_SOURCE_URL, getAllHeritageRecords } from './cultural-heritage';
import { getEthnicGroupDirectory, ETHNIC_GROUPS_SOURCE_URL } from './ethnic-groups';

export type OverviewCategory = {
  key: string;
  label: string;
  count: number | null;
  href: string;
  source: string;
};
export type OverviewSection = {
  key: string;
  title: string;
  total: number | null;
  description: string;
  href: string;
  permission: string;
  sources: { label: string; url: string }[];
  rows: OverviewCategory[];
  error?: string;
};
export async function getCulturalDataOverview(db: SupabaseClient) {
  const [inventory, directory, heritage, categories, ethnicGroups] = await Promise.all([
    getCulturalDataInventory(db),
    getCulturalArtistDirectory().catch(() => null),
    getAllHeritageRecords().catch(() => null),
    Promise.all(
      SYSTEM_CULTURE_CATEGORIES.map(async (category): Promise<OverviewCategory> => {
        const { count, error } = await db
          .from(process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.key)
          .abortSignal(AbortSignal.timeout(15000));
        return {
          key: category.key,
          label: category.label,
          count: error ? null : count,
          href: `/admin/cultural-places?category=${category.key}`,
          source: 'ททท. / แค็ตตาล็อกวัฒนธรรม / แหล่งที่นำเข้า',
        };
      })
    ),
    getEthnicGroupDirectory(db).catch(() => null),
  ]);
  const countOf = (key: string) => inventory.data.find((row) => row.key === key)?.count ?? null;
  const community = [...weaving, ...crafts];
  const allPlaces = countOf('places_all');
  const known = categories.every((row) => row.count !== null)
    ? categories.reduce((sum, row) => sum + (row.count ?? 0), 0)
    : null;
  if (allPlaces !== null && known !== null && allPlaces > known)
    categories.push({
      key: 'other',
      label: 'อื่น ๆ / ยังไม่จัดหมวดมาตรฐาน',
      count: allPlaces - known,
      href: '/admin/cultural-places',
      source: 'ตรวจหมวดในรายการสถานที่',
    });
  const heritageLabels = [
    'วรรณกรรมพื้นบ้านและภาษา',
    'ศิลปะการแสดง',
    'แนวปฏิบัติทางสังคม พิธีกรรม ประเพณี และเทศกาล',
    'ความรู้และการปฏิบัติเกี่ยวกับธรรมชาติและจักรวาล',
    'งานช่างฝีมือดั้งเดิม',
    'การเล่นพื้นบ้าน กีฬาพื้นบ้าน และศิลปะการต่อสู้ป้องกันตัว',
  ];
  const sections: OverviewSection[] = [
    {
      key: 'places',
      title: 'สถานที่และข้อมูลวัฒนธรรมเชิงพื้นที่',
      permission: 'cultural_places',
      total: allPlaces,
      href: '/admin/cultural-places',
      description:
        'จำนวนแถวสถานที่ที่เก็บในฐานข้อมูล อาจซ้ำข้ามแหล่ง หมวดด้านล่างนับตามค่าหมวดต้นฉบับก่อนการแก้ไขรายสถานที่',
      sources: [
        {
          label: `ททท. · ${countOf('tat') ?? 'ตรวจไม่ได้'} รายการ`,
          url: 'https://datacatalog.tat.or.th/',
        },
        {
          label: `แค็ตตาล็อกวัฒนธรรม · ${countOf('culture_catalog') ?? 'ตรวจไม่ได้'} รายการ`,
          url: 'https://culture.gdcatalog.go.th/',
        },
        {
          label: `ศาสนสถาน กระทรวงวัฒนธรรม · ${countOf('religious_places') ?? 'ตรวจไม่ได้'} รายการ`,
          url: 'https://gdcatalog.m-culture.go.th/',
        },
      ],
      rows: categories,
    },
    {
      key: 'artists',
      title: 'ศิลปินและผู้สร้างสรรค์',
      permission: 'cultural_artists',
      total: directory?.artists.length ?? null,
      href: '/admin/cultural-artists',
      description:
        'นับรายชื่อหลังรวมชื่อซ้ำ คนหนึ่งอยู่ได้หลายประเภท จำนวนย่อยจึงบวกแทนยอดรวมไม่ได้ รายที่ยังไม่ยืนยันจังหวัดยังอยู่ในยอดทั้งหมด',
      sources: directory?.sources.map((source) => ({ label: source.title, url: source.url })) ?? [],
      rows: ARTIST_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        count: directory
          ? directory.artists.filter((artist) => artist.types.some((type) => type === group.key))
              .length
          : null,
        href: `/admin/cultural-artists/group/${group.key}`,
        source: group.source,
      })),
    },
    {
      key: 'heritage',
      title: 'ทะเบียนมรดกภูมิปัญญาทางวัฒนธรรม',
      permission: 'cultural_heritage',
      total: heritage?.length ?? null,
      href: '/admin/cultural-heritage',
      description:
        'อ่านจาก CKAN ของกรมส่งเสริมวัฒนธรรม ไม่ใช่ข้อมูลที่นำเข้าเก็บในฐานข้อมูล รายการหนึ่งอยู่ได้หลายหมวด',
      sources: [{ label: 'กรมส่งเสริมวัฒนธรรม ผ่าน Data.go.th', url: HERITAGE_SOURCE_URL }],
      rows: heritageLabels.map((label, i) => ({
        key: String(i),
        label,
        count: heritage ? heritage.filter((item) => item.categories.includes(label)).length : null,
        href: `/admin/cultural-heritage?category=${encodeURIComponent(label)}`,
        source: 'กรมส่งเสริมวัฒนธรรม',
      })),
      ...(!heritage
        ? { error: 'อ่านทะเบียนไม่ครบหรือไม่สามารถเชื่อมต่อต้นทาง จึงยังไม่แสดงจำนวนแยกหมวด' }
        : {}),
    },
    {
      key: 'community',
      title: 'วิถีชีวิตและหัตถกรรมชุมชน',
      permission: 'cultural_heritage',
      total: community.length,
      href: '/admin/cultural-heritage?collection=community',
      description:
        'ชุดรวบรวมเพิ่มที่เก็บในโปรเจกต์ พร้อมลิงก์อ้างอิงรายเรื่อง หมวดซ้อนกันได้ ไม่ใช้แทนทะเบียนมรดกหรือสถานะ OTOP ปัจจุบัน',
      sources: [
        ...new Map(
          community.map((item) => [
            item.organization,
            { label: item.organization, url: item.sourceUrl },
          ])
        ).values(),
      ],
      rows: COMMUNITY_GROUPS.map((group) => {
        const matches = community.filter((item) => item.categories.includes(group.category));
        return {
          key: group.key,
          label: group.label,
          count: matches.length,
          href: `/admin/cultural-heritage/group/${group.key}`,
          source: [...new Set(matches.map((item) => item.organization))].join(' · '),
        };
      }),
    },
  ];
  sections.push({
    key: 'ethnic-groups',
    title: 'กลุ่มชาติพันธุ์และชุมชน',
    permission: 'cultural_places',
    total: ethnicGroups?.length ?? null,
    href: '/admin/ethnic-groups',
    description:
      'รวมรายการพื้นที่/ชุมชนต้นฉบับและชุดเสริมที่มีแหล่งอ้างอิง ชื่อกลุ่มต่างภาษาอาจหมายถึงกลุ่มเดียวกัน จึงไม่ใช่จำนวนกลุ่มชาติพันธุ์ที่แตกต่างกันของประเทศ',
    sources: [
      { label: 'Open Development Thailand', url: ETHNIC_GROUPS_SOURCE_URL },
      { label: 'วิกิชุมชน ศูนย์มานุษยวิทยาสิรินธร', url: 'https://wikicommunity.sac.or.th/' },
    ],
    rows: [...new Set(ethnicGroups?.flatMap((item) => item.groups).filter(Boolean) ?? [])]
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((group) => ({
        key: group,
        label: group,
        count: ethnicGroups?.filter((item) => item.groups.includes(group)).length ?? null,
        href: `/admin/ethnic-groups?group=${encodeURIComponent(group)}`,
        source: [
          ...new Set(
            ethnicGroups
              ?.filter((item) => item.groups.includes(group))
              .map((item) => item.sourceName) ?? []
          ),
        ].join(' · '),
      })),
  });
  return { sections, categorySettingsCount: countOf('categories'), checkedAt: inventory.checkedAt };
}

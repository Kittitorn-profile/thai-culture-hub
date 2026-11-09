import { getDatasetVisibility } from './dataset-visibility';
import { getCommunityHeritageEdits } from './community-heritage-edits';
import qsdsTextiles from '../../data/cultural-heritage/qsds-textiles.json';
import communityCrafts from '../../data/cultural-heritage/community-crafts.json';
import communityWeaving from '../../data/cultural-heritage/community-weaving.json';

export const HERITAGE_RESOURCE_ID = '6400e87c-e5b2-4335-a4b2-6c6e21539f48';
export const HERITAGE_SOURCE_URL = 'https://data.go.th/dataset/ich_51_02';
const CATEGORY_FIELDS = {
  Literature: 'วรรณกรรมพื้นบ้านและภาษา',
  Arts: 'ศิลปะการแสดง',
  Festival: 'แนวปฏิบัติทางสังคม พิธีกรรม ประเพณี และเทศกาล',
  Knowledge: 'ความรู้และการปฏิบัติเกี่ยวกับธรรมชาติและจักรวาล',
  Craft: 'งานช่างฝีมือดั้งเดิม',
  'Folk games': 'การเล่นพื้นบ้าน กีฬาพื้นบ้าน และศิลปะการต่อสู้ป้องกันตัว',
};
function text(value: unknown) {
  return value === null || value === undefined || value === '-' ? '' : String(value).trim();
}
function coordinate(value: unknown, max: number) {
  if (!text(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
}
export function mapHeritageRecord(row: Record<string, unknown>) {
  return {
    id: text(row._id ?? row.id),
    image:
      row.image &&
      typeof row.image === 'object' &&
      'url' in row.image &&
      typeof row.image.url === 'string'
        ? {
            url: row.image.url,
            credit: 'credit' in row.image ? String(row.image.credit ?? '') : '',
            ...('sourceUrl' in row.image &&
            typeof row.image.sourceUrl === 'string' &&
            /^https?:\/\//.test(row.image.sourceUrl)
              ? { sourceUrl: row.image.sourceUrl }
              : {}),
          }
        : undefined,
    description: text(row.description),
    technique: text(row.technique),
    lifestyle: text(row.lifestyle),
    sourceUrl: text(row.sourceUrl) || HERITAGE_SOURCE_URL,
    sourceUrls: Array.isArray(row.sourceUrls)
      ? row.sourceUrls.filter((url): url is string => typeof url === 'string')
      : [],
    organization: text(row.organization),
    checkedAt: text(row.checkedAt),
    name: text(row.Name),
    province: text(row.Province),
    region: text(row.Region),
    categories: Object.entries(CATEGORY_FIELDS)
      .filter(([field]) => Number(row[field]) > 0)
      .map(([, label]) => label),
    nationalYear: text(row.TH_Year),
    provincialYear: text(row.PV_Year),
    status: text(row.Status),
    practice: text(row.Practice),
    note: text(row.Remark_TH_PV),
    latitude: coordinate(row.Latitude, 90),
    longitude: coordinate(row.Longitude, 180),
  };
}
export type HeritageRecord = ReturnType<typeof mapHeritageRecord>;

export async function getCulturalHeritage({
  query = '',
  province = '',
  page = 0,
  limit = 20,
  collection = 'registry',
  publicOnly = false,
  category = '',
  recordId = '',
}: {
  collection?: 'registry' | 'community';
  publicOnly?: boolean;
  category?: string;
  recordId?: string;
  query?: string;
  province?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: HeritageRecord[];
  total: number;
  page: number;
  limit: number;
  sourceUrl: string | null;
  collectionTotal?: number;
  collectionProvinces?: number;
  categories?: string[];
}> {
  if (collection === 'community') {
    const q = query.trim().toLocaleLowerCase('th');
    const hidden = publicOnly ? (await getDatasetVisibility()).hidden : [];
    const baseCommunity = [
      ...(hidden.includes('community_weaving') ? [] : communityWeaving),
      ...(hidden.includes('community_crafts') ? [] : communityCrafts),
    ];
    const edits = await getCommunityHeritageEdits();
    const merged = new Map(baseCommunity.map((item) => [item.id, item]));
    for (const item of edits) {
      if (item.deleted) {
        merged.delete(item.id);
        continue;
      }
      const source = item.group === 'weaving' ? 'community_weaving' : 'community_crafts';
      if (!hidden.includes(source)) merged.set(item.id, item as (typeof baseCommunity)[number]);
    }
    const community = [...merged.values()];
    const matches = community.filter(
      (item) =>
        (!recordId || item.id === recordId) &&
        (!province || item.province === province) &&
        (!category || item.categories.includes(category)) &&
        (!q ||
          [
            item.name,
            item.province,
            item.practice,
            item.description,
            item.technique,
            item.lifestyle,
            item.organization,
            ...item.categories,
          ]
            .join(' ')
            .toLocaleLowerCase('th')
            .includes(q))
    );
    return {
      data: matches.slice(page * limit, (page + 1) * limit).map((item) => ({
        ...mapHeritageRecord({
          _id: item.id,
          Name: item.name,
          Province: item.province,
          Region: item.region,
          Practice: item.practice,
          ...item,
          sourceUrls: [
            item.sourceUrl,
            ...qsdsTextiles.items
              .filter((source) => source.recordType === 'community' && source.recordId === item.id)
              .map((source) => source.sourceUrl),
          ],
        }),
        categories: item.categories,
      })),
      total: matches.length,
      page,
      limit,
      sourceUrl: null,
      collectionTotal: community.length,
      collectionProvinces: new Set(community.map((item) => item.province).filter(Boolean)).size,
      categories: [...new Set(community.flatMap((item) => item.categories))].sort((a, b) =>
        a.localeCompare(b, 'th')
      ),
    };
  }
  if (category) {
    const matches = (await getAllHeritageRecords()).filter(
      (item) =>
        item.categories.includes(category) &&
        (!province || item.province === province) &&
        (!query || [item.name, item.practice, item.note].join(' ').includes(query))
    );
    return {
      data: matches.slice(page * limit, (page + 1) * limit),
      total: matches.length,
      page,
      limit,
      sourceUrl: HERITAGE_SOURCE_URL,
    };
  }
  const url = new URL('https://data.go.th/api/3/action/datastore_search');
  url.searchParams.set('resource_id', HERITAGE_RESOURCE_ID);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(page * limit));
  url.searchParams.set('sort', '_id asc');
  if (query) url.searchParams.set('q', query);
  if (province || recordId)
    url.searchParams.set(
      'filters',
      JSON.stringify({
        ...(province ? { Province: province } : {}),
        ...(recordId ? { _id: Number(recordId) } : {}),
      })
    );
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อแหล่งข้อมูลได้ กรุณาลองใหม่');
  const json = await response.json();
  if (
    json.success !== true ||
    !Array.isArray(json.result?.records) ||
    !Number.isFinite(json.result?.total)
  )
    throw new Error('รูปแบบข้อมูลจาก CKAN ไม่ถูกต้อง');
  return {
    data: json.result.records.map(mapHeritageRecord) as HeritageRecord[],
    total: json.result.total as number,
    page,
    limit,
    sourceUrl: HERITAGE_SOURCE_URL,
  };
}

/** Read all pages before computing category totals; fail instead of reporting partial counts. */
export async function getAllHeritageRecords(): Promise<HeritageRecord[]> {
  const first = await getCulturalHeritage({ limit: 1000 });
  const size = first.data.length;
  if (first.total > 100000 || (first.total && !size))
    throw new Error('ไม่สามารถอ่านทะเบียนครบชุดได้');
  const pages = await Promise.all(
    Array.from({ length: size ? Math.ceil(first.total / size) - 1 : 0 }, (_, i) =>
      getCulturalHeritage({ limit: size, page: i + 1 })
    )
  );
  const records = [...first.data, ...pages.flatMap((page) => page.data)];
  if (
    records.length !== first.total ||
    new Set(records.map((record) => record.id)).size !== first.total
  )
    throw new Error('ทะเบียนต้นทางเปลี่ยนหรืออ่านได้ไม่ครบชุด');
  return records;
}

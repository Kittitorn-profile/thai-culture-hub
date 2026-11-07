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
}: {
  query?: string;
  province?: string;
  page?: number;
  limit?: number;
}) {
  const url = new URL('https://data.go.th/api/3/action/datastore_search');
  url.searchParams.set('resource_id', HERITAGE_RESOURCE_ID);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(page * limit));
  url.searchParams.set('sort', '_id asc');
  if (query) url.searchParams.set('q', query);
  if (province) url.searchParams.set('filters', JSON.stringify({ Province: province }));
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

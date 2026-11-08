import provinces from 'src/data/thailand-culture/provinces';

/** Search suggestions, not verified person-to-heritage relationships. */
const TOPICS = [
  'หมอลำ',
  'กันตรึม',
  'เพลงโคราช',
  'หนังตะลุง',
  'โนรา',
  'โขน',
  'ลิเก',
  'ลำตัด',
  'ผญา',
  'โหวด',
  'แคน',
  'ฟ้อน',
  'ทอผ้า',
  'จักสาน',
];
export function culturalTopics(text: string) {
  return TOPICS.filter((topic) => text.includes(topic));
}
export function culturalExploreUrl(target: 'artists' | 'heritage', query = '', province = '') {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim().slice(0, 200));
  const found = provinces.find((item) => item.code === province || item.name === province);
  if (found)
    params.set(
      target === 'artists' ? 'provinceCode' : 'province',
      target === 'artists' ? found.code : found.name
    );
  return `/admin/cultural-${target === 'artists' ? 'artists' : 'heritage'}/${params.size ? `?${params}` : ''}`;
}
export function culturalInitialFilters(
  params: Record<string, string | string[] | undefined>,
  target: 'artists' | 'heritage'
) {
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : '';
  const raw = target === 'artists' ? params.provinceCode : params.province;
  const province =
    typeof raw === 'string'
      ? provinces.find((item) => item.code === raw || item.name === raw)
      : undefined;
  return {
    query,
    province: province ? (target === 'artists' ? province.code : province.name) : null,
  };
}

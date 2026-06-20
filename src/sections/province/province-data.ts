import provinces from 'src/data/thailand-culture/provinces';

export type CulturalCategory =
  | 'tourist_attraction'
  | 'heritage'
  | 'temple'
  | 'nature'
  | 'museum'
  | 'craft'
  | 'landmark'
  | 'cultural_attraction'
  | 'festival'
  | 'folk_art'
  | 'food'
  | 'costume'
  | 'learning_center'
  | 'moral_community'
  | 'local_tradition'
  | 'ritual'
  | 'local_food'
  | 'performing_art'
  | 'craftsmanship'
  | 'community_wisdom';

export type CulturalPlace = {
  id: string;
  name: string;
  district: string;
  category: CulturalCategory;
  lat: number;
  lng: number;
  description: string;
  highlight: string;
  imageUrls?: string[];
  sourceUrl?: string;
  mapUrl?: string;
  source?:
    | 'local'
    | 'tat'
    | 'culture_catalog'
    | 'finearts_monument'
    | 'finearts_archeology'
    | 'finearts_buddha'
    | 'finearts_museum';
};

export type CultureMetric = {
  label: string;
  value: string;
};

const PROVINCE_NAMES_TH: Record<string, string> = Object.fromEntries(
  provinces.map((province) => [province.code, province.name])
);

// Local seed places are disabled so map/detail data comes from service APIs only.
const CULTURAL_PLACES_BY_PROVINCE: Record<string, CulturalPlace[]> = {};

export const CULTURE_CATEGORY_LABELS: Record<CulturalCategory, string> = {
  tourist_attraction: 'สถานที่ท่องเที่ยว',
  heritage: 'ประวัติศาสตร์',
  temple: 'ศาสนสถาน',
  nature: 'ธรรมชาติ',
  museum: 'พิพิธภัณฑ์',
  landmark: 'แลนด์มาร์ก',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  festival: 'เทศกาล',
  folk_art: 'ศิลปะพื้นบ้าน',
  craft: 'หัตถกรรม',
  food: 'อาหาร',
  costume: 'การแต่งกาย',
  learning_center: 'แหล่งเรียนรู้',
  moral_community: 'ชุมชนคุณธรรม',
  local_tradition: 'ประเพณีท้องถิ่น',
  ritual: 'พิธีกรรม',
  local_food: 'อาหารพื้นบ้าน',
  performing_art: 'ศิลปะการแสดง',
  craftsmanship: 'งานช่างฝีมือ',
  community_wisdom: 'ภูมิปัญญาชุมชน',
};

export const CULTURE_CATEGORY_COLORS: Record<CulturalCategory, string> = {
  tourist_attraction: '#608D8C',
  local_food: '#D19F46',
  performing_art: '#CE7B48',
  local_tradition: '#947488',
  craftsmanship: '#5B7B91',
  folk_art: '#AB8395',
  ritual: '#B2865A',
  heritage: '#8F3D20',
  temple: '#C89B3C',

  museum: '#5A6F8F',
  landmark: '#7A5AA6',
  cultural_attraction: '#A45C2B',
  festival: '#C23B68',

  craft: '#4E6C9D',
  food: '#B85C2E',
  costume: '#7652A8',
  learning_center: '#3F6F8D',

  nature: '#7E9578',
  moral_community: '#7E9578',
  community_wisdom: '#7E9578',
};

export function getProvinceDisplayName(provinceId: string, provinceName?: string) {
  if (PROVINCE_NAMES_TH[provinceId]) {
    return PROVINCE_NAMES_TH[provinceId];
  }

  return (provinceName || provinceId).replace(/\s+Province$/i, '');
}

export function getProvinceCulturalPlaces(
  provinceId: string,
  provinceName?: string
): CulturalPlace[] {
  return CULTURAL_PLACES_BY_PROVINCE[provinceId] ?? [];
}

export function getCultureMetrics(places: CulturalPlace[]): CultureMetric[] {
  const categoryCount = new Set(places.map((place) => place.category)).size;
  const districtCount = new Set(places.map((place) => place.district)).size;

  return [
    { label: 'สถานที่แนะนำ', value: `${places.length}` },
    { label: 'หมวดวัฒนธรรม', value: `${categoryCount}` },
    { label: 'พื้นที่/อำเภอ', value: `${districtCount}` },
    { label: 'พิกัดบนแผนที่', value: places.length ? 'พร้อมสำรวจ' : 'รอข้อมูล' },
  ];
}

import provinces from 'src/data/thailand-culture/provinces';

export type CulturalCategory = string;

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
  provinceName?: string;
  source?:
    | 'local'
    | 'tat'
    | 'culture_catalog'
    | 'thailand_cultural_hub'
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
  const districtCount = new Set(places.map((place) => place.district).filter(Boolean)).size;

  return [
    { label: 'สถานที่แนะนำ', value: `${places.length}` },
    { label: 'หมวดวัฒนธรรม', value: `${categoryCount}` },
    { label: 'พื้นที่/อำเภอ', value: `${districtCount}` },
    { label: 'พิกัดบนแผนที่', value: places.length ? 'พร้อมสำรวจ' : 'รอข้อมูล' },
  ];
}

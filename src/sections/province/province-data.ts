import provinces from 'src/data/thailand-culture/provinces';

export type CulturalCategory = string;

export type CulturalPlaceDetails = {
  placeId: string;
  provinceCode?: string | null;
  nameTh?: string | null;
  nameEn?: string | null;
  detailTh?: string | null;
  detailEn?: string | null;
  nearbyLocation?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  typeId?: string | null;
  typeLabel?: string | null;
  address?: string | null;
  addressAlley?: string | null;
  addressRoad?: string | null;
  provinceNameTh?: string | null;
  districtNameTh?: string | null;
  subdistrictNameTh?: string | null;
  postcode?: string | null;
  tel?: string | null;
  email?: string | null;
  openingHours?: string | null;
  feeTh?: string | null;
  feeThKid?: string | null;
  feeEn?: string | null;
  feeEnKid?: string | null;
  activity?: string | null;
  highlight?: string | null;
  reward?: string | null;
  suitableDuration?: string | null;
  marketLimitation?: string | null;
  marketChance?: string | null;
  rule?: string | null;
  accessibility?: string | null;
  facilitiesContact?: string | null;
  travelerPreparation?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  line?: string | null;
  credit?: string | null;
  cash?: string | null;
  payment?: string | null;
  remark?: string | null;
  bookingDetail?: string | null;
  sourceAttId?: string | null;
  sourcePayload?: Record<string, unknown> | null;
  updatedAt?: string | null;
  updatedById?: string | null;
  updatedByEmail?: string | null;
  updatedByName?: string | null;
};

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
  details?: CulturalPlaceDetails | null;
  source?:
    | 'local'
    | 'tat'
    | 'culture_catalog'
    | 'religious_places'
    | 'cpot_products'
    | 'thai_fabric_wisdom'
    | 'ethnic_groups'
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

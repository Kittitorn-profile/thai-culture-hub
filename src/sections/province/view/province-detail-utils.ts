import type { CulturalPlace } from '../province-data';

export const CULTURAL_PLACE_CARD_IMAGES = [
  '/assets/images/mock/travel/travel-1.webp',
  '/assets/images/mock/travel/travel-3.webp',
  '/assets/images/mock/travel/travel-7.webp',
  '/assets/images/mock/travel/travel-10.webp',
  '/assets/images/mock/travel/travel-14.webp',
];

export function getCulturalPlaceCardImage(index: number) {
  return CULTURAL_PLACE_CARD_IMAGES[index % CULTURAL_PLACE_CARD_IMAGES.length];
}

export function getPlaceImages(place: CulturalPlace, index: number) {
  return place.imageUrls?.map(cleanCulturalUrl).filter(Boolean) ?? [];
}

const EMPTY_TEXT_VALUES = new Set([
  '',
  '-',
  'null',
  'undefined',
  'n/a',
  'na',
  'none',
  'ไม่มีข้อมูล',
  'ไม่ระบุ',
]);

export function cleanCulturalText(value?: string | number | null) {
  const text = `${value ?? ''}`
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return EMPTY_TEXT_VALUES.has(text.toLowerCase()) ? '' : text;
}

export function hasCulturalText(value?: string | number | null) {
  return Boolean(cleanCulturalText(value));
}

export function cleanCulturalUrl(value?: string | null) {
  const url = cleanCulturalText(value);

  if (!url || /^(about:blank|#)$/i.test(url)) {
    return '';
  }

  return url;
}

export function mergeCulturalPlaces(...placeGroups: CulturalPlace[][]) {
  const placeMap = new Map<string, CulturalPlace>();

  placeGroups.flat().forEach((place) => {
    const key = `${place.name}-${place.district}-${place.lat}-${place.lng}`;

    if (!placeMap.has(key)) {
      placeMap.set(key, place);
    }
  });

  return Array.from(placeMap.values());
}

export function getSourceLabel(source?: CulturalPlace['source']) {
  if (source === 'tat') {
    return 'ททท.';
  }

  if (
    source === 'finearts_monument' ||
    source === 'finearts_archeology' ||
    source === 'finearts_buddha' ||
    source === 'finearts_museum'
  ) {
    return 'กรมศิลป์';
  }

  if (source === 'culture_catalog') {
    return 'ข้อมูลวัฒนธรรม';
  }

  if (source === 'religious_places') {
    return 'ศาสนสถาน';
  }

  if (source === 'thailand_cultural_hub') {
    return 'ข้อมูลจาก Thailand Cultural Hub';
  }

  return 'ข้อมูลในระบบ';
}

export function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

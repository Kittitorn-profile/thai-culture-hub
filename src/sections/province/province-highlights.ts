import type { CulturalPlace } from './province-data';

import highlights from '../../../data/province-highlights/highlights.json';

export const PROVINCE_HIGHLIGHTS: Record<
  string,
  { names: string[]; title: string; theme: string; summary: string; sourceUrl: string }[]
> = {
  ...highlights,
  'TH-44': [
    {
      names: ['พระธาตุนาดูน', 'พระบรมธาตุนาดูน'],
      title: 'พระธาตุนาดูน',
      theme: 'ศรัทธาและประวัติศาสตร์',
      summary: 'พุทธมณฑลแห่งอีสานและพื้นที่เรียนรู้ประวัติศาสตร์นครจำปาศรี',
      sourceUrl: 'https://mahasarakham.prd.go.th/th/content/category/detail/id/118/iid/17661',
    },
    {
      names: ['กู่สันตรัตน์'],
      title: 'กู่สันตรัตน์',
      theme: 'โบราณสถาน',
      summary: 'ปราสาทศิลาแลงศิลปะขอมแบบบายนในอำเภอนาดูน',
      sourceUrl: 'https://mahasarakham.prd.go.th/th/content/category/detail/id/33/iid/480687',
    },
    {
      names: ['สะพานไม้แกดำ'],
      title: 'สะพานไม้แกดำ',
      theme: 'วิถีชุมชนและธรรมชาติ',
      summary: 'สะพานไม้เหนือหนองแกดำ เชื่อมวิถีชุมชนกับภูมิทัศน์แหล่งน้ำ',
      sourceUrl: 'https://mahasarakham.prd.go.th/th/content/category/detail/id/118/iid/11165',
    },
    {
      names: ['กู่มหาธาตุ (ปรางค์กู่บ้านเขวา)', 'กู่บ้านเขวา', 'ปรางค์กู่บ้านเขวา'],
      title: 'กู่บ้านเขวา',
      theme: 'ศิลปะและมรดกวัฒนธรรม',
      summary: 'โบราณสถานศิลปะขอมแบบบายนในอำเภอเมืองมหาสารคาม',
      sourceUrl: 'https://mahasarakham.prd.go.th/th/content/category/detail/id/33/iid/490513',
    },
  ],
};
const canonical = (value: string) =>
  value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('th');
export function getProvinceHighlights(provinceCode: string, places: CulturalPlace[]) {
  return (PROVINCE_HIGHLIGHTS[provinceCode] ?? []).flatMap((highlight) => {
    const candidates = places.filter((place) =>
      highlight.names.some((name) => canonical(name) === canonical(place.name))
    );
    // Match the same attraction across imported sources; prefer its existing photo.
    const place =
      candidates.find((candidate) => candidate.imageUrls?.some(Boolean)) ?? candidates[0];
    return place ? [{ ...highlight, place }] : [];
  });
}

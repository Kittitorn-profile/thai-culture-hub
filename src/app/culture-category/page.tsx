import { publicPageMetadata } from 'src/lib/page-metadata';

import { CultureCategoryView } from 'src/sections/culture-category/view';

export const metadata = publicPageMetadata(
  'สถานที่และข้อมูลวัฒนธรรมทั้งหมด',
  'ค้นหาสถานที่ท่องเที่ยว ศาสนสถาน อาหารพื้นบ้าน งานช่างฝีมือ และภูมิปัญญาไทย เลือกตามจังหวัดและหมวดข้อมูล พร้อมรายละเอียดและแหล่งอ้างอิง',
  '/culture-category/'
);

export default function Page() {
  return <CultureCategoryView allCategories />;
}

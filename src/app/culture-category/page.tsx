import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { CultureCategoryView } from 'src/sections/culture-category/view';

export const metadata = publicPageMetadata(
  'สถานที่และข้อมูลวัฒนธรรมทั้งหมด',
  'ค้นหาสถานที่ท่องเที่ยว ศาสนสถาน อาหารพื้นบ้าน งานช่างฝีมือ และภูมิปัญญาไทย เลือกตามจังหวัดและหมวดข้อมูล พร้อมรายละเอียดและแหล่งอ้างอิง',
  '/culture-category/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('places');
  return <CultureCategoryView allCategories />;
}

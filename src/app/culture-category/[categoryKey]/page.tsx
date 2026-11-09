import { publicPageMetadata } from 'src/lib/page-metadata';
import { getCultureCategoryLabel } from 'src/lib/culture-categories';

import { CultureCategoryView } from 'src/sections/culture-category/view';

export async function generateMetadata({ params }: { params: Promise<{ categoryKey: string }> }) {
  const { categoryKey } = await params;
  const label = getCultureCategoryLabel(categoryKey);
  return publicPageMetadata(
    label,
    `สำรวจ${label}จากทั่วประเทศไทย ค้นหาตามจังหวัด พร้อมรายละเอียด รูปภาพ และแหล่งอ้างอิง`,
    `/culture-category/${encodeURIComponent(categoryKey)}/`
  );
}

export default function Page() {
  return <CultureCategoryView />;
}

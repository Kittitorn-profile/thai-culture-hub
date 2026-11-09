import { publicPageMetadata } from 'src/lib/page-metadata';

import { CulturalProductsView } from 'src/sections/cultural-products/view';

export const metadata = publicPageMetadata(
  'ผลิตภัณฑ์วัฒนธรรมไทย CPOT',
  'ค้นหาสินค้าชุมชนและผลิตภัณฑ์วัฒนธรรมไทย CPOT ตามจังหวัด เรียนรู้ผลงานท้องถิ่นและแหล่งข้อมูล',
  '/cultural-products/'
);

export default function Page() {
  return <CulturalProductsView />;
}

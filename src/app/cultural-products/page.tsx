import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { CulturalProductsView } from 'src/sections/cultural-products/view';

export const metadata = publicPageMetadata(
  'ผลิตภัณฑ์วัฒนธรรมไทย CPOT',
  'ค้นหาสินค้าชุมชนและผลิตภัณฑ์วัฒนธรรมไทย CPOT ตามจังหวัด เรียนรู้ผลงานท้องถิ่นและแหล่งข้อมูล',
  '/cultural-products/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('products');
  return <CulturalProductsView />;
}

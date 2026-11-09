import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { ThaiFabricView } from 'src/sections/thai-fabric/view';

export const metadata = publicPageMetadata(
  'ผ้าและทักษะงานช่าง',
  'เรียนรู้ผ้าไทย ลวดลาย การทอ ย้อมสี และงานช่างท้องถิ่น พร้อมแหล่งอ้างอิง',
  '/crafts/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('crafts');
  return <ThaiFabricView />;
}

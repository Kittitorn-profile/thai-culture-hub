import { Suspense } from 'react';

import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export const metadata = publicPageMetadata(
  'ผ้าและทักษะงานช่าง',
  'เรียนรู้ผ้าไทย การทอ ย้อมสี จักสาน ลวดลาย และการสืบทอดทักษะงานช่างจากท้องถิ่นทั่วไทย พร้อมแหล่งอ้างอิง',
  '/crafts/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('crafts');
  return (
    <Suspense fallback={<p>กำลังโหลดผ้าและทักษะงานช่าง…</p>}>
      <CulturalDataView group="crafts" />
    </Suspense>
  );
}

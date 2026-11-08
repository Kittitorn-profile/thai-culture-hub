import { Suspense } from 'react';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export const metadata = { title: 'ผ้าและทักษะงานช่าง | Thailand Cultural Hub' };

export default function Page() {
  return (
    <Suspense fallback={<p>กำลังโหลดผ้าและทักษะงานช่าง…</p>}>
      <CulturalDataView group="crafts" />
    </Suspense>
  );
}

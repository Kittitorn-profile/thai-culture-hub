import { Suspense } from 'react';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export function ThaiFabricView() {
  return (
    <Suspense fallback={<p>กำลังโหลดภูมิปัญญาผ้าไทย…</p>}>
      <CulturalDataView group="fabric" />
    </Suspense>
  );
}

import { Suspense } from 'react';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export function CulturalHeritageView() {
  return (
    <Suspense fallback={<p>กำลังโหลดมรดกภูมิปัญญา…</p>}>
      <CulturalDataView group="heritage" />
    </Suspense>
  );
}

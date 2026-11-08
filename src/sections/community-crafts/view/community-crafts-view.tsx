import { Suspense } from 'react';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export function CommunityCraftsView() {
  return (
    <Suspense fallback={<p>กำลังโหลดวิถีชีวิตและหัตถกรรม…</p>}>
      <CulturalDataView group="community" />
    </Suspense>
  );
}

import { Suspense } from 'react';

import { CulturalDataView } from 'src/sections/cultural-data/cultural-data-view';

export function EthnicGroupsView() {
  return (
    <Suspense fallback={<p>กำลังโหลดชุมชนชาติพันธุ์…</p>}>
      <CulturalDataView group="ethnic" />
    </Suspense>
  );
}

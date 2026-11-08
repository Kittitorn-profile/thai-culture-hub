import { Suspense } from 'react';

import CraftCorrectionView from './view';

export default function Page() {
  return (
    <Suspense>
      <CraftCorrectionView />
    </Suspense>
  );
}

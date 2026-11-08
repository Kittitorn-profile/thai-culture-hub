import { Suspense } from 'react';

import CraftCorrectionView from '../../craft-corrections/view';

export default function Page() {
  return (
    <Suspense>
      <CraftCorrectionView />
    </Suspense>
  );
}

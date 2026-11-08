import { Suspense } from 'react';

import { ProvincePlacesView } from 'src/sections/province/view/province-places-view';

export const metadata = { title: 'สำรวจสถานที่รายอำเภอ | Thailand Cultural Hub' };

export default function Page() {
  return (
    <Suspense>
      <ProvincePlacesView />
    </Suspense>
  );
}

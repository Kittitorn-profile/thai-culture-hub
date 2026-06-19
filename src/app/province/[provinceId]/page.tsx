import type { Metadata } from 'next';

import { ProvinceDetailView } from 'src/sections/province/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Thailand Cultural - Province',
};

export default function Page() {
  return <ProvinceDetailView />;
}

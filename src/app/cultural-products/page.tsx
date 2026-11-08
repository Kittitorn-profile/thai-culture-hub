import type { Metadata } from 'next';

import { CulturalProductsView } from 'src/sections/cultural-products/view';

export const metadata: Metadata = {
  title: 'ผลิตภัณฑ์วัฒนธรรม | Thailand Cultural Hub',
};

export default function Page() {
  return <CulturalProductsView />;
}

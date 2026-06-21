import type { Metadata } from 'next';

import { CultureCategoryView } from 'src/sections/culture-category/view';

export const metadata: Metadata = {
  title: 'Thailand Cultural - All Culture Data',
};

export default function Page() {
  return <CultureCategoryView allCategories />;
}

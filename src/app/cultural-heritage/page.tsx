import type { Metadata } from 'next';

import { CulturalHeritageView } from 'src/sections/cultural-heritage/view';

export const metadata: Metadata = {
  title: 'มรดกภูมิปัญญา | Thailand Cultural Hub',
};

export default function Page() {
  return <CulturalHeritageView />;
}

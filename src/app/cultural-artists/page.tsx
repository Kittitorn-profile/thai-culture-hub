import type { Metadata } from 'next';

import { CulturalArtistsView } from 'src/sections/cultural-artists/view';

export const metadata: Metadata = {
  title: 'ศิลปิน | Thailand Cultural Hub',
};

export default function Page() {
  return <CulturalArtistsView />;
}

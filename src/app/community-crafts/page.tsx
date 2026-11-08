import type { Metadata } from 'next';

import { CommunityCraftsView } from 'src/sections/community-crafts/view';

export const metadata: Metadata = {
  title: 'วิถีชีวิตและหัตถกรรม | Thailand Cultural Hub',
};

export default function Page() {
  return <CommunityCraftsView />;
}

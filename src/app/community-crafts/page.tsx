import type { Metadata } from 'next';

import { CommunityCraftsView } from 'src/sections/community-crafts/view';

export const metadata: Metadata = {
  title: 'ผ้าและทักษะงานช่าง | Thailand Cultural Hub',
};

export default function Page() {
  return <CommunityCraftsView />;
}

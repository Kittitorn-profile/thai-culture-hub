import type { Metadata } from 'next';

import { ThaiFabricView } from 'src/sections/thai-fabric/view';

export const metadata: Metadata = {
  title: 'ผ้าและทักษะงานช่าง | Thailand Cultural Hub',
};

export default function Page() {
  return <ThaiFabricView />;
}

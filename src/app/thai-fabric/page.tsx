import type { Metadata } from 'next';

import { ThaiFabricView } from 'src/sections/thai-fabric/view';

export const metadata: Metadata = {
  title: 'ภูมิปัญญาผ้าไทย | Thailand Cultural Hub',
};

export default function Page() {
  return <ThaiFabricView />;
}

import type { Metadata } from 'next';

import { EthnicGroupsView } from 'src/sections/ethnic-groups/view';

export const metadata: Metadata = {
  title: 'ชุมชนชาติพันธุ์ | Thailand Cultural Hub',
};

export default function Page() {
  return <EthnicGroupsView />;
}

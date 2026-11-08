import type { Metadata } from 'next';

import { CreatorPlaceCorrectionsView } from 'src/sections/creator/view/creator-place-corrections-view';

export const metadata: Metadata = { title: 'ร่วมพัฒนาข้อมูล | Thailand Cultural Hub' };
export default function Page() {
  return <CreatorPlaceCorrectionsView />;
}

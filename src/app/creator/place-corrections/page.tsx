import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { CreatorPlaceCorrectionsView } from 'src/sections/creator/view/creator-place-corrections-view';

export const metadata: Metadata = { title: `คำขอแก้ไขข้อมูล - ${CONFIG.appName}` };

export default function CreatorPlaceCorrectionsPage() {
  return <CreatorPlaceCorrectionsView />;
}

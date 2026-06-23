import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { PlaceCorrectionRequestView } from 'src/sections/creator/view/place-correction-request-view';

export const metadata: Metadata = { title: `ขอปรับแก้ข้อมูลสถานที่ - ${CONFIG.appName}` };

export default function CreatorPlaceCorrectionRequestPage() {
  return <PlaceCorrectionRequestView />;
}

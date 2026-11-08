import type { Metadata } from 'next';

import { HomeDataSummarySection } from 'src/sections/home/components/home-data-summary-section';

export const metadata: Metadata = { title: 'ชุดข้อมูลวัฒนธรรม | Thailand Cultural Hub' };
export default function Page() {
  return <HomeDataSummarySection />;
}

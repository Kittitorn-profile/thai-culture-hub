import { publicPageMetadata } from 'src/lib/page-metadata';

import { HomeDataSummarySection } from 'src/sections/home/components/home-data-summary-section';

export const metadata = publicPageMetadata(
  'ชุดข้อมูลวัฒนธรรมไทย',
  'สำรวจฐานข้อมูลวัฒนธรรมไทย ทั้งสถานที่ ศิลปิน มรดกภูมิปัญญา ชุมชนชาติพันธุ์ ผลิตภัณฑ์ ผ้าและทักษะงานช่าง',
  '/cultural-data/'
);
export default function Page() {
  return <HomeDataSummarySection />;
}

import { publicPageMetadata } from 'src/lib/page-metadata';

import { CulturalHeritageView } from 'src/sections/cultural-heritage/view';

export const metadata = publicPageMetadata(
  'มรดกภูมิปัญญาทางวัฒนธรรม',
  'สำรวจทะเบียนมรดกภูมิปัญญาไทย ทั้งศิลปะการแสดง ประเพณี พิธีกรรม งานช่าง และภูมิปัญญาชุมชน พร้อมข้อมูลจังหวัดและแหล่งอ้างอิง',
  '/cultural-heritage/'
);

export default function Page() {
  return <CulturalHeritageView />;
}

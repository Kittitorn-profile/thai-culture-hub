import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { CulturalHeritageView } from 'src/sections/cultural-heritage/view';

export const metadata = publicPageMetadata(
  'มรดกภูมิปัญญาทางวัฒนธรรม',
  'สำรวจทะเบียนมรดกภูมิปัญญาไทย ทั้งศิลปะการแสดง ประเพณี พิธีกรรม งานช่าง และภูมิปัญญาชุมชน พร้อมข้อมูลจังหวัดและแหล่งอ้างอิง',
  '/cultural-heritage/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('heritage');
  return <CulturalHeritageView />;
}

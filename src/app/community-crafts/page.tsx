import { publicPageMetadata } from 'src/lib/page-metadata';

import { CommunityCraftsView } from 'src/sections/community-crafts/view';

export const metadata = publicPageMetadata(
  'ผ้าและทักษะงานช่าง',
  'เรียนรู้ผ้าไทย ลวดลาย การทอ ย้อมสี และงานช่างท้องถิ่น พร้อมแหล่งอ้างอิง',
  '/crafts/'
);

export default function Page() {
  return <CommunityCraftsView />;
}

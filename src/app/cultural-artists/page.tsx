import { publicPageMetadata } from 'src/lib/page-metadata';

import { CulturalArtistsView } from 'src/sections/cultural-artists/view';

export const metadata = publicPageMetadata(
  'ศิลปินและผู้สร้างสรรค์',
  'ค้นหาศิลปินแห่งชาติ ศิลปินพื้นบ้าน และผู้สร้างสรรค์ผลงานวัฒนธรรมไทย พร้อมประวัติ ผลงาน จังหวัดที่เกี่ยวข้อง และแหล่งอ้างอิง',
  '/cultural-artists/'
);

export default function Page() {
  return <CulturalArtistsView />;
}

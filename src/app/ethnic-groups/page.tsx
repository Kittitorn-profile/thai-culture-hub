import { publicPageMetadata } from 'src/lib/page-metadata';
import { requireDatasetVisible } from 'src/server/dataset-visibility';

import { EthnicGroupsView } from 'src/sections/ethnic-groups/view';

export const metadata = publicPageMetadata(
  'กลุ่มชาติพันธุ์และชุมชน',
  'รู้จักกลุ่มชาติพันธุ์และชุมชนทั่วประเทศไทย สำรวจข้อมูลพื้นที่ วิถีชีวิต และวัฒนธรรม พร้อมแหล่งอ้างอิง',
  '/ethnic-groups/'
);

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireDatasetVisible('ethnic-groups');
  return <EthnicGroupsView />;
}

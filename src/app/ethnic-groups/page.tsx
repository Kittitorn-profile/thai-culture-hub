import { publicPageMetadata } from 'src/lib/page-metadata';

import { EthnicGroupsView } from 'src/sections/ethnic-groups/view';

export const metadata = publicPageMetadata(
  'กลุ่มชาติพันธุ์และชุมชน',
  'รู้จักกลุ่มชาติพันธุ์และชุมชนทั่วประเทศไทย สำรวจข้อมูลพื้นที่ วิถีชีวิต และวัฒนธรรม พร้อมแหล่งอ้างอิง',
  '/ethnic-groups/'
);

export default function Page() {
  return <EthnicGroupsView />;
}

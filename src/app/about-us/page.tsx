import { publicPageMetadata } from 'src/lib/page-metadata';

import { AboutView } from 'src/sections/about/view';

// ----------------------------------------------------------------------

export const metadata = publicPageMetadata(
  'เกี่ยวกับ Thailand Cultural Hub',
  'รู้จักพื้นที่เรียนรู้วัฒนธรรมไทยจากข้อมูลหลายแหล่ง พร้อมบทความและการร่วมพัฒนาข้อมูลจากสมาชิก',
  '/about-us/'
);

export default function Page() {
  return <AboutView />;
}

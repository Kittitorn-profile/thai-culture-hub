import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AboutView } from 'src/sections/about/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `เกี่ยวกับเรา - ${CONFIG.appName}`,
  description:
    'รู้จัก Thailand Cultural Hub ระบบค้นหาข้อมูลวัฒนธรรมไทย 6 ประเภท พร้อมแหล่งอ้างอิง บทความ และการร่วมเสนอข้อมูลจากสมาชิก',
};

export default function Page() {
  return <AboutView />;
}

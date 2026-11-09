import { publicPageMetadata } from 'src/lib/page-metadata';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata = publicPageMetadata(
  'ติดต่อเรา',
  'ติดต่อทีมงาน Thailand Cultural Hub สอบถามข้อมูล เสนอแนะ และร่วมพัฒนาฐานข้อมูลวัฒนธรรมไทย',
  '/contact-us/'
);

export default function Page() {
  return <ContactView />;
}

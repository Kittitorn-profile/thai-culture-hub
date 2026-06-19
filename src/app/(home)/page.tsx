import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'CODE FOR CAT | รับทำเว็บไซต์และพัฒนาแอปพลิเคชัน',
    template: '%s | CODE FOR CAT',
  },
  description:
    'CODE FOR CAT รับออกแบบและพัฒนาเว็บไซต์ Web Application และ Mobile Application แบบครบวงจร พร้อมทีม Developer และ Designer มืออาชีพ',

  keywords: [
    'รับทำเว็บไซต์',
    'พัฒนาเว็บไซต์',
    'Web Application',
    'Mobile Application',
    'Software Development',
    'Startup',
  ],

  openGraph: {
    title: 'CODE FOR CAT | Software Development Team',
    description: 'รับทำเว็บไซต์และแอปพลิเคชันแบบครบวงจร',
    type: 'website',
    locale: 'th_TH',
  },
};
export default function Page() {
  return <HomeView />;
}

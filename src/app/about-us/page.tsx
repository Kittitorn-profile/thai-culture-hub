import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AboutView } from 'src/sections/about/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เกี่ยวกับเรา - ${CONFIG.appName}` };

export default function Page() {
  return <AboutView />;
}

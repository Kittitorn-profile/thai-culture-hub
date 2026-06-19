import type { Metadata } from 'next';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ติดต่อเรา - Code for Cat` };

export default function Page() {
  return <ContactView />;
}

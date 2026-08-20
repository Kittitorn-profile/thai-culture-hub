import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SupabaseSignInView } from 'src/auth/view/supabase';

export const metadata: Metadata = {
  title: `เข้าสู่ระบบผู้ดูแล | ${CONFIG.appName}`,
  description: 'เข้าสู่ระบบสำหรับผู้ดูแล Thailand Cultural Hub',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SupabaseSignInView adminMode />;
}

export const metadata = {
  title: 'เข้าสู่ระบบ Creator | Thailand Cultural Hub',
  robots: { index: false, follow: true },
};

import { CreatorSignInView } from 'src/sections/creator/view/creator-sign-in-view';

import { GuestGuard } from 'src/auth/guard';

export default function CreatorSignInPage() {
  return (
    <GuestGuard>
      <CreatorSignInView />
    </GuestGuard>
  );
}

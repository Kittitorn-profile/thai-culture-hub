export const metadata = {
  title: 'สมัครเป็น Creator | Thailand Cultural Hub',
  robots: { index: false, follow: true },
};

import { CreatorRegisterView } from 'src/sections/creator/view/creator-register-view';

import { GuestGuard } from 'src/auth/guard';

export default function CreatorRegisterPage() {
  return (
    <GuestGuard>
      <CreatorRegisterView />
    </GuestGuard>
  );
}

import { GuestGuard } from 'src/auth/guard';

import { CreatorSignInView } from 'src/sections/creator/view/creator-sign-in-view';

export default function CreatorSignInPage() {
  return (
    <GuestGuard>
      <CreatorSignInView />
    </GuestGuard>
  );
}

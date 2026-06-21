import type { AccountDrawerProps } from './components/account-drawer';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const _account: AccountDrawerProps['data'] = [
  { label: 'หน้าแรก', href: '/admin', icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  {
    label: 'Profile',
    href: '/admin/profile',
    icon: <Iconify icon="custom:profile-duotone" />,
  },
];

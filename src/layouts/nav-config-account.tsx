import type { AccountDrawerProps } from './components/account-drawer';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const _accountCreator: AccountDrawerProps['data'] = [
  { label: 'หน้าแรก', href: '/', icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  {
    label: 'ร่วมพัฒนาข้อมูล',
    href: '/creator/place-corrections',
    icon: <Iconify icon="solar:notebook-bold-duotone" />,
  },
  {
    label: 'โปรไฟล์',
    href: '/creator/profile',
    icon: <Iconify icon="custom:profile-duotone" />,
  },
];

export const _account: AccountDrawerProps['data'] = [
  { label: 'หน้าแรก', href: '/admin', icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  {
    label: 'โปรไฟล์',
    href: '/admin/profile',
    icon: <Iconify icon="custom:profile-duotone" />,
  },
];

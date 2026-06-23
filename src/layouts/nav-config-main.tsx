import type { NavMainProps } from './main/nav/types';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData: NavMainProps['data'] = [
  {
    title: 'หน้าแรก',
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    title: 'เกี่ยวกับเรา',
    path: paths.about,
    icon: <Iconify width={22} icon="solar:users-group-rounded-bold-duotone" />,
  },
  {
    title: 'ติดต่อสอบถาม',
    path: paths.contact,
    icon: <Iconify width={22} icon="solar:inbox-in-bold-duotone" />,
  },
];

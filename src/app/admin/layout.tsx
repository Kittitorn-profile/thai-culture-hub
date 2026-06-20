'use client';

import type { NavSectionProps } from 'src/components/nav-section';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { SvgColor } from 'src/components/svg-color';

import { AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const navData: NavSectionProps['data'] = [
  {
    subheader: 'Admin',
    items: [
      {
        title: 'Home Content',
        path: '/admin/home-content',
        icon: icon('ic-blog'),
        children: [
          { title: 'เรื่องเล่าและสื่อ', path: '/admin/home-content' },
          { title: 'หมวดวัฒนธรรม', path: '/admin/home-content/culture-categories' },
          { title: 'ภูมิปัญญาท้องถิ่น', path: '/admin/home-content/local-wisdom' },
        ],
      },
      {
        title: 'Categories',
        path: '/admin/categories',
        icon: icon('ic-menu-item'),
      },
      {
        title: 'Cultural Places',
        path: '/admin/cultural-places',
        icon: icon('ic-params'),
      },
      {
        title: 'Analytics',
        path: '/admin/analytics',
        icon: icon('ic-analytics'),
      },
    ],
  },
];

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  return (
    <AuthGuard>
      <DashboardLayout slotProps={{ nav: { data: navData } }}>{children}</DashboardLayout>
    </AuthGuard>
  );
}

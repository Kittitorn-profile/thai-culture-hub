'use client';

import type { NavSectionProps } from 'src/components/nav-section';

import { useEffect } from 'react';

import { useRouter, usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { SvgColor } from 'src/components/svg-color';

import { AuthGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';
import {
  ADMIN_PERMISSION,
  type AdminNavGroup,
  filterAdminNavData,
  getFirstAllowedAdminPath,
  canAccessAdminPermission,
  getAdminPermissionFromPath,
} from 'src/auth/admin-permissions';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const navData: AdminNavGroup[] = [
  {
    subheader: 'Admin',
    items: [
      {
        title: 'Home Content',
        path: '/admin/home-content',
        icon: icon('ic-blog'),
        permission: ADMIN_PERMISSION.homeContent,
        children: [
          { title: 'เรื่องเล่าและสื่อ', path: '/admin/home-content' },
          { title: 'หมวดวัฒนธรรม', path: '/admin/home-content/culture-categories' },
          { title: 'ภูมิปัญญาท้องถิ่น', path: '/admin/home-content/local-wisdom' },
          { title: 'กิจกรรมที่จะจัดขึ้น', path: '/admin/home-content/events' },
          { title: 'Popup Banner', path: '/admin/home-content/popup-banner' },
        ],
      },
      {
        title: 'Categories',
        path: '/admin/categories',
        icon: icon('ic-menu-item'),
        permission: ADMIN_PERMISSION.categories,
      },
      {
        title: 'Cultural Places',
        path: '/admin/cultural-places',
        icon: icon('ic-params'),
        permission: ADMIN_PERMISSION.culturalPlaces,
        children: [
          { title: 'รายการสถานที่', path: '/admin/cultural-places' },
          { title: 'คำขอแก้ไข', path: '/admin/cultural-places/place-corrections' },
          { title: 'Sync ข้อมูล', path: '/admin/cultural-places/sync' },
        ],
      },
      {
        title: 'Analytics',
        path: '/admin/analytics',
        icon: icon('ic-analytics'),
        permission: ADMIN_PERMISSION.analytics,
      },
      {
        title: 'Feedback',
        path: '/admin/feedback',
        icon: icon('ic-mail'),
        permission: ADMIN_PERMISSION.feedback,
      },
      {
        title: 'Creators',
        path: '/admin/creators',
        icon: icon('ic-blog'),
        permission: ADMIN_PERMISSION.creators,
        children: [
          { title: 'ผู้สมัคร creator', path: '/admin/creators' },
          { title: 'Review บทความ', path: '/admin/creators/articles' },
        ],
      },
      {
        title: 'Admin Users',
        path: '/admin/users',
        icon: icon('ic-user'),
        permission: ADMIN_PERMISSION.users,
      },
      {
        title: 'Profile',
        path: '/admin/profile',
        icon: icon('ic-user'),
        permission: ADMIN_PERMISSION.profile,
      },
    ],
  },
];

type Props = {
  children: React.ReactNode;
};

function AdminPermissionGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthContext();
  const requiredPermission = getAdminPermissionFromPath(pathname);
  const isCreator = isCreatorUser(user);
  const allowed = canAccessAdminPermission(user, requiredPermission ?? undefined);

  useEffect(() => {
    if (!loading && isCreator) {
      router.replace(getRoleHomePath(user));
      return;
    }

    if (!loading && !allowed) {
      router.replace(getFirstAllowedAdminPath(user));
    }
  }, [allowed, isCreator, loading, router, user]);

  if (!loading && (isCreator || !allowed)) {
    return null;
  }

  return <>{children}</>;
}

function AdminDashboard({ children }: Props) {
  const { user } = useAuthContext();
  const allowedNavData = filterAdminNavData(user, navData);

  return (
    <AdminPermissionGuard>
      <DashboardLayout slotProps={{ nav: { data: allowedNavData as NavSectionProps['data'] } }}>
        {children}
      </DashboardLayout>
    </AdminPermissionGuard>
  );
}

export default function AdminLayout({ children }: Props) {
  return (
    <AuthGuard>
      <AdminDashboard>{children}</AdminDashboard>
    </AuthGuard>
  );
}

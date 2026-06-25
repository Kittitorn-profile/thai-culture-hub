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
    subheader: 'เมนู',
    items: [
      {
        title: 'แดชบอร์ด',
        path: '/admin/analytics',
        icon: icon('ic-analytics'),
        permission: ADMIN_PERMISSION.analytics,
      },
      {
        title: 'หน้าหลัก',
        path: '/admin/home-content',
        icon: icon('ic-blog'),
        permission: ADMIN_PERMISSION.homeContent,
        children: [
          { title: 'เรื่องเล่าและสื่อ', path: '/admin/home-content' },
          { title: 'หมวดหมู่วัฒนธรรม', path: '/admin/home-content/culture-categories' },
          { title: 'ภูมิปัญญาท้องถิ่น', path: '/admin/home-content/local-wisdom' },
          { title: 'กิจกรรม', path: '/admin/home-content/events' },
          { title: 'ป๊อปอัปแบนเนอร์', path: '/admin/home-content/popup-banner' },
        ],
      },
      {
        title: 'ข้อมูลสถานที่',
        path: '/admin/cultural-places',
        icon: icon('ic-params'),
        permission: ADMIN_PERMISSION.culturalPlaces,
        children: [
          { title: 'รายการสถานที่', path: '/admin/cultural-places' },
          { title: 'จัดการคำขอแก้ไขข้อมูล', path: '/admin/cultural-places/place-corrections' },
          { title: 'ซิงก์ข้อมูล', path: '/admin/cultural-places/sync' },
        ],
      },

      {
        title: 'ข้อเสนอแนะ',
        path: '/admin/feedback',
        icon: icon('ic-mail'),
        permission: ADMIN_PERMISSION.feedback,
      },
      {
        title: 'จัดการบทความ',
        path: '/admin/creators',
        icon: icon('ic-blog'),
        permission: ADMIN_PERMISSION.creators,
        children: [
          { title: 'จัดการผู้เขียน', path: '/admin/creators' },
          { title: 'ตรวจสอบบทความ', path: '/admin/creators/articles' },
          { title: 'ตั้งค่าระดับ Creator', path: '/admin/creators/settings' },
        ],
      },
      {
        title: 'จัดการผู้ตรวจสอบ',
        path: '/admin/reviewers',
        icon: icon('ic-user'),
        permission: ADMIN_PERMISSION.reviewers,
        children: [
          { title: 'รายชื่อผู้ตรวจสอบ', path: '/admin/reviewers' },
          { title: 'ตั้งค่าผู้ตรวจสอบ', path: '/admin/reviewers/settings' },
        ],
      },
      {
        title: 'จัดการผู้ใช้งาน',
        path: '/admin/users',
        icon: icon('ic-user'),
        permission: ADMIN_PERMISSION.users,
        children: [
          { title: 'ผู้ใช้งาน', path: '/admin/users' },
          { title: 'จัดการสิทธิ์', path: '/admin/users/permissions' },
        ],
      },

      {
        title: 'หมวดหมู่',
        path: '/admin/categories',
        icon: icon('ic-menu-item'),
        permission: ADMIN_PERMISSION.categories,
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

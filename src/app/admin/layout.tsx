'use client';

import type { NavSectionProps } from 'src/components/nav-section';

import { useEffect } from 'react';
import {
  RiMailLine,
  RiHome4Line,
  RiGroupLine,
  RiMapPinLine,
  RiArticleLine,
  RiUserStarLine,
  RiBookOpenLine,
  RiChatSmile2Line,
  RiShieldUserLine,
  RiLayoutGridLine,
  RiBarChartBoxLine,
} from '@remixicon/react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { DashboardLayout } from 'src/layouts/dashboard';
import { ARTIST_GROUPS, COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';

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

const navData: AdminNavGroup[] = [
  {
    subheader: 'ภาพรวม',
    items: [
      {
        title: 'แดชบอร์ด',
        path: '/admin/analytics',
        icon: <RiBarChartBoxLine size={22} />,
        permission: ADMIN_PERMISSION.analytics,
      },
    ],
  },
  {
    subheader: 'เนื้อหาเว็บไซต์',
    items: [
      {
        title: 'เนื้อหาหน้าแรก',
        path: '/admin/home-content',
        icon: <RiHome4Line size={22} />,
        permission: ADMIN_PERMISSION.homeContent,
        children: [
          { title: 'เรื่องเล่าและสื่อ', path: '/admin/home-content' },
          { title: 'หมวดวัฒนธรรมหน้าแรก', path: '/admin/home-content/culture-categories' },
          { title: 'ภูมิปัญญาท้องถิ่น', path: '/admin/home-content/local-wisdom' },
          { title: 'วงดนตรีและคณะการแสดง', path: '/admin/home-content/performance-groups' },
          { title: 'กิจกรรม', path: '/admin/home-content/events' },
          { title: 'ป๊อปอัปแบนเนอร์', path: '/admin/home-content/popup-banner' },
        ],
      },
    ],
  },
  {
    subheader: 'ฐานข้อมูลวัฒนธรรม',
    items: [
      {
        title: 'ภาพรวมชุดข้อมูล',
        path: '/admin/cultural-data',
        icon: <RiLayoutGridLine size={22} />,
        permission: ADMIN_PERMISSION.culturalPlaces,
      },
      {
        title: 'ข้อมูลสถานที่',
        path: '/admin/cultural-places',
        icon: <RiMapPinLine size={22} />,
        permission: ADMIN_PERMISSION.culturalPlaces,
        children: [
          { title: 'รายการสถานที่', path: '/admin/cultural-places' },
          { title: 'คำขอแก้ไขข้อมูล', path: '/admin/cultural-places/place-corrections' },
          { title: 'นำเข้าและซิงก์ข้อมูล', path: '/admin/cultural-places/sync' },
        ],
      },
      {
        title: 'กลุ่มชาติพันธุ์',
        path: '/admin/ethnic-groups',
        icon: <RiGroupLine size={22} />,
        permission: ADMIN_PERMISSION.culturalPlaces,
      },
      {
        title: 'ศิลปินรายจังหวัด',
        path: '/admin/cultural-artists',
        icon: <RiUserStarLine size={22} />,
        permission: ADMIN_PERMISSION.culturalArtists,
        children: [
          { title: 'ศิลปินทั้งหมด', path: '/admin/cultural-artists' },
          ...ARTIST_GROUPS.map((group) => ({
            title: group.label,
            path: `/admin/cultural-artists/group/${group.key}`,
          })),
        ],
      },
      {
        title: 'มรดกภูมิปัญญาทางวัฒนธรรม',
        path: '/admin/cultural-heritage',
        icon: <RiBookOpenLine size={22} />,
        permission: ADMIN_PERMISSION.culturalHeritage,
        children: [
          { title: 'ทะเบียนมรดกต้นทาง', path: '/admin/cultural-heritage' },
          ...COMMUNITY_GROUPS.map((group) => ({
            title: group.label,
            path: `/admin/cultural-heritage/group/${group.key}`,
          })),
        ],
      },
      {
        title: 'ตั้งค่าหมวดสถานที่',
        path: '/admin/categories',
        icon: <RiLayoutGridLine size={22} />,
        permission: ADMIN_PERMISSION.categories,
      },
    ],
  },
  {
    subheader: 'ชุมชนและการตรวจสอบ',
    items: [
      {
        title: 'บทความและผู้เขียน',
        path: '/admin/creators',
        icon: <RiArticleLine size={22} />,
        permission: ADMIN_PERMISSION.creators,
        children: [
          { title: 'จัดการผู้เขียน', path: '/admin/creators' },
          { title: 'ตรวจสอบบทความ', path: '/admin/creators/articles' },
          { title: 'ตั้งค่าระดับ Creator', path: '/admin/creators/settings' },
        ],
      },
      {
        title: 'ผู้ตรวจสอบ',
        path: '/admin/reviewers',
        icon: <RiShieldUserLine size={22} />,
        permission: ADMIN_PERMISSION.reviewers,
        children: [
          { title: 'รายชื่อผู้ตรวจสอบ', path: '/admin/reviewers' },
          { title: 'ตั้งค่าผู้ตรวจสอบ', path: '/admin/reviewers/settings' },
        ],
      },
      {
        title: 'ข้อความติดต่อ',
        path: '/admin/contact-messages',
        icon: <RiMailLine size={22} />,
        permission: ADMIN_PERMISSION.feedback,
      },
      {
        title: 'ข้อเสนอแนะ',
        path: '/admin/feedback',
        icon: <RiChatSmile2Line size={22} />,
        permission: ADMIN_PERMISSION.feedback,
      },
    ],
  },
  {
    subheader: 'ระบบผู้ใช้งาน',
    items: [
      {
        title: 'ผู้ใช้งานและสิทธิ์',
        path: '/admin/users',
        icon: <RiGroupLine size={22} />,
        permission: ADMIN_PERMISSION.users,
        children: [
          { title: 'ผู้ใช้งาน', path: '/admin/users' },
          { title: 'จัดการสิทธิ์', path: '/admin/users/permissions' },
        ],
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
    <AuthGuard signInPath={paths.adminLogin}>
      <AdminDashboard>{children}</AdminDashboard>
    </AuthGuard>
  );
}

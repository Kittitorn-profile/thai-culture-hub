import type { NavSectionProps } from 'src/components/nav-section';

export const ADMIN_ROLE = {
  admin: 'admin',
  manage: 'manage',
} as const;

export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE] | string;

export const ADMIN_PERMISSION = {
  homeContent: 'home_content',
  categories: 'categories',
  culturalPlaces: 'cultural_places',
  analytics: 'analytics',
  feedback: 'feedback',
  creators: 'creators',
  users: 'users',
  profile: 'profile',
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSION)[keyof typeof ADMIN_PERMISSION];

export const ADMIN_PERMISSION_OPTIONS: { value: AdminPermission; label: string }[] = [
  { value: ADMIN_PERMISSION.homeContent, label: 'Home Content' },
  { value: ADMIN_PERMISSION.categories, label: 'Categories' },
  { value: ADMIN_PERMISSION.culturalPlaces, label: 'Cultural Places' },
  { value: ADMIN_PERMISSION.analytics, label: 'Analytics' },
  { value: ADMIN_PERMISSION.feedback, label: 'Feedback' },
  { value: ADMIN_PERMISSION.creators, label: 'Creators' },
  { value: ADMIN_PERMISSION.users, label: 'Admin Users' },
  { value: ADMIN_PERMISSION.profile, label: 'Profile' },
];

export const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map((option) => option.value);

export type AdminNavItem = NavSectionProps['data'][number]['items'][number] & {
  permission?: AdminPermission;
  children?: AdminNavItem[];
};

export type AdminNavGroup = {
  subheader?: string;
  items: AdminNavItem[];
};

function getUserAppMetadata(user: Record<string, any> | null | undefined) {
  return user?.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
}

export function getAdminRole(user: Record<string, any> | null | undefined): AdminRole {
  const metadataRole = getUserAppMetadata(user).role;

  if (typeof metadataRole === 'string' && metadataRole) {
    return metadataRole;
  }

  return user?.role === 'manage' || user?.role === 'manager' ? 'manage' : 'admin';
}

export function isSuperAdminRole(role: AdminRole | null | undefined) {
  return !role || role === ADMIN_ROLE.admin;
}

export function getAdminPermissions(user: Record<string, any> | null | undefined) {
  const role = getAdminRole(user);

  if (isSuperAdminRole(role)) {
    return ALL_ADMIN_PERMISSIONS;
  }

  const metadataPermissions = getUserAppMetadata(user).admin_permissions;

  if (!Array.isArray(metadataPermissions)) {
    return [];
  }

  return metadataPermissions.filter((permission): permission is AdminPermission =>
    ALL_ADMIN_PERMISSIONS.includes(permission)
  );
}

export function canAccessAdminPermission(
  user: Record<string, any> | null | undefined,
  permission?: AdminPermission
) {
  if (!permission) {
    return true;
  }

  const role = getAdminRole(user);

  if (isSuperAdminRole(role)) {
    return true;
  }

  return getAdminPermissions(user).includes(permission);
}

export function getAdminPermissionFromPath(pathname: string): AdminPermission | null {
  if (pathname.startsWith('/admin/home-content')) {
    return ADMIN_PERMISSION.homeContent;
  }

  if (pathname.startsWith('/admin/categories')) {
    return ADMIN_PERMISSION.categories;
  }

  if (pathname.startsWith('/admin/cultural-places') || pathname.startsWith('/admin/place-corrections')) {
    return ADMIN_PERMISSION.culturalPlaces;
  }

  if (pathname.startsWith('/admin/analytics')) {
    return ADMIN_PERMISSION.analytics;
  }

  if (pathname.startsWith('/admin/feedback')) {
    return ADMIN_PERMISSION.feedback;
  }

  if (pathname.startsWith('/admin/creators') || pathname.startsWith('/admin/creator-articles')) {
    return ADMIN_PERMISSION.creators;
  }

  if (pathname.startsWith('/admin/users')) {
    return ADMIN_PERMISSION.users;
  }

  if (pathname.startsWith('/admin/profile')) {
    return ADMIN_PERMISSION.profile;
  }

  return null;
}

export function getFirstAllowedAdminPath(user: Record<string, any> | null | undefined) {
  const permission = getAdminPermissions(user)[0] ?? ADMIN_PERMISSION.profile;

  switch (permission) {
    case ADMIN_PERMISSION.categories:
      return '/admin/categories';
    case ADMIN_PERMISSION.culturalPlaces:
      return '/admin/cultural-places';
    case ADMIN_PERMISSION.analytics:
      return '/admin/analytics';
    case ADMIN_PERMISSION.feedback:
      return '/admin/feedback';
    case ADMIN_PERMISSION.creators:
      return '/admin/creators';
    case ADMIN_PERMISSION.users:
      return '/admin/users';
    case ADMIN_PERMISSION.profile:
      return '/admin/profile';
    case ADMIN_PERMISSION.homeContent:
    default:
      return '/admin/home-content';
  }
}

function filterNavItem(user: Record<string, any> | null | undefined, item: AdminNavItem) {
  const children = item.children
    ?.map((child) => filterNavItem(user, child))
    .filter(Boolean) as AdminNavItem[] | undefined;

  if (!canAccessAdminPermission(user, item.permission) && !children?.length) {
    return null;
  }

  return {
    ...item,
    ...(children ? { children } : {}),
  };
}

export function filterAdminNavData(
  user: Record<string, any> | null | undefined,
  navData: AdminNavGroup[]
): NavSectionProps['data'] {
  return navData
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterNavItem(user, item))
        .filter(Boolean) as NavSectionProps['data'][number]['items'],
    }))
    .filter((group) => group.items.length);
}

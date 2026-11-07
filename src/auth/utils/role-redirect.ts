export function getAuthRole(user: Record<string, any> | null | undefined) {
  return user?.app_metadata?.role ?? user?.role ?? '';
}

export function isCreatorUser(user: Record<string, any> | null | undefined) {
  return getAuthRole(user) === 'creator';
}

export function getRoleHomePath(user: Record<string, any> | null | undefined) {
  if (isCreatorUser(user)) return '/creator/articles';
  return ['admin', 'manage', 'manager', 'reviewer'].includes(getAuthRole(user)) ? '/admin' : '/';
}

export function getRoleProfilePath(user: Record<string, any> | null | undefined) {
  if (isCreatorUser(user)) return '/creator/profile';
  return ['admin', 'manage', 'manager', 'reviewer'].includes(getAuthRole(user))
    ? '/admin/profile'
    : '/';
}

/** Only redirect to local application routes that belong to the signed-in role. */
export function getSafeRoleRedirectPath(
  user: Record<string, any> | null | undefined,
  targetPath?: string | null
) {
  const fallback = getRoleHomePath(user);
  if (
    !targetPath ||
    !targetPath.startsWith('/') ||
    targetPath.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(targetPath)
  )
    return fallback;
  let pathname: string;
  try {
    pathname =
      decodeURIComponent(new URL(targetPath, 'https://local.invalid').pathname).replace(
        /\/+$/,
        ''
      ) || '/';
  } catch {
    return fallback;
  }
  if (/[\\\u0000-\u001f]/.test(pathname) || pathname.startsWith('//')) return fallback;
  if (/^\/(?:creator\/(?:register|sign-in)|admin-login|auth)(?:\/|$)/.test(pathname))
    return fallback;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isCreatorRoute = pathname === '/creator' || pathname.startsWith('/creator/');
  if (isCreatorUser(user) && isAdminRoute) return fallback;
  if (!isCreatorUser(user) && isCreatorRoute) return fallback;
  if (!['admin', 'manage', 'manager', 'reviewer'].includes(getAuthRole(user)) && isAdminRoute)
    return fallback;
  return targetPath;
}

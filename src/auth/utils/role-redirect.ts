export function getAuthRole(user: Record<string, any> | null | undefined) {
  return user?.app_metadata?.role ?? user?.role ?? '';
}

export function isCreatorUser(user: Record<string, any> | null | undefined) {
  return getAuthRole(user) === 'creator';
}

export function getRoleHomePath(user: Record<string, any> | null | undefined) {
  if (isCreatorUser(user)) {
    return '/creator/articles';
  }

  return '/admin';
}

export function getRoleProfilePath(user: Record<string, any> | null | undefined) {
  if (isCreatorUser(user)) {
    return '/creator/profile';
  }

  return '/admin/profile';
}

export function getSafeRoleRedirectPath(
  user: Record<string, any> | null | undefined,
  targetPath?: string | null
) {
  if (!targetPath) {
    return getRoleHomePath(user);
  }

  if (isCreatorUser(user) && targetPath.startsWith('/admin')) {
    return getRoleHomePath(user);
  }

  if (!isCreatorUser(user) && targetPath.startsWith('/creator')) {
    return getRoleHomePath(user);
  }

  return targetPath;
}

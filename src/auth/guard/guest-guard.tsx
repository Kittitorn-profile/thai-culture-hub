'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';
import { getSafeRoleRedirectPath } from '../utils/role-redirect';

type GuestGuardProps = { children: React.ReactNode };

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();
  const { user, loading, authenticated } = useAuthContext();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRoleRedirectPath(user, searchParams.get('returnTo'));

  useEffect(() => {
    if (!loading && authenticated) router.replace(redirectUrl);
  }, [authenticated, loading, redirectUrl, router]);

  if (loading || authenticated) return <SplashScreen />;
  return <>{children}</>;
}

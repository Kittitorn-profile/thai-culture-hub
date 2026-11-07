'use client';

import { useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

type AuthGuardProps = {
  children: React.ReactNode;
  signInPath?: string;
};

const signInPaths = {
  jwt: paths.auth.jwt.signIn,
  auth0: paths.auth.auth0.signIn,
  amplify: paths.auth.amplify.signIn,
  firebase: paths.auth.firebase.signIn,
  supabase: paths.auth.supabase.signIn,
};

export function AuthGuard({ children, signInPath: customSignInPath }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { authenticated, loading } = useAuthContext();

  const signInPath = customSignInPath || signInPaths[CONFIG.auth.method];
  const redirectPath = `${signInPath}?${new URLSearchParams({ returnTo: pathname }).toString()}`;

  useEffect(() => {
    if (!loading && !authenticated) router.replace(redirectPath);
  }, [authenticated, loading, redirectPath, router]);

  if (loading || !authenticated) return <SplashScreen />;

  return <>{children}</>;
}

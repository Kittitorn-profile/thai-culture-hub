'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useRef, useMemo, useEffect, useCallback } from 'react';

import { getCreatorAvatarUrl } from 'src/utils/creator-avatar';

import axios from 'src/lib/axios';
import { supabase } from 'src/lib/supabase';

import { setAdminAnalyticsDisabled } from 'src/components/analytics/track-event';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

export const CREATOR_AUTH_TOKEN_KEY = 'creator_access_token';

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

type Props = {
  children: React.ReactNode;
};

function normalizeAuthUser(
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
  authUser = session?.user
) {
  if (!session?.user) {
    return null;
  }

  const user = authUser ?? session.user;
  const userMetadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const displayName =
    typeof userMetadata.display_name === 'string' ? userMetadata.display_name : '';
  const firstName = typeof userMetadata.first_name === 'string' ? userMetadata.first_name : '';
  const lastName = typeof userMetadata.last_name === 'string' ? userMetadata.last_name : '';
  const photoURL =
    [userMetadata.photo_url, userMetadata.avatar_url, userMetadata.picture].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    ) ?? '';
  const role = typeof appMetadata.role === 'string' ? appMetadata.role : '';
  if (!['admin', 'manage', 'manager', 'reviewer', 'creator'].includes(role)) return null;
  if (role === 'creator' && appMetadata.creator_status !== 'approved') return null;
  const adminPermissions = Array.isArray(appMetadata.admin_permissions)
    ? appMetadata.admin_permissions
    : [];

  return {
    id: user.id,
    email: user.email ?? '',
    accessToken: session.access_token,
    access_token: session.access_token,
    displayName,
    name: displayName,
    firstName,
    lastName,
    photoURL,
    role,
    adminPermissions,
    app_metadata: {
      role,
      admin_permissions: adminPermissions,
      ...(typeof appMetadata.creator_status === 'string'
        ? { creator_status: appMetadata.creator_status }
        : {}),
    },
  };
}

async function getCreatorTableSession() {
  const accessToken = sessionStorage.getItem(CREATOR_AUTH_TOKEN_KEY);

  if (!accessToken) {
    return null;
  }

  const response = await fetch('/api/creator/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => ({}))) as {
    data?: {
      id: string;
      userId: string;
      email: string;
      displayName: string;
      avatarUrl: string;
      status: string;
    };
  };

  if (!response.ok || !result.data) {
    if (response.status >= 500) throw new Error('Unable to verify Creator session');
    sessionStorage.removeItem(CREATOR_AUTH_TOKEN_KEY);
    return null;
  }
  if (result.data.status !== 'approved') {
    sessionStorage.removeItem(CREATOR_AUTH_TOKEN_KEY);
    return null;
  }

  let expiresAt: number | undefined;
  try {
    const payload = JSON.parse(
      atob(accessToken.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (typeof payload.exp === 'number') expiresAt = payload.exp;
  } catch {
    /* The server validates the token; expiry decoding is only for the UI timer. */
  }

  return {
    expiresAt,
    id: result.data.userId,
    email: result.data.email,
    accessToken,
    access_token: accessToken,
    displayName: result.data.displayName,
    name: result.data.displayName,
    firstName: '',
    lastName: '',
    photoURL: getCreatorAvatarUrl(result.data.id, result.data.avatarUrl),
    role: 'creator',
    adminPermissions: [],
    app_metadata: {
      role: 'creator',
      creator_status: result.data.status,
    },
  };
}

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const sessionCheckId = useRef(0);
  const checkUserSession = useCallback(async () => {
    const checkId = ++sessionCheckId.current;
    try {
      // The application-issued Creator token takes priority over an old OAuth session.
      const creatorUser = await getCreatorTableSession();
      let user:
        | ReturnType<typeof normalizeAuthUser>
        | Awaited<ReturnType<typeof getCreatorTableSession>> = creatorUser;
      if (!user) {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          const { data: userResult, error: userError } = await supabase.auth.getUser(
            session.access_token
          );
          if (userError || !userResult.user) throw userError ?? new Error('Invalid session');
          const normalizedUser = normalizeAuthUser(session, userResult.user);
          if (normalizedUser?.role === 'creator') {
            const response = await fetch('/api/creator/me', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (response.ok) user = normalizedUser;
          } else {
            user = normalizedUser;
          }
        }
      }
      if (checkId !== sessionCheckId.current) return;
      setAdminAnalyticsDisabled(Boolean(user));
      setState({ user, loading: false });
      if (user) axios.defaults.headers.common.Authorization = `Bearer ${user.accessToken}`;
      else delete axios.defaults.headers.common.Authorization;
    } catch (error) {
      if (checkId !== sessionCheckId.current) return;
      console.error(error);
      // A temporary network error must not delete the stored session.
      setAdminAnalyticsDisabled(false);
      setState({ user: null, loading: false });
      delete axios.defaults.headers.common.Authorization;
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Supabase APIs must run outside the synchronous auth callback.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void checkUserSession();
      }, 0);
    });
    const refreshSession = () => {
      void checkUserSession();
    };
    window.addEventListener('focus', refreshSession);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', refreshSession);
      if (timer) clearTimeout(timer);
      sessionCheckId.current += 1;
    };
  }, [checkUserSession]);

  useEffect(() => {
    const expiresAt = state.user?.expiresAt;
    if (typeof expiresAt !== 'number') return undefined;
    const timer = setTimeout(
      () => {
        void checkUserSession();
      },
      Math.max(0, expiresAt * 1000 - Date.now() + 100)
    );
    return () => clearTimeout(timer);
  }, [checkUserSession, state.user?.expiresAt]);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}

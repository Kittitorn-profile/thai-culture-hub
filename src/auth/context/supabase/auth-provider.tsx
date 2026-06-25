'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

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
  const photoURL = typeof userMetadata.photo_url === 'string' ? userMetadata.photo_url : '';
  const role = typeof appMetadata.role === 'string' ? appMetadata.role : 'admin';
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

async function clearLocalAuthSession() {
  sessionStorage.removeItem(CREATOR_AUTH_TOKEN_KEY);
  await supabase.auth.signOut({ scope: 'local' }).catch((error) => {
    console.error(error);
  });
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
    sessionStorage.removeItem(CREATOR_AUTH_TOKEN_KEY);
    return null;
  }

  return {
    id: result.data.userId,
    email: result.data.email,
    accessToken,
    access_token: accessToken,
    displayName: result.data.displayName,
    name: result.data.displayName,
    firstName: '',
    lastName: '',
    photoURL: result.data.avatarUrl,
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

  const checkUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        await clearLocalAuthSession();
        setState({ user: null, loading: false });
        console.error(error);
        delete axios.defaults.headers.common.Authorization;
        return;
      }

      if (session) {
        const accessToken = session?.access_token;
        const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);

        setAdminAnalyticsDisabled(true);
        setState({
          user: normalizeAuthUser(session, userError ? session.user : userResult.user),
          loading: false,
        });
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        const creatorUser = await getCreatorTableSession();

        if (creatorUser) {
          setAdminAnalyticsDisabled(true);
          setState({ user: creatorUser, loading: false });
          axios.defaults.headers.common.Authorization = `Bearer ${creatorUser.accessToken}`;
        } else {
          setAdminAnalyticsDisabled(false);
          setState({ user: null, loading: false });
          delete axios.defaults.headers.common.Authorization;
        }
      }
    } catch (error) {
      console.error(error);
      await clearLocalAuthSession();
      setAdminAnalyticsDisabled(false);
      setState({ user: null, loading: false });
      delete axios.defaults.headers.common.Authorization;
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

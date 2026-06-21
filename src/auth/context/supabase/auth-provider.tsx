'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios from 'src/lib/axios';
import { supabase } from 'src/lib/supabase';

import { setAdminAnalyticsDisabled } from 'src/components/analytics/track-event';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setState({ user: null, loading: false });
        console.error(error);
        throw error;
      }

      if (session) {
        const accessToken = session?.access_token;

        setAdminAnalyticsDisabled(true);
        setState({ user: { ...session, ...session?.user }, loading: false });
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        setAdminAnalyticsDisabled(false);
        setState({ user: null, loading: false });
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error(error);
      setAdminAnalyticsDisabled(false);
      setState({ user: null, loading: false });
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
      user: state.user
        ? {
            ...state.user,
            id: state.user?.id,
            accessToken: state.user?.access_token,
            displayName: state.user?.user_metadata.display_name,
            name: state.user?.user_metadata.display_name,
            firstName: state.user?.user_metadata.first_name,
            lastName: state.user?.user_metadata.last_name,
            photoURL: state.user?.user_metadata.photo_url,
            app_metadata: state.user?.app_metadata ?? {},
            role: state.user?.app_metadata?.role ?? 'admin',
            adminPermissions: state.user?.app_metadata?.admin_permissions ?? [],
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}

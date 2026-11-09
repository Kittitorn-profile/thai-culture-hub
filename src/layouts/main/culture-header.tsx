'use client';

import type { CreatorProfile } from 'src/sections/creator/types';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getCreatorAvatarUrl } from 'src/utils/creator-avatar';

import { cultureUi } from 'src/theme/culture-ui';

import { Logo } from 'src/components/logo';

import { getCreatorProfile } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { CultureSearch } from './culture-search';
import { AccountPopover } from '../components/account-popover';
import { _account, _accountCreator } from '../nav-config-account';

// ----------------------------------------------------------------------

const HEADER_NAV_ITEMS = [
  { label: 'หน้าแรก', path: '/' },
  { label: 'เกี่ยวกับเรา', path: paths.about },
  { label: 'ติดต่อสอบถาม', path: paths.contact },
];

type CultureHeaderProps = {
  pathname: string;
};

function isActivePath(pathname: string, path: string) {
  if (path.includes('#')) {
    return false;
  }

  if (path === '/creator/write') {
    return pathname.startsWith('/creator/write') || pathname.startsWith('/creator/articles');
  }

  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function CultureHeader({ pathname }: CultureHeaderProps) {
  const { user, loading } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const isCreator = isCreatorUser(user);
  const queryClient = useQueryClient();
  const profileKey = ['header-creator-profile', user?.id];
  const profileQuery = useQuery({
    queryKey: profileKey,
    enabled: !loading && isCreator && !!accessToken,
    queryFn: () => getCreatorProfile(accessToken),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const creatorProfile = profileQuery.data?.data;
  const accountLoading = loading || (isCreator && !!accessToken && profileQuery.isPending);
  const headerNavItems = isCreator
    ? [
        ...HEADER_NAV_ITEMS,
        { label: 'เขียนบทความ', path: '/creator/write' },
        { label: 'ร่วมพัฒนาข้อมูล', path: '/creator/contributions' },
      ]
    : HEADER_NAV_ITEMS;
  const accountProfile = creatorProfile
    ? {
        displayName: creatorProfile.displayName,
        email: creatorProfile.email,
        photoURL:
          getCreatorAvatarUrl(creatorProfile.id, creatorProfile.avatarUrl) || user?.photoURL || '',
      }
    : undefined;

  useEffect(() => {
    function handleCreatorProfileUpdated(event: Event) {
      if (!isCreator || !user?.id) return;
      const nextProfile = (event as CustomEvent<CreatorProfile>).detail;
      if (nextProfile)
        queryClient.setQueryData(['header-creator-profile', user.id], { data: nextProfile });
      else void queryClient.invalidateQueries({ queryKey: ['header-creator-profile', user.id] });
    }
    window.addEventListener('creator-profile-updated', handleCreatorProfileUpdated);
    return () => window.removeEventListener('creator-profile-updated', handleCreatorProfileUpdated);
  }, [isCreator, queryClient, user?.id]);

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 1408,
        mx: 'auto',
        px: { xs: 2.5, sm: 4, md: 6, lg: 8 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: 'auto 1fr auto' },
        alignItems: 'center',
        gap: { xs: 1, md: 3 },
        '& a:focus-visible': { outline: '2px solid #50585e', outlineOffset: 4 },
      }}
    >
      <Logo sx={{ height: 'auto', width: { xs: 76, md: 88 } }} isSingle />
      <Stack
        component="nav"
        aria-label="เมนูหลัก"
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ minWidth: 0, display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap' }}
      >
        {headerNavItems.map((item) => {
          const active = isActivePath(pathname, item.path);
          return (
            <Link
              key={item.path}
              component={RouterLink}
              href={item.path}
              underline="none"
              aria-current={active ? 'page' : undefined}
              sx={{
                px: { md: 1.25, lg: 2 },
                py: 1.25,
                color: '#202124',
                fontSize: { md: 14, lg: 15 },
                fontWeight: active ? 700 : 400,
                whiteSpace: 'nowrap',
                '&:hover': { textDecoration: 'underline', textUnderlineOffset: '6px' },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={{ xs: 1, sm: 2 }}
      >
        <CultureSearch />
        {accountLoading ? (
          <Stack
            role="status"
            aria-label="กำลังตรวจสอบบัญชี"
            direction="row"
            alignItems="center"
            spacing={1.5}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 180 }}>
              <Skeleton animation={false} width="80%" height={18} sx={{ ml: 'auto' }} />
              <Skeleton animation={false} width="100%" height={16} />
            </Box>
            <Skeleton animation={false} variant="circular" width={40} height={40} />
          </Stack>
        ) : user && accessToken ? (
          <AccountPopover data={isCreator ? _accountCreator : _account} account={accountProfile} />
        ) : (
          <>
            <Link
              component={RouterLink}
              href="/creator/register"
              underline="none"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: '#202124',
                fontSize: 13,
                whiteSpace: 'nowrap',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              ลงทะเบียน
            </Link>
            <Link
              component={RouterLink}
              href="/creator/sign-in"
              underline="none"
              sx={{
                bgcolor: '#202124',
                color: '#fff',
                px: 2,
                py: 1,
                borderRadius: `${cultureUi.radius}px`,
                fontSize: 13,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#3c474d' },
              }}
            >
              เข้าสู่ระบบ
            </Link>
          </>
        )}
      </Stack>
    </Box>
  );
}

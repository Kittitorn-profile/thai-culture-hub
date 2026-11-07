'use client';

import type { CreatorProfile } from 'src/sections/creator/types';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getCreatorAvatarUrl } from 'src/utils/creator-avatar';

import { Logo } from 'src/components/logo';

import { getCreatorProfile } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

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
  const { user } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const isCreator = isCreatorUser(user);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const headerNavItems = isCreator
    ? [
        ...HEADER_NAV_ITEMS,
        { label: 'เขียนบทความ', path: '/creator/write' },
        { label: 'ร่วมพัฒนาข้อมูล', path: '/creator/place-corrections' },
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

  const loadCreatorProfile = useCallback(async () => {
    if (!isCreator || !accessToken) {
      setCreatorProfile(null);
      return;
    }

    try {
      const result = await getCreatorProfile(accessToken);
      setCreatorProfile(result.data);
    } catch (error) {
      console.error(error);
    }
  }, [accessToken, isCreator]);

  useEffect(() => {
    loadCreatorProfile();
  }, [loadCreatorProfile]);

  useEffect(() => {
    function handleCreatorProfileUpdated(event: Event) {
      const nextProfile = (event as CustomEvent<CreatorProfile>).detail;

      if (nextProfile) {
        setCreatorProfile(nextProfile);
      } else {
        loadCreatorProfile();
      }
    }

    window.addEventListener('creator-profile-updated', handleCreatorProfileUpdated);

    return () => {
      window.removeEventListener('creator-profile-updated', handleCreatorProfileUpdated);
    };
  }, [loadCreatorProfile]);

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
        gap: { xs: 2, md: 3 },
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
      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={2}>
        {user && user?.access_token ? (
          <AccountPopover
            data={user?.role === 'creator' ? _accountCreator : _account}
            account={accountProfile}
          />
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
                borderRadius: 1.5,
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

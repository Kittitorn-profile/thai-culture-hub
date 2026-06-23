'use client';

import type { CreatorProfile } from 'src/sections/creator/types';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';

import { getCreatorProfile } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { _account } from '../nav-config-account';
import { AccountPopover } from '../components/account-popover';

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
  const theme = useTheme();
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
        photoURL: creatorProfile.avatarUrl,
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
        maxWidth: 1180,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: '1fr auto 1fr' },
        alignItems: 'center',
        gap: { xs: 2, md: 3 },
      }}
    >
      <Logo sx={{ height: 'auto', width: 96 }} isSingle />

      <Stack
        component="nav"
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          p: 0.35,
          gap: 0.5,
          height: 'auto',
          display: { xs: 'none', md: 'flex' },
          borderRadius: 99,
          bgcolor: alpha(theme.palette.common.white, 0.24),
          border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 30px rgba(35,25,18,0.12)',
        }}
      >
        {headerNavItems.map((item) => {
          const active = isActivePath(pathname, item.path);

          return (
            <Link
              key={`${item.label}-${item.path}`}
              component={RouterLink}
              href={item.path}
              underline="none"
              sx={{
                px: { md: 1.8, lg: 2.1 },
                py: 1,
                height: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 99,
                color: active ? theme.palette.grey[900] : alpha(theme.palette.common.white, 0.9),
                fontSize: { md: 16, lg: 18 },
                fontWeight: 800,
                whiteSpace: 'nowrap',
                bgcolor: active ? alpha(theme.palette.common.white, 0.94) : 'transparent',
                transition: theme.transitions.create(['background-color', 'color'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  color: active ? theme.palette.grey[900] : 'white',
                  bgcolor: active
                    ? alpha(theme.palette.common.white, 0.94)
                    : alpha(theme.palette.common.white, 0.14),
                },
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
        spacing={1}
        sx={{ display: { xs: 'none', md: 'flex' } }}
      >
        {user && user?.access_token ? (
          <AccountPopover data={_account} account={accountProfile} />
        ) : (
          <Stack alignItems="flex-end" spacing={0.25}>
            <Typography variant="subtitle1">Thailand Cultural Hub</Typography>
            {/* <Stack direction="row" alignItems="center" spacing={0.75}>
              <Link
                component={RouterLink}
                href="/creator/register"
                underline="none"
                sx={{
                  color: alpha(theme.palette.common.white, 0.88),
                  fontSize: 13,
                  fontWeight: 400,
                  '&:hover': { color: theme.palette.common.white },
                }}
              >
                ลงทะเบียน
              </Link>
              <Typography component="span" sx={{ color: alpha(theme.palette.common.white, 0.5) }}>
                |
              </Typography>
              <Link
                component={RouterLink}
                href="/creator/sign-in"
                underline="none"
                sx={{
                  color: alpha(theme.palette.common.white, 0.88),
                  fontSize: 13,
                  fontWeight: 400,
                  '&:hover': { color: theme.palette.common.white },
                }}
              >
                เข้าสู่ระบบ
              </Link>
            </Stack> */}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

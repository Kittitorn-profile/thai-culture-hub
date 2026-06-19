'use client';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const HEADER_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Culture', path: '/#culture-map' },
  { label: 'Stories', path: '/#stories' },
  { label: 'About', path: paths.about },
  { label: 'Contact', path: paths.contact },
];

type CultureHeaderProps = {
  pathname: string;
};

function isActivePath(pathname: string, path: string) {
  if (path.includes('#')) {
    return false;
  }

  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function CultureHeader({ pathname }: CultureHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 1,
        px: { xs: 2, md: '20%' },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: '1fr auto 1fr' },
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Link
        component={RouterLink}
        href="/"
        underline="none"
        sx={{
          color: 'white',
          fontSize: { xs: 20, md: 27 },
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: 'uppercase',
          textShadow: '0 2px 14px rgba(42,31,22,0.22)',
        }}
      >
        THAI HUB
      </Link>

      <Stack
        component="nav"
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          p: 0.35,
          gap: 1,
          height: 36,
          display: { xs: 'none', md: 'flex' },
          borderRadius: 99,
          bgcolor: alpha(theme.palette.common.white, 0.24),
          border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 30px rgba(35,25,18,0.12)',
        }}
      >
        {HEADER_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.path);

          return (
            <Link
              key={`${item.label}-${item.path}`}
              component={RouterLink}
              href={item.path}
              underline="none"
              sx={{
                px: 2.1,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 99,
                color: active ? theme.palette.grey[900] : alpha(theme.palette.common.white, 0.9),
                fontSize: 18,
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
        <Link
          component={RouterLink}
          href={paths.contact}
          underline="none"
          sx={{
            color: 'white',
            fontSize: 13,
            fontWeight: 800,
            textShadow: '0 2px 14px rgba(42,31,22,0.22)',
          }}
        >
          Contact Us
        </Link>
        <Box
          component={RouterLink}
          href={paths.contact}
          aria-label="Go to contact page"
          sx={{
            width: 34,
            height: 34,
            display: 'grid',
            color: theme.palette.grey[900],
            borderRadius: '50%',
            placeItems: 'center',
            bgcolor: '#e5c43d',
            boxShadow: '0 10px 24px rgba(80,63,13,0.2)',
            textDecoration: 'none',
            transition: theme.transitions.create(['transform', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 14px 28px rgba(80,63,13,0.26)',
            },
          }}
        >
          <Iconify icon="eva:diagonal-arrow-right-up-fill" width={18} />
        </Box>
      </Stack>
    </Box>
  );
}

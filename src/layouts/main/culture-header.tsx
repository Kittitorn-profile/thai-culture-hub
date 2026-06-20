'use client';

import { Typography } from 'node_modules/@mui/material/esm';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';

// ----------------------------------------------------------------------

const HEADER_NAV_ITEMS = [
  { label: 'หน้าแรก', path: '/' },
  { label: 'แผนที่', path: '/#culture-map' },
  { label: 'เรื่องราว', path: '/#stories' },
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
        maxWidth: 1180,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: '1fr auto 1fr' },
        alignItems: 'center',
        gap: { xs: 2, md: 3 },
      }}
    >
      <Logo sx={{ height: 'auto', width: 96 }} />

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
        {HEADER_NAV_ITEMS.map((item) => {
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
        <Typography>Thailand Cultural Hub</Typography>
      </Stack>
    </Box>
  );
}

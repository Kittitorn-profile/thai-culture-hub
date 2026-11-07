'use client';

import { RiArrowLeftLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { cultureUi } from 'src/theme/culture-ui';

import { Logo } from 'src/components/logo';

import { GuestGuard } from 'src/auth/guard';

type Props = { children: React.ReactNode };

export default function Layout({ children }: Props) {
  return (
    <GuestGuard>
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          bgcolor: cultureUi.background,
          color: cultureUi.text,
          p: { xs: 2.5, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Link
          component={RouterLink}
          href="/"
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            alignSelf: 'flex-start',
            color: cultureUi.muted,
            fontSize: 13,
          }}
        >
          <RiArrowLeftLine size={16} />
          กลับหน้าเว็บไซต์
        </Link>
        <Box sx={{ width: 1, maxWidth: 420, mx: 'auto', my: 'auto', py: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Logo isSingle sx={{ width: 100, height: 'auto' }} />
          </Box>
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: cultureUi.paper,
              border: `1px solid ${cultureUi.border}`,
              borderRadius: 2.5,
              '& .MuiFormLabel-asterisk': { color: 'error.main' },
            }}
          >
            {children}
          </Box>
          <Typography sx={{ mt: 2.5, textAlign: 'center', fontSize: 12, color: cultureUi.muted }}>
            สำหรับ Creator{' '}
            <Link component={RouterLink} href="/creator/sign-in" color="inherit" underline="hover">
              เข้าสู่ระบบที่นี่
            </Link>
          </Typography>
        </Box>
        <Typography sx={{ textAlign: 'center', color: cultureUi.muted, fontSize: 11 }}>
          Thailand Cultural Hub
        </Typography>
      </Box>
    </GuestGuard>
  );
}

'use client';

import { RiArrowLeftLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { MainLayout } from 'src/layouts/main';
import { cultureUi } from 'src/theme/culture-ui';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

type Props = {
  children: React.ReactNode;
};

export default function CreatorLayout({ children }: Props) {
  const pathname = usePathname().replace(/\/+$/, '');
  const isAuthPage = pathname === '/creator/sign-in' || pathname === '/creator/register';

  if (isAuthPage) {
    return (
      <Box sx={{ minHeight: '100svh', bgcolor: cultureUi.background }}>
        <Box
          component="nav"
          aria-label="กลับเว็บไซต์หลัก"
          sx={{ maxWidth: 1408, mx: 'auto', px: HOME_SECTION_PX, pt: { xs: 2, md: 3 } }}
        >
          <Button
            component={RouterLink}
            href="/"
            startIcon={<RiArrowLeftLine size={20} aria-hidden="true" />}
            sx={{
              px: 0,
              minHeight: 40,
              color: cultureUi.muted,
              fontWeight: 400,
              '&:hover': { bgcolor: 'transparent', color: cultureUi.text },
            }}
          >
            กลับหน้าเว็บไซต์
          </Button>
        </Box>
        {children}
      </Box>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

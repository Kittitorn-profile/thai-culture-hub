'use client';

import type { BoxProps } from '@mui/material';
import type { Breakpoint } from '@mui/material/styles';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { Stack, Typography } from '@mui/material';

import { Image } from 'src/components/image';

import { layoutClasses } from '../core';

// ----------------------------------------------------------------------

export type AuthSplitContentProps = BoxProps & {
  layoutQuery?: Breakpoint;
  variant?: 'default' | 'admin';
};

export function AuthSplitContent({
  sx,
  children,
  className,
  layoutQuery = 'md',
  variant = 'default',
  ...other
}: AuthSplitContentProps) {
  const isAdmin = variant === 'admin';

  return (
    <Box
      className={mergeClasses([layoutClasses.content, className])}
      sx={[
        (theme) => ({
          display: 'flex',
          flex: '1 1 auto',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          minHeight: '100dvh',
          p: theme.spacing(3, 2),
          [theme.breakpoints.up(layoutQuery)]: {
            justifyContent: 'center',
            p: theme.spacing(4, 2),
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          width: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 'var(--layout-auth-content-width)',
        }}
      >
        <Stack spacing={1}>
          <Box sx={{ textAlign: 'center', color: '#fff' }}>
            <Image
              alt="Single logo"
              sx={{
                width: isAdmin ? { xs: 104, md: 140 } : { xs: 96, md: 200 },
                mb: { xs: 0.5, md: 0 },
              }}
              src="/logo/logo-single.png"
            />

            {isAdmin && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  mt: 2,
                  mx: 'auto',
                  width: 'fit-content',
                  borderRadius: 999,
                  color: '#2a3736',
                  bgcolor: '#ead7a1',
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 1.2,
                }}
              >
                ADMIN PORTAL
              </Box>
            )}

            <Typography
              sx={{
                mt: isAdmin ? 1.5 : 2.5,
                fontSize: isAdmin ? { xs: 23, md: 27 } : { xs: 25, md: 30 },
                fontWeight: 950,
              }}
            >
              {isAdmin ? 'ระบบจัดการ Thai Culture Hub' : 'Thai Culture Hub'}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                mx: 'auto',
                maxWidth: 360,
                opacity: 0.76,
                fontSize: isAdmin ? 13 : 16,
                lineHeight: isAdmin ? 1.65 : 1.8,
              }}
            >
              {isAdmin
                ? 'พื้นที่สำหรับผู้ดูแลระบบและทีมงานที่ได้รับอนุญาต'
                : 'ขอบคุณทุกแหล่งข้อมูลที่เปิดให้เข้าถึงและนำมาต่อยอด เรานำข้อมูลมาจัดระเบียบเพื่อการสำรวจและการเรียนรู้ โดยยังคงอ้างอิงที่มาของข้อมูล'}
            </Typography>
          </Box>

          {children}
        </Stack>
      </Box>
    </Box>
  );
}

'use client';

import type { BoxProps } from '@mui/material';
import type { Breakpoint } from '@mui/material/styles';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { Stack, Typography } from '@mui/material';

import { Image } from 'src/components/image';

import { layoutClasses } from '../core';

// ----------------------------------------------------------------------

export type AuthSplitContentProps = BoxProps & { layoutQuery?: Breakpoint };

export function AuthSplitContent({
  sx,
  children,
  className,
  layoutQuery = 'md',
  ...other
}: AuthSplitContentProps) {
  return (
    <Box
      className={mergeClasses([layoutClasses.content, className])}
      sx={[
        (theme) => ({
          display: 'flex',
          flex: '1 1 auto',
          alignItems: 'center',
          flexDirection: 'column',
          p: theme.spacing(3, 2, 10, 2),
          [theme.breakpoints.up(layoutQuery)]: {
            justifyContent: 'center',
            p: theme.spacing(10, 2, 10, 2),
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
        <Stack
          spacing={2}
          sx={{
            p: 3,
            height: 1,
            borderRadius: 1,
            justifyContent: 'space-between',
            bgcolor: 'rgba(42,55,54,0.28)',
            border: '1px solid rgba(255,255,255,0.24)',
          }}
        >
          <Box sx={{ textAlign: 'center', color: '#fff' }}>
            <Image
              alt="Single logo"
              sx={{
                width: { xs: 96, md: 200 },
                mb: { xs: 0.5, md: 0 },
              }}
              src="/logo/logo-single.png"
            />

            <Typography sx={{ mt: 2.5, fontSize: { xs: 25, md: 30 }, fontWeight: 950 }}>
              Thai Culture Hub
            </Typography>

            <Typography sx={{ mt: 1, lineHeight: 1.8 }}>
              ขอบคุณทุกแหล่งข้อมูลที่เปิดให้เข้าถึงและนำมาต่อยอด
              เรานำข้อมูลมาจัดระเบียบเพื่อการสำรวจและการเรียนรู้ โดยยังคงอ้างอิงที่มาของข้อมูล
            </Typography>
          </Box>

          {children}
        </Stack>
      </Box>
    </Box>
  );
}

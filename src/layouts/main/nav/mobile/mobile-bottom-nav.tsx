'use client';

import type { Breakpoint } from '@mui/material/styles';

import {
  RiMap2Line,
  RiHome5Line,
  RiQuillPenLine,
  RiDatabase2Line,
  RiCustomerService2Line,
} from '@remixicon/react';

import { Box, ButtonBase, Typography } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';
import { useDatasetVisibility } from 'src/lib/use-dataset-visibility';

type Props = {
  pathname: string;
  isCreator: boolean;
  layoutQuery: Breakpoint;
};

export function MobileBottomNav({ pathname, isCreator, layoutQuery }: Props) {
  const { isVisible } = useDatasetVisibility();
  const current = pathname.replace(/\/$/, '') || '/';
  const dataActive =
    current.startsWith('/cultural-data') ||
    PUBLIC_DATA_GROUPS.some(
      (group) => group.key !== 'places' && current.startsWith(group.href.replace(/\/$/, ''))
    );
  const items = [
    { label: 'หน้าแรก', href: '/', Icon: RiHome5Line, active: current === '/' },
    {
      label: 'สำรวจ',
      href: '/culture-category/',
      Icon: RiMap2Line,
      active: ['/culture-category', '/culture-place', '/province'].some((prefix) =>
        current.startsWith(prefix)
      ),
    },
    { label: 'ชุดข้อมูล', href: '/cultural-data/', Icon: RiDatabase2Line, active: dataActive },
    isCreator
      ? {
          label: 'บทความ',
          href: '/creator/articles/',
          Icon: RiQuillPenLine,
          active: ['/creator/articles', '/creator/write'].some((prefix) =>
            current.startsWith(prefix)
          ),
        }
      : {
          label: 'ติดต่อ',
          href: '/contact-us/',
          Icon: RiCustomerService2Line,
          active: current === '/contact-us',
        },
  ];
  const itemSx = {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'column',
    gap: 0.25,
    color: '#758078',
    borderRadius: 2,
    '&:focus-visible': { outline: '2px solid #608d8c', outlineOffset: -3 },
  } as const;
  return (
    <Box
      component="nav"
      aria-label="เมนูหลักบนมือถือ"
      sx={(theme) => ({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        display: 'flex',
        px: 1,
        pt: 0.5,
        pb: 'env(safe-area-inset-bottom, 0px)',
        bgcolor: '#fff',
        borderTop: '1px solid #e5e8e1',
        boxShadow: '0 -4px 20px rgba(30,45,35,0.04)',
        [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
      })}
    >
      {items
        .filter((item) => item.href !== '/culture-category/' || isVisible('places'))
        .map(({ label, href, Icon, active }) => (
          <ButtonBase
            key={href}
            component={RouterLink}
            href={href}
            aria-current={active ? 'page' : undefined}
            sx={{ ...itemSx, color: active ? '#2c4036' : itemSx.color }}
          >
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 28,
                borderRadius: 3,
              }}
            >
              <Icon size={22} />
            </Box>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>
              {label}
            </Typography>
          </ButtonBase>
        ))}
    </Box>
  );
}

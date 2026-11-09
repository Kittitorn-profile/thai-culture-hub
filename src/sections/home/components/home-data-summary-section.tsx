'use client';

import { useQuery } from '@tanstack/react-query';
import { RiDatabase2Line, RiArrowRightUpLine } from '@remixicon/react';

import { Box, Link, Stack, Button, Skeleton, Typography } from '@mui/material';

import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

type Summary = {
  groups: {
    key: string;
    label: string;
    unit: string;
    source: string;
    note: string;
    count: number | null;
  }[];
  complete: boolean;
};
const number = new Intl.NumberFormat('th-TH');

export function HomeDataSummarySection() {
  const { data, isPending, isError, refetch, isFetching } = useQuery<Summary>({
    queryKey: ['public-cultural-data-summary', 3],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/culture/data-summary', { signal });
      if (!response.ok) throw new Error('Summary unavailable');
      return response.json();
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return (
    <Box
      component="section"
      aria-labelledby="data-summary-heading"
      sx={{ px: HOME_SECTION_PX, py: { xs: 4, md: 6 }, color: HOME_TEXT }}
    >
      <Box
        sx={{
          maxWidth: HOME_SECTION_MAX_WIDTH,
          mx: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          pt: { xs: 3, md: 4 },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#52675c', mb: 1.5 }}>
          <RiDatabase2Line size={18} />
          <Typography variant="overline">ฐานข้อมูลวัฒนธรรม</Typography>
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              id="data-summary-heading"
              component="h2"
              sx={{ fontSize: { xs: 23, md: 36 }, fontWeight: 700, lineHeight: 1.35 }}
            >
              เลือกข้อมูลวัฒนธรรมที่คุณสนใจ
            </Typography>
            <Typography
              sx={{ color: 'text.secondary', mt: 1, fontSize: { xs: 13, sm: 14 }, lineHeight: 1.8 }}
            >
              เริ่มจากสถานที่ ผู้คน มรดกภูมิปัญญา ผลิตภัณฑ์ หรือผ้าและงานช่าง
            </Typography>
          </Box>
          <Link
            href="/cultural-data/"
            color="inherit"
            underline="hover"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            ดูประเภทข้อมูลทั้งหมด <RiArrowRightUpLine size={18} />
          </Link>
        </Stack>
        <Box
          sx={{
            display: { xs: 'flex', md: 'grid' },
            mx: { xs: -2, sm: -4, md: 0 },
            px: { xs: 2, sm: 4, md: 0 },
            pb: { xs: 1, md: 0 },
            overflowX: { xs: 'auto', md: 'visible' },
            scrollSnapType: { xs: 'x mandatory', md: 'none' },
            scrollPaddingInline: { xs: '16px', sm: '32px', md: 0 },
            overscrollBehaviorX: 'contain',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& > *': {
              flex: { xs: '0 0 88%', md: 'initial' },
              scrollSnapAlign: 'start',
            },
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
          aria-busy={isPending}
          role="region"
          aria-label="ประเภทข้อมูลวัฒนธรรม เลื่อนซ้ายขวาเพื่อดูเพิ่มเติม"
          tabIndex={0}
        >
          {isPending &&
            Array.from({ length: PUBLIC_DATA_GROUPS.length }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={188} />
            ))}
          {data?.groups.map((group, index) => (
            <Box
              key={group.key}
              component="a"
              href={PUBLIC_DATA_GROUPS.find((item) => item.key === group.key)?.href}
              sx={{
                minWidth: 0,
                textDecoration: 'none',
                transition: 'box-shadow 150ms',
                '&:hover': { boxShadow: '0 4px 18px rgba(44,64,54,0.12)' },
                '&:focus-visible': { outline: '2px solid #608d8c', outlineOffset: 3 },
                p: { xs: 2, md: 3 },
                borderRadius: 2.5,
                bgcolor: index === 0 ? '#2c4036' : '#eeefea',
                color: index === 0 ? '#fff' : 'inherit',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                {PUBLIC_DATA_GROUPS.find((item) => item.key === group.key)?.label ?? group.label} ↗
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ my: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 34, md: 40 },
                    lineHeight: 1.1,
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {group.count === null ? '—' : number.format(group.count)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  {group.unit}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {PUBLIC_DATA_GROUPS.find((item) => item.key === group.key)?.description ??
                  group.note}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: '1px solid',
                  borderColor: index === 0 ? 'rgba(255,255,255,0.18)' : 'divider',
                  opacity: 0.7,
                }}
              >
                ที่มา: {group.source}
              </Typography>
            </Box>
          ))}
        </Box>
        {(isError || data?.complete === false) && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ยังโหลดจำนวนบางชุดไม่ได้
            </Typography>
            <Button size="small" disabled={isFetching} onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          เรื่องเดียวกันอาจเชื่อมโยงสถานที่ ผู้คน และสินค้า แต่แสดงแยกตามประเภทข้อมูล
        </Typography>
      </Box>
    </Box>
  );
}

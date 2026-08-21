'use client';

import type { PerformanceGroupYearlyRecord } from './performance-group-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

type Props = {
  awards: PerformanceGroupYearlyRecord['awards'];
};

export function PerformanceGroupAwards({ awards }: Props) {
  if (awards.length === 0) return null;

  return (
    <Box sx={{ mt: 2.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Iconify icon="solar:cup-star-bold" width={24} sx={{ color: '#b56a00' }} />
        <Typography sx={{ fontWeight: 900, color: '#5b431d' }}>รางวัลที่ได้รับ</Typography>
      </Stack>
      <Stack spacing={1.5}>
        {awards.map((award) => (
          <Box
            key={`${award.year}-${award.title}`}
            sx={{
              p: { xs: 2, md: 2.5 },
              overflow: 'hidden',
              position: 'relative',
              borderRadius: 2,
              border: '1px solid rgba(196,126,24,0.24)',
              background: 'linear-gradient(135deg, rgba(255,246,224,0.98), rgba(250,229,181,0.58))',
              boxShadow: '0 10px 28px rgba(132,86,20,0.08)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '0 auto 0 0',
                width: 5,
                bgcolor: '#c47e18',
              },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.75, sm: 1.5 }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Box
                sx={{
                  px: 1.25,
                  py: 0.45,
                  flexShrink: 0,
                  borderRadius: 999,
                  color: '#fff8e8',
                  bgcolor: '#b56a00',
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {award.year}
              </Box>
              <Typography
                sx={{
                  color: '#754700',
                  fontSize: { xs: 17, md: 19 },
                  fontWeight: 900,
                  lineHeight: 1.4,
                }}
              >
                {award.title}
              </Typography>
            </Stack>
            {award.description && (
              <Typography sx={{ mt: 1.25, pl: { sm: 0 }, color: '#6d7885', lineHeight: 1.7 }}>
                {award.description}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

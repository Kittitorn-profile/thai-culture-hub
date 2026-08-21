'use client';

import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { formatUpdatedDate } from './performance-group-utils';

type Props = {
  group: PerformanceGroupEntry;
};

export function PerformanceGroupSourceFooter({ group }: Props) {
  if (!group.sourceLabel && !group.sourceUrl && !group.updatedAt) return null;

  return (
    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box>
        {(group.sourceLabel || group.sourceUrl) && (
          <Stack spacing={1} alignItems="flex-start">
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
              ที่มาของข้อมูล
            </Typography>
            {group.sourceUrl ? (
              <Button
                component="a"
                href={group.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                endIcon={<Iconify icon="eva:external-link-fill" />}
                sx={{
                  color: '#fff',
                  bgcolor: '#1d2933',
                  fontWeight: 900,
                  '&:hover': { bgcolor: '#111c25' },
                }}
              >
                {group.sourceLabel || 'ดูข้อมูลจากแหล่งต้นทาง'}
              </Button>
            ) : (
              <Typography sx={{ fontWeight: 800 }}>{group.sourceLabel}</Typography>
            )}
          </Stack>
        )}
        {group.updatedAt && (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              mt: group.sourceLabel || group.sourceUrl ? 2 : 0,
              color: 'text.secondary',
            }}
          >
            <Iconify icon="solar:calendar-date-bold" width={18} />
            <Typography variant="body2">อัปเดตล่าสุด {formatUpdatedDate(group.updatedAt)}</Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

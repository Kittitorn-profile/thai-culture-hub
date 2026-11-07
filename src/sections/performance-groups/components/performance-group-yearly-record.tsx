'use client';

import type { PerformanceGroupYearlyRecord as YearlyRecord } from './performance-group-types';
import type { HomeEventItem, PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { HomePlayButton } from 'src/sections/home/components/home-play-button';

import { PerformanceGroupAwards } from './performance-group-awards';
import { PerformanceGroupCastOfYear } from './performance-group-cast-of-year';
import { PerformanceGroupContestEvents } from './performance-group-contest-events';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => <Box sx={{ width: 1, height: 1, bgcolor: '#fff' }} />,
});

type Props = {
  group: PerformanceGroupEntry;
  record: YearlyRecord;
  contestEvents: HomeEventItem[];
};

export function PerformanceGroupYearlyRecordCard({ group, record, contestEvents }: Props) {
  const primaryColor = group.primaryColor || '#637e69';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 2,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 0,
        border: 0,
        bgcolor: 'transparent',
        boxShadow: 'none',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 1.75,
          borderRadius: 2,
          bgcolor: '#ede9de',
          color: '#252d31',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {record.logoUrl ? (
            <Avatar
              variant="circular"
              src={record.logoUrl}
              alt={`โลโก้ปี ${record.year}`}
              sx={{ width: 48, height: 48, bgcolor: '#fff', '& img': { objectFit: 'contain' } }}
            />
          ) : (
            <Box
              sx={{
                width: 56,
                height: 56,
                display: 'grid',
                flexShrink: 0,
                placeItems: 'center',
                borderRadius: 1.5,
                bgcolor: '#f0f2ef',
                fontWeight: 600,
              }}
            >
              {record.year.slice(-2)}
            </Box>
          )}
          <Box>
            <Typography sx={{ fontSize: 11, color: '#79613b', fontWeight: 600 }}>
              สรุปผลงาน
            </Typography>
            <Typography component="h3" variant="h5" sx={{ fontWeight: 600, color: '#293c34' }}>
              ปี {record.year}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {Boolean(record.performanceImages?.length) && (
            <Chip
              label={`${record.performanceImages?.length ?? 0} ภาพ`}
              size="small"
              sx={{ color: '#52605a', bgcolor: '#f0f2ef' }}
            />
          )}
          {record.awards.length > 0 && (
            <Chip
              label={`${record.awards.length} รางวัล`}
              size="small"
              sx={{ color: '#52605a', bgcolor: '#f0f2ef' }}
            />
          )}
        </Stack>
      </Stack>

      <Box sx={{ minWidth: 0 }}>
        <PerformanceGroupContestEvents
          group={group}
          record={record}
          contestEvents={contestEvents}
        />

        {record.about && (
          <Typography
            sx={{
              mt: 2,
              pl: 2,
              py: 0.5,
              borderLeft: '2px solid #ad8650',
              fontSize: 14,
              lineHeight: 1.9,
              color: 'text.secondary',
              whiteSpace: 'pre-line',
            }}
          >
            {record.about}
          </Typography>
        )}
        {record.details && (
          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>{record.details}</Typography>
        )}
        {record.note && (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            หมายเหตุ: {record.note}
          </Typography>
        )}
        {record.storyTypes?.length ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            {record.storyTypes.map((storyType) => (
              <Chip key={storyType} label={storyType} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : null}

        <PerformanceGroupCastOfYear group={group} record={record} primaryColor={primaryColor} />

        {record.performanceImages?.length ? (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ mb: 1.25, fontWeight: 600 }}>ภาพการแสดง</Typography>
            <Box
              sx={{
                gap: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              {record.performanceImages.map((imageUrl, imageIndex) => (
                <Box
                  key={`${imageUrl}-${imageIndex}`}
                  component="img"
                  src={imageUrl}
                  loading="lazy"
                  alt={`ภาพการแสดง ${group.name} ปี ${record.year}`}
                  sx={{
                    width: 1,
                    aspectRatio: '4 / 3',
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    transition: 'transform 180ms ease',
                    '&:hover': { transform: 'scale(1.02)' },
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : null}

        {record.bookletUrl && (
          <Button
            component="a"
            href={record.bookletUrl}
            target="_blank"
            variant="outlined"
            size="small"
            sx={{ mt: 1.5 }}
          >
            เปิดสูจิบัตร {record.bookletName ? `(${record.bookletName})` : ''}
          </Button>
        )}

        {record.youtubeUrl && (
          <Box sx={{ mt: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
              <Iconify icon="solar:video-frame-play-horizontal-bold" width={24} />
              <Typography sx={{ fontWeight: 600 }}>วิดีโอการแสดง</Typography>
            </Stack>
            <Box
              sx={{
                width: 1,
                aspectRatio: '16 / 9',
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: '#1f2928',
                border: '1px solid rgba(42,55,54,0.18)',
                boxShadow: 'none',
                '& > div': { width: '100% !important', height: '100% !important' },
              }}
            >
              <ReactPlayer
                src={record.youtubeUrl}
                light={record.performanceImages?.[0] || true}
                controls
                width="100%"
                height="100%"
                playIcon={<HomePlayButton />}
                previewAriaLabel={`เล่นวิดีโอการแสดง ${group.name} ปี ${record.year}`}
              />
            </Box>
          </Box>
        )}

        <PerformanceGroupAwards awards={record.awards} />
      </Box>
    </Box>
  );
}

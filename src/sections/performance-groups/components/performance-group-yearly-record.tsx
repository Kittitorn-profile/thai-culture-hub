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
  loading: () => <Box sx={{ width: 1, height: 1, bgcolor: 'rgba(42,55,54,0.12)' }} />,
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
        p: { xs: 2, md: 3 },
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 3,
        border: '1px solid rgba(42,55,54,0.16)',
        bgcolor: '#fff',
        boxShadow: '0 20px 50px rgba(42,55,54,0.11)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 26px 60px rgba(42,55,54,0.15)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{
          mx: { xs: -2, md: -3 },
          mt: { xs: -2, md: -3 },
          mb: { xs: 2, md: 3 },
          px: { xs: 2, md: 3 },
          py: 2.25,
          color: '#f8f6ee',
          background: `linear-gradient(135deg, ${primaryColor}, #2a3736)`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {record.logoUrl ? (
            <Avatar
              variant="circular"
              src={record.logoUrl}
              alt={`โลโก้ปี ${record.year}`}
              sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.16)' }}
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
                bgcolor: 'rgba(255,255,255,0.14)',
                fontWeight: 950,
              }}
            >
              {record.year.slice(-2)}
            </Box>
          )}
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 900 }}>
              YEARLY HIGHLIGHT
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 950 }}>
              ปี {record.year}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            label={`${record.performanceImages?.length ?? 0} ภาพ`}
            size="small"
            sx={{ color: '#f8f6ee', bgcolor: 'rgba(255,255,255,0.14)' }}
          />
          <Chip
            label={`${record.awards.length} รางวัล`}
            size="small"
            sx={{ color: '#f8f6ee', bgcolor: 'rgba(255,255,255,0.14)' }}
          />
        </Stack>
      </Stack>

      <PerformanceGroupContestEvents group={group} record={record} contestEvents={contestEvents} />

      {record.about && <Typography sx={{ mt: 1 }}>{record.about}</Typography>}
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
          <Typography sx={{ mb: 1.25, fontWeight: 900 }}>ภาพการแสดง</Typography>
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
            <Typography sx={{ fontWeight: 900 }}>วิดีโอการแสดง</Typography>
          </Stack>
          <Box
            sx={{
              width: 1,
              aspectRatio: '16 / 9',
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: '#1f2928',
              border: '1px solid rgba(42,55,54,0.18)',
              boxShadow: '0 16px 38px rgba(31,40,38,0.16)',
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
  );
}

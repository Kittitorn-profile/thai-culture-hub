'use client';

import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

type Props = {
  group: PerformanceGroupEntry;
  counts: { views: number; shares: number };
  onShare: (platform: 'facebook' | 'line') => void;
};

export function PerformanceGroupHeader({ group, counts, onShare }: Props) {
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);

  const handleShare = (platform: 'facebook' | 'line') => {
    setShareAnchor(null);
    onShare(platform);
  };

  return (
    <>
      {group.coverImageUrl && (
        <Box
          component="img"
          src={group.coverImageUrl}
          alt={`ภาพปก ${group.name}`}
          sx={{
            width: 1,
            display: 'block',
            maxHeight: 620,
            aspectRatio: { xs: '4 / 3', sm: '16 / 8', lg: '16 / 7' },
            objectFit: 'cover',
          }}
        />
      )}

      <Box sx={{ px: { xs: 2.5, md: 5 }, pt: { xs: 2.5, md: 4 }, pb: { xs: 1, md: 1.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={{ xs: 1.5, sm: 2 }}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            {group.logoUrl && (
              <Avatar
                variant="rounded"
                src={group.logoUrl}
                alt={`โลโก้ ${group.name}`}
                sx={{ width: { xs: 64, md: 100, xl: 200 }, height: { xs: 64, md: 100, xl: 200 } }}
              />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 26, sm: 34, md: 42 },
                  lineHeight: 1.15,
                  fontWeight: 950,
                  overflowWrap: 'anywhere',
                }}
              >
                {group.name}
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                {[group.category, group.provinceName && `จังหวัด${group.provinceName}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {group.isFeatured && <Chip label="วงแนะนำ" color="warning" />}
            {group.acceptsBookings && (
              <Chip label="เปิดรับงาน" color="success" variant="outlined" />
            )}
          </Stack>
        </Stack>

        {group.description && (
          <Typography sx={{ mt: 3, maxWidth: 900, fontSize: 18, lineHeight: 1.8 }}>
            {group.description}
          </Typography>
        )}

        <Stack
          direction="row"
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 2.5, '& .MuiButton-root': { flexGrow: { xs: 1, sm: 0 } } }}
        >
          {group.contactPhone && (
            <Button component="a" href={`tel:${group.contactPhone}`} variant="contained">
              โทร {group.contactPhone}
            </Button>
          )}
          {group.contactEmail && (
            <Button component="a" href={`mailto:${group.contactEmail}`} variant="outlined">
              อีเมล
            </Button>
          )}
          {group.lineUrl && (
            <Button
              component="a"
              href={group.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<Iconify icon={'simple-icons:line' as never} />}
              endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
              sx={{ color: '#06a947', borderColor: '#06c755' }}
            >
              LINE
            </Button>
          )}
          {group.facebookUrl && (
            <Button
              component="a"
              href={group.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<Iconify icon="socials:facebook" />}
              endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
              sx={{
                color: '#fff',
                bgcolor: '#1877f2',
                '&:hover': { bgcolor: '#1265d5' },
              }}
            >
              ไปยังเพจ Facebook
            </Button>
          )}
          {group.youtubeUrl && (
            <Button
              component="a"
              href={group.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<Iconify icon={'logos:youtube-icon' as never} />}
              endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
              sx={{ color: '#d92323', borderColor: 'rgba(217,35,35,0.5)' }}
            >
              YouTube
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 2.5 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Iconify icon="solar:eye-bold" width={21} />
            <Typography sx={{ fontWeight: 800 }}>{counts.views} ครั้ง</Typography>
          </Stack>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <IconButton
              aria-label="แชร์วงนี้"
              aria-haspopup="true"
              aria-expanded={Boolean(shareAnchor)}
              onClick={(event) => setShareAnchor(event.currentTarget)}
              sx={{ color: 'inherit' }}
            >
              <Iconify icon="solar:share-bold" width={21} />
            </IconButton>
            <Typography sx={{ fontWeight: 800 }}>{counts.shares} แชร์</Typography>
          </Stack>
        </Stack>
      </Box>

      <Popover
        open={Boolean(shareAnchor)}
        anchorEl={shareAnchor}
        onClose={() => setShareAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 1.5,
              borderRadius: 2,
              boxShadow: '0 16px 40px rgba(31,40,38,0.2)',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 900 }}>
          แชร์วงนี้ไปยัง
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            type="button"
            variant="contained"
            onClick={() => handleShare('facebook')}
            sx={{ color: '#fff', bgcolor: '#1877f2', '&:hover': { bgcolor: '#0f65d8' } }}
          >
            Facebook
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={() => handleShare('line')}
            sx={{ color: '#fff', bgcolor: '#06c755', '&:hover': { bgcolor: '#05ad4a' } }}
          >
            LINE
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

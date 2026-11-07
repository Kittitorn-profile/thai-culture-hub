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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: group.coverImageUrl ? '1.2fr 1fr' : '1fr' },
          gap: { xs: 0, md: 0 },
          overflow: 'hidden',
          borderRadius: { xs: 2.5, md: 3 },
          bgcolor: '#f0ede5',
          alignItems: 'stretch',
        }}
      >
        {group.coverImageUrl && (
          <Box
            component="img"
            src={group.coverImageUrl}
            alt={`ภาพปก ${group.name}`}
            sx={{
              width: 1,
              display: 'block',
              height: '100%',
              minHeight: { md: 420 },
              maxHeight: { xs: 360, md: 520 },
              borderRadius: 0,
              aspectRatio: { xs: '4 / 3', sm: '16 / 9', md: '4 / 3' },
              objectFit: 'cover',
            }}
          />
        )}

        <Box
          sx={{
            minWidth: 0,
            px: { xs: 2.5, md: 4 },
            py: { xs: 3, md: 3.5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              fontSize: 12,
              fontWeight: 600,
              color: '#79613b',
              '&::before': { content: '""', width: 28, height: 2, bgcolor: '#ad8650' },
            }}
          >
            ศิลปิน · ดนตรี · วัฒนธรรม
          </Typography>
          <Stack
            direction="column"
            spacing={2}
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Stack direction="column" spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
              {group.logoUrl && (
                <Avatar
                  variant="rounded"
                  src={group.logoUrl}
                  alt={`โลโก้ ${group.name}`}
                  sx={{
                    width: 56,
                    height: 56,
                    flexShrink: 0,
                    bgcolor: '#fff',
                    border: '1px solid #e1d8c6',
                    borderRadius: '50%',
                    '& img': { objectFit: 'contain', p: 0.5 },
                  }}
                />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 28, md: 36, lg: 40 },
                    lineHeight: 1.35,
                    fontWeight: 600,
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
              {group.isFeatured && (
                <Chip
                  label="วงแนะนำ"
                  size="small"
                  sx={{
                    bgcolor: '#e8ddc3',
                    color: '#705c2c',
                    borderRadius: 1,
                    height: 24,
                    fontSize: 11,
                  }}
                />
              )}
              {group.acceptsBookings && <Chip label="เปิดรับงาน" size="small" variant="outlined" />}
            </Stack>
          </Stack>

          {group.description && (
            <Typography
              sx={{
                mt: 2,
                maxWidth: 900,
                fontSize: 15,
                lineHeight: 1.9,
                color: 'text.secondary',
                whiteSpace: 'pre-line',
              }}
            >
              {group.description}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={1.25}
            useFlexGap
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              '& .MuiButton-root': {
                flexGrow: { xs: 1, sm: 0 },
                minHeight: 44,
                px: 2,
                fontSize: 13,
                borderRadius: 1.25,
              },
            }}
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
                  bgcolor: '#293c34',
                  '&:hover': { bgcolor: '#3c5147' },
                }}
              >
                ติดต่อผ่าน Facebook
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

          <Stack
            direction="row"
            spacing={2.5}
            alignItems="center"
            sx={{
              mt: 3,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              '& .MuiTypography-root': { fontSize: 12, fontWeight: 400 },
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Iconify icon="solar:eye-bold" width={18} />
              <Typography>เข้าชม {counts.views} ครั้ง</Typography>
            </Stack>
            <Stack direction="row" spacing={0.25} alignItems="center">
              <IconButton
                aria-label="แชร์วงนี้"
                aria-haspopup="true"
                aria-expanded={Boolean(shareAnchor)}
                onClick={(event) => setShareAnchor(event.currentTarget)}
                sx={{ color: 'inherit', width: 40, height: 40, '&:hover': { bgcolor: '#e4e0d6' } }}
              >
                <Iconify icon="solar:share-bold" width={18} />
              </IconButton>
              <Typography sx={{ fontWeight: 800 }}>{counts.shares} แชร์</Typography>
            </Stack>
          </Stack>
        </Box>
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
              boxShadow: 'none',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
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

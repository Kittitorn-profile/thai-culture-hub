'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

type PopupBanner = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  button_label?: string | null;
  button_url?: string | null;
  dismissible?: boolean | null;
  show_once?: boolean | null;
  updated_at?: string | null;
};

export function HomePopupBanner() {
  const [banner, setBanner] = useState<PopupBanner | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPopupBanner() {
      try {
        const response = await fetch('/api/popup-banners', { signal: controller.signal });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { data?: PopupBanner | null };
        const nextBanner = json.data ?? null;

        if (!nextBanner?.title) {
          return;
        }

        setBanner(nextBanner);
        setOpen(true);
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name !== 'AbortError') {
          console.warn('Unable to load popup banner', caughtError);
        }
      }
    }

    loadPopupBanner();

    return () => controller.abort();
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  if (!banner) {
    return null;
  }

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={banner.dismissible === false ? undefined : handleClose}
      slotProps={{
        backdrop: {
          sx: { bgcolor: 'rgba(30,35,34,0.62)', backdropFilter: 'blur(2px)' },
        },
        paper: {
          sx: {
            m: 2,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#ffffff',
            boxShadow: '0 28px 90px rgba(0,0,0,0.35)',
          },
        },
      }}
    >
      {banner.dismissible !== false && (
        <IconButton
          aria-label="ปิด popup"
          onClick={handleClose}
          sx={{
            top: 12,
            right: 12,
            zIndex: 2,
            position: 'absolute',
            color: 'text.secondary',
            bgcolor: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.96)' },
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      )}

      {banner.image_url && (
        <Image
          alt={banner.title}
          src={banner.image_url}
          ratio="16/9"
          visibleByDefault
          sx={{ bgcolor: 'background.neutral' }}
        />
      )}

      <Stack spacing={2} alignItems="center" sx={{ px: { xs: 3, sm: 5 }, py: { xs: 4, sm: 5 } }}>
        <Typography
          variant="h3"
          sx={{
            maxWidth: 430,
            textAlign: 'center',
            fontWeight: 900,
            lineHeight: 1.08,
            color: 'grey.900',
          }}
        >
          {banner.title}
        </Typography>

        {banner.description && (
          <Typography
            sx={{
              maxWidth: 460,
              color: 'text.secondary',
              textAlign: 'center',
              lineHeight: 1.7,
            }}
          >
            {banner.description}
          </Typography>
        )}

        {banner.button_label && banner.button_url && (
          <Button
            component="a"
            href={banner.button_url}
            target={banner.button_url.startsWith('http') ? '_blank' : undefined}
            rel={banner.button_url.startsWith('http') ? 'noreferrer' : undefined}
            variant="contained"
            color="inherit"
            onClick={handleClose}
            sx={{
              mt: 1,
              px: 2.5,
              borderRadius: 999,
              color: 'common.white',
              bgcolor: 'grey.900',
              '&:hover': { bgcolor: 'grey.800' },
            }}
          >
            {banner.button_label}
          </Button>
        )}

        {!banner.button_label && !banner.button_url && banner.dismissible !== false && (
          <Box sx={{ height: 4 }} />
        )}
      </Stack>
    </Dialog>
  );
}

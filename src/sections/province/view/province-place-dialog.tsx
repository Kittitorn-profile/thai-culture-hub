'use client';

import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

import { getCategoryColor, getCategoryLabel } from '../category-config';

type ProvincePlaceDialogProps = {
  place: CulturalPlace | null;
  placeIndex: number;
  placeImages: string[];
  provinceDisplayName: string;
  coordinates: string;
  categoryConfig: CategoryConfigMap;
  onClose: () => void;
};

export function ProvincePlaceDialog({
  place,
  placeIndex,
  placeImages,
  provinceDisplayName,
  coordinates,
  categoryConfig,
  onClose,
}: ProvincePlaceDialogProps) {
  const theme = useTheme();
  const categoryColor = place ? getCategoryColor(categoryConfig, place.category) : '#608D8C';

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={Boolean(place)}
      onClose={onClose}
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: '#fbf7ed',
        },
      }}
    >
      {place && (
        <>
          <DialogTitle
            sx={{
              pr: 7,
              color: theme.palette.grey[900],
              fontWeight: 900,
            }}
          >
            {placeIndex + 1}. {place.name}
            <IconButton onClick={onClose} sx={{ top: 12, right: 12, position: 'absolute' }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 0, pb: 3 }}>
            <Box
              sx={{
                height: { xs: 260, sm: 360 },
                overflow: 'hidden',
                borderRadius: 1.5,
                bgcolor: alpha(categoryColor, 0.16),
                backgroundImage: `url(${placeImages[0]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {placeImages.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.2, overflowX: 'auto', pb: 0.5 }}>
                {placeImages.slice(0, 6).map((imageUrl) => (
                  <Box
                    key={imageUrl}
                    sx={{
                      width: 88,
                      height: 64,
                      flex: '0 0 auto',
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ))}
              </Stack>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ mt: 2, flexWrap: 'wrap' }}
            >
              <Chip
                label={getCategoryLabel(categoryConfig, place.category)}
                sx={{
                  color: 'white',
                  fontWeight: 900,
                  bgcolor: categoryColor,
                }}
              />
              <Chip
                icon={<Iconify icon="custom:location-fill" />}
                label={place.district || provinceDisplayName}
                sx={{ fontWeight: 800 }}
              />
              <Chip label={coordinates} sx={{ fontWeight: 800 }} />
            </Stack>

            <Typography sx={{ mt: 2, color: 'text.primary', fontWeight: 900 }}>
              {place.highlight}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: 'text.secondary',
                lineHeight: 1.8,
                whiteSpace: 'pre-line',
              }}
            >
              {place.description}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.4 }}>
              {place.mapUrl && (
                <Box
                  component="a"
                  href={place.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    px: 2,
                    py: 1,
                    color: 'white',
                    fontWeight: 900,
                    borderRadius: 1,
                    textAlign: 'center',
                    textDecoration: 'none',
                    bgcolor: categoryColor,
                  }}
                >
                  เปิดแผนที่
                </Box>
              )}

              {place.sourceUrl && (
                <Box
                  component="a"
                  href={place.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    px: 2,
                    py: 1,
                    fontWeight: 900,
                    borderRadius: 1,
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: categoryColor,
                    border: `1px solid ${alpha(categoryColor, 0.36)}`,
                  }}
                >
                  ดูแหล่งข้อมูล
                </Box>
              )}
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}

'use client';

import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import { FacebookIcon, FacebookShareButton } from 'react-share';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { TruncatedTypography } from 'src/components/typography';

import { getSourceLabel } from './province-detail-utils';
import { getCategoryColor, getCategoryLabel } from '../category-config';

// ----------------------------------------------------------------------

export type PlaceLikeState = {
  liked: boolean;
  likeCount: number;
  loading?: boolean;
};

type ProvincePlaceCardPlace = CulturalPlace & {
  provinceName?: string;
};

type ProvincePlaceCardProps = {
  place: ProvincePlaceCardPlace;
  likeState?: PlaceLikeState;
  categoryConfig: CategoryConfigMap;
  onPlaceLike: (place: CulturalPlace) => void;
  onPlaceSelect: (place: CulturalPlace) => void;
};

const SHARE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';

function getCoordinatesText(place: CulturalPlace) {
  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  return Number.isFinite(placeLat) && Number.isFinite(placeLng)
    ? `${placeLat}, ${placeLng}`
    : 'ไม่พบพิกัด';
}

function getGoogleMapsUrl(place: CulturalPlace) {
  if (place.mapUrl) {
    return place.mapUrl;
  }

  const placeLat = Number(place.lat);
  const placeLng = Number(place.lng);

  return Number.isFinite(placeLat) && Number.isFinite(placeLng)
    ? `https://www.google.com/maps/search/?api=1&query=${placeLat},${placeLng}`
    : null;
}

function getSharePageUrl(place: CulturalPlace) {
  return `${SHARE_SITE_URL}/culture-place/${encodeURIComponent(place.id)}`;
}

function getPlainText(value?: string | null) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ProvincePlaceCard({
  place,
  likeState,
  categoryConfig,
  onPlaceLike,
  onPlaceSelect,
}: ProvincePlaceCardProps) {
  const theme = useTheme();
  const accentColor = getCategoryColor(categoryConfig, place.category);
  const displayHighlight = place.highlight ? getCategoryLabel(categoryConfig, place.highlight) : '';
  const cardImage = place.imageUrls?.[0];
  const googleMapsUrl = getGoogleMapsUrl(place);
  const liked = likeState?.liked ?? false;
  const likeCount = likeState?.likeCount ?? 0;
  const provinceName = place.provinceName ?? '';
  const locationLabel = place.district
    ? [place.district, provinceName].filter(Boolean).join('-')
    : provinceName || place.district;

  return (
    <Box
      id={place.id}
      sx={{
        p: 1,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        border: `1px solid ${alpha(accentColor, 0.16)}`,
        boxShadow: `0 14px 30px ${alpha(theme.palette.grey[900], 0.1)}`,
        height: '100%',
      }}
    >
      <Box
        sx={{
          minHeight: 200,
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          bgcolor: cardImage ? alpha(accentColor, 0.16) : theme.palette.grey[300],
          backgroundImage: cardImage
            ? `linear-gradient(180deg, ${alpha(
                theme.palette.common.black,
                0.02
              )} 0%, ${alpha(theme.palette.common.black, 0.2)} 100%), url(${cardImage})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!cardImage && (
          <Box
            component="img"
            alt="Thailand Cultural Hub"
            src="/assets/th-hub/logo-th-hub.png"
            sx={{
              width: 92,
              maxWidth: '46%',
              opacity: 0.58,
              filter: 'grayscale(1)',
            }}
          />
        )}

        <Box
          sx={{
            top: 0,
            left: '50%',
            px: 2.2,
            py: 0.7,
            color: accentColor,
            fontSize: 12,
            fontWeight: 900,
            borderRadius: '0 0 10px 10px',
            position: 'absolute',
            transform: 'translateX(-50%)',
            bgcolor: '#ffffff',
            boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.12)}`,
            whiteSpace: 'nowrap',
          }}
        >
          {getCategoryLabel(categoryConfig, place.category)}
        </Box>

        {!!locationLabel && (
          <Chip
            size="small"
            label={locationLabel}
            sx={{
              left: 12,
              bottom: 12,
              color: 'white',
              fontWeight: 900,
              position: 'absolute',
              bgcolor: alpha(theme.palette.grey[900], 0.72),
            }}
          />
        )}

        <Button
          onClick={() => onPlaceLike(place)}
          disabled={likeState?.loading}
          startIcon={<Iconify icon={liked ? 'solar:heart-bold' : 'solar:heart-outline'} />}
          sx={{
            top: 12,
            right: 12,
            m: 0,
            px: 1.2,
            py: 0.75,
            border: 0,
            minWidth: 0,
            color: liked ? '#ffffff' : accentColor,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 900,
            borderRadius: 999,
            position: 'absolute',
            bgcolor: liked ? '#e9365f' : alpha('#ffffff', 0.94),
            boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.22)}`,
            '&:hover': {
              bgcolor: liked ? '#d82850' : '#ffffff',
            },
            '&.Mui-disabled': {
              color: liked ? '#ffffff' : accentColor,
              bgcolor: liked ? '#e9365f' : alpha('#ffffff', 0.86),
              opacity: 0.72,
            },
            '& .MuiButton-startIcon': {
              m: 0,
              mr: likeCount ? 0.45 : 0,
            },
          }}
        >
          {likeCount || ''}
        </Button>
      </Box>

      <Box sx={{ px: 0.6, pt: 1.4, pb: 0.4 }}>
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ color: accentColor, fontWeight: 900, fontSize: 14 }}>
            {displayHighlight}
          </Typography>
          <Box
            sx={{
              flexShrink: 0,
              '& button': {
                p: 0,
                m: 0,
                border: 0,
                display: 'flex',
                cursor: 'pointer',
                bgcolor: 'transparent',
              },
            }}
          >
            <FacebookShareButton
              url={getSharePageUrl(place)}
              hashtag="#ThailandCulturalHub"
              aria-label={`แชร์ ${place.name} บน Facebook`}
            >
              <FacebookIcon size={30} round color={accentColor} />
            </FacebookShareButton>
          </Box>
        </Stack>

        <TruncatedTypography
          line={2}
          sx={{
            mt: 0.8,
            color: theme.palette.grey[900],
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.4,
            minHeight: 46,
          }}
        >
          {place.name}
        </TruncatedTypography>
        <TruncatedTypography
          line={2}
          lineHeight={1.5}
          variant="body2"
          sx={{ mt: 1, color: 'text.secondary', minHeight: 42 }}
        >
          {getPlainText(place.description)}
        </TruncatedTypography>
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ color: accentColor, fontSize: 12, fontWeight: 900 }}>
            {getSourceLabel(place.source)}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 800 }}>
            {getCoordinatesText(place)}
          </Typography>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mt: 1.6 }}
        >
          <Stack direction="row" spacing={0.8} sx={{ flexShrink: 0, flex: 1 }}>
            {googleMapsUrl && (
              <Button
                fullWidth
                component="a"
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<Iconify icon="custom:location-fill" />}
                sx={{
                  m: 0,
                  px: 1.4,
                  py: 1,
                  border: 0,
                  color: accentColor,
                  cursor: 'pointer',
                  fontWeight: 900,
                  borderRadius: 1.2,
                  bgcolor: alpha(accentColor, 0.1),
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                }}
              >
                Google Map
              </Button>
            )}

            <Button
              fullWidth
              color="secondary"
              onClick={() => onPlaceSelect(place)}
              sx={{
                m: 0,
                px: 2,
                py: 1,
                border: 0,
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 900,
                borderRadius: 1.2,
                bgcolor: accentColor,
                whiteSpace: 'nowrap',
                boxShadow: `0 10px 22px ${alpha(accentColor, 0.26)}`,
              }}
            >
              ดูรายละเอียด
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

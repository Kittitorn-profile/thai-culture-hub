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

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { TruncatedTypography } from 'src/components/typography';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { getCategoryColor, getCategoryLabel } from '../category-config';
import { getSourceLabel, cleanCulturalUrl, cleanCulturalText } from './province-detail-utils';

// ----------------------------------------------------------------------

export type PlaceLikeState = {
  liked: boolean;
  likeCount: number;
  loading?: boolean;
};

type ProvincePlaceCardPlace = CulturalPlace & {
  provinceCode?: string;
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
  const mapUrl = cleanCulturalUrl(place.mapUrl);

  if (mapUrl) {
    return mapUrl;
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

function getCorrectionRequestHref(place: CulturalPlace) {
  const params = new URLSearchParams({ placeId: place.id });
  const provinceCode = getPlaceProvinceCode(place);

  if (provinceCode) {
    params.set('provinceCode', provinceCode);
  }

  return `/creator/place-corrections/new?${params.toString()}`;
}

function getPlaceProvinceCode(place: CulturalPlace) {
  return (
    place.details?.provinceCode ??
    (place as CulturalPlace & { provinceCode?: string }).provinceCode ??
    ''
  );
}

function getPlainText(value?: string | null) {
  return cleanCulturalText(value);
}

export function ProvincePlaceCard({
  place,
  likeState,
  categoryConfig,
  onPlaceLike,
  onPlaceSelect,
}: ProvincePlaceCardProps) {
  const theme = useTheme();
  const { user } = useAuthContext();
  const isCreator = isCreatorUser(user);
  const accentColor = getCategoryColor(categoryConfig, place.category);
  const cleanHighlight = cleanCulturalText(place.highlight);
  const displayHighlight = cleanHighlight ? getCategoryLabel(categoryConfig, cleanHighlight) : '';
  const cardImage = place.imageUrls?.map(cleanCulturalUrl).find(Boolean);
  const googleMapsUrl = getGoogleMapsUrl(place);
  const liked = likeState?.liked ?? false;
  const likeCount = likeState?.likeCount ?? 0;
  const provinceName = place.provinceName ?? '';
  const placeProvinceCode = getPlaceProvinceCode(place);
  const districtName = cleanCulturalText(place.district);
  const locationLabel = districtName
    ? [districtName, cleanCulturalText(provinceName)].filter(Boolean).join('-')
    : cleanCulturalText(provinceName);
  const descriptionText =
    getPlainText(place.description) ||
    (isCreator ? 'ยังไม่มีคำอธิบายเพิ่มเติมสำหรับสถานที่นี้' : '-');

  return (
    <Box
      id={place.id}
      sx={{
        p: { xs: 0.9, sm: 1 },
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        display: 'flex',
        minWidth: 0,
        flexDirection: 'column',
        border: `1px solid ${alpha(accentColor, 0.16)}`,
        boxShadow: `0 14px 30px ${alpha(theme.palette.grey[900], 0.1)}`,
        height: '100%',
      }}
    >
      <Box
        sx={{
          minHeight: { xs: 168, sm: 188, md: 200 },
          aspectRatio: { xs: '16 / 10', sm: '4 / 3' },
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
            px: { xs: 1.4, sm: 2.2 },
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
            maxWidth: 'calc(100% - 24px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {getCategoryLabel(categoryConfig, place.category)}
        </Box>

        {!!locationLabel && (
          <Chip
            size="small"
            component={placeProvinceCode ? RouterLink : 'div'}
            href={placeProvinceCode ? `/province/${placeProvinceCode}` : undefined}
            clickable={Boolean(placeProvinceCode)}
            label={locationLabel}
            sx={{
              left: 12,
              bottom: 12,
              maxWidth: 'calc(100% - 24px)',
              color: 'white',
              fontWeight: 900,
              position: 'absolute',
              bgcolor: alpha(theme.palette.grey[900], 0.72),
              textDecoration: 'none',
              '&:hover': {
                bgcolor: alpha(theme.palette.grey[900], 0.84),
              },
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

      <Box
        sx={{
          px: { xs: 0.4, sm: 0.6 },
          pt: { xs: 1.15, sm: 1.4 },
          pb: 0.4,
          minWidth: 0,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <TruncatedTypography
            line={1}
            sx={{
              minWidth: 0,
              color: accentColor,
              fontWeight: 900,
              fontSize: { xs: 13, sm: 14 },
            }}
          >
            {displayHighlight}
          </TruncatedTypography>
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
            fontSize: { xs: 16, sm: 18 },
            fontWeight: 900,
            lineHeight: 1.4,
            minHeight: { xs: 44, sm: 50 },
          }}
        >
          {place.name}
        </TruncatedTypography>
        <TruncatedTypography
          line={2}
          lineHeight={1.5}
          variant="body2"
          sx={{
            mt: 0.85,
            color: 'text.secondary',
            minHeight: { xs: 40, sm: 42 },
            fontSize: { xs: 13, sm: 14 },
          }}
        >
          {descriptionText}
        </TruncatedTypography>
        <Box
          sx={{
            mt: 'auto',
            pt: 1.15,
            minWidth: 0,
            display: 'flex',
            gap: 0.75,
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
          }}
        >
          <Typography sx={{ color: accentColor, fontSize: 12, fontWeight: 900 }} noWrap>
            {getSourceLabel(place.source)}
          </Typography>
          <Typography
            sx={{
              minWidth: 0,
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            noWrap
          >
            {getCoordinatesText(place)}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ mt: { xs: 1.25, sm: 1.6 } }}>
          {isCreator && (
            <Button
              fullWidth
              component={RouterLink}
              href={getCorrectionRequestHref(place)}
              startIcon={<Iconify icon="solar:pen-bold" />}
              sx={{
                m: 0,
                px: 1.4,
                py: 0.95,
                border: 0,
                color: accentColor,
                cursor: 'pointer',
                fontWeight: 950,
                borderRadius: 1.2,
                bgcolor: alpha(accentColor, 0.12),
                whiteSpace: 'nowrap',
                boxShadow: `inset 0 0 0 1px ${alpha(accentColor, 0.16)}`,
                '&:hover': {
                  bgcolor: alpha(accentColor, 0.18),
                },
              }}
            >
              ช่วยแก้ไขข้อมูล
            </Button>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 0.8,
              gridTemplateColumns: {
                xs: '1fr',
                sm: googleMapsUrl ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
              },
            }}
          >
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
                  '&:hover': {
                    bgcolor: alpha(accentColor, 0.16),
                  },
                }}
              >
                แผนที่
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
                '&:hover': {
                  bgcolor: accentColor,
                  boxShadow: `0 12px 26px ${alpha(accentColor, 0.34)}`,
                },
              }}
            >
              ดูรายละเอียด
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

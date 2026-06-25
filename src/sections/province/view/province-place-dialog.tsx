'use client';

import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import { FacebookIcon, FacebookShareButton } from 'react-share';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { getCategoryColor, getCategoryLabel } from '../category-config';
import {
  cleanCulturalUrl,
  cleanCulturalText,
  getCorrectionRequestEntryHref,
} from './province-detail-utils';

type ProvincePlaceDialogProps = {
  place: CulturalPlace | null;
  placeIndex: number;
  placeImages: string[];
  provinceDisplayName: string;
  coordinates: string;
  categoryConfig: CategoryConfigMap;
  likeState?: {
    liked: boolean;
    likeCount: number;
    loading?: boolean;
  };
  onPlaceLike?: (place: CulturalPlace) => void;
  onClose: () => void;
};

const SHARE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';

function getCleanText(value?: string | null) {
  return cleanCulturalText(value);
}

function getPrefixedText(prefix: string, value?: string | null) {
  const text = getCleanText(value);

  return text ? `${prefix}${text}` : '';
}

function getAddressText(place: CulturalPlace) {
  const details = place.details;
  const addressParts = [
    details?.address,
    getPrefixedText('ซ.', details?.addressAlley),
    getPrefixedText('ถ.', details?.addressRoad),
    getPrefixedText('ต.', details?.subdistrictNameTh),
    getPrefixedText('อ.', details?.districtNameTh),
    getPrefixedText('จ.', details?.provinceNameTh),
    details?.postcode,
  ]
    .map(getCleanText)
    .filter(Boolean);

  return addressParts.join(' ');
}

function getDetailItems(place: CulturalPlace) {
  const details = place.details;

  if (!details) {
    return [];
  }

  return [
    { label: 'ประเภท', value: details.typeLabel || details.categoryLabel },
    { label: 'ที่อยู่', value: getAddressText(place) },
    { label: 'เวลาเปิด', value: details.openingHours },
    { label: 'โทร', value: details.tel },
    { label: 'อีเมล', value: details.email },
    { label: 'ค่าเข้าชม', value: details.feeTh || details.feeEn },
    { label: 'ช่วงเวลาที่เหมาะสม', value: details.suitableDuration },
    { label: 'กิจกรรม', value: details.activity },
    { label: 'รางวัล', value: details.reward },
    { label: 'กฎ/มาตรการ', value: details.rule },
    { label: 'สิ่งอำนวยความสะดวก', value: details.facilitiesContact },
    { label: 'การเตรียมตัว', value: details.travelerPreparation },
    { label: 'ข้อจำกัด', value: details.marketLimitation },
    { label: 'โอกาสทางการตลาด', value: details.marketChance },
    { label: 'หมายเหตุ', value: details.remark },
  ]
    .map((item) => ({ ...item, value: getCleanText(item.value) }))
    .filter((item) => item.value);
}

function getSharePageUrl(place: CulturalPlace) {
  return `${SHARE_SITE_URL}/culture-place/${encodeURIComponent(place.id)}`;
}

function getSocialLinks(place: CulturalPlace) {
  const details = place.details;

  if (!details) {
    return [];
  }

  return [
    { label: 'Website', url: details.website },
    { label: 'Facebook', url: details.facebook },
    { label: 'Instagram', url: details.instagram },
    { label: 'TikTok', url: details.tiktok },
    { label: 'YouTube', url: details.youtube },
  ].reduce<Array<{ label: string; url: string }>>((links, item) => {
    const url = cleanCulturalUrl(item.url);

    return url ? [...links, { label: item.label, url }] : links;
  }, []);
}

export function ProvincePlaceDialog({
  place,
  placeIndex,
  placeImages,
  provinceDisplayName,
  coordinates,
  categoryConfig,
  likeState,
  onPlaceLike,
  onClose,
}: ProvincePlaceDialogProps) {
  const theme = useTheme();
  const { user, loading: authLoading } = useAuthContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCreator = isCreatorUser(user);
  const categoryColor = place ? getCategoryColor(categoryConfig, place.category) : '#608D8C';
  const cleanHighlight = cleanCulturalText(place?.highlight);
  const displayHighlight = cleanHighlight ? getCategoryLabel(categoryConfig, cleanHighlight) : '';
  const detailItems = place ? getDetailItems(place) : [];
  const socialLinks = place ? getSocialLinks(place) : [];
  const descriptionText = cleanCulturalText(place?.description);
  const districtText = cleanCulturalText(place?.district) || provinceDisplayName;
  const mapUrl = cleanCulturalUrl(place?.mapUrl);
  const sourceUrl = cleanCulturalUrl(place?.sourceUrl);
  const correctionRequestHref = place ? getCorrectionRequestEntryHref(place, isCreator) : '#';
  const liked = likeState?.liked ?? false;
  const likeCount = likeState?.likeCount ?? 0;
  const shareUrl = place ? getSharePageUrl(place) : SHARE_SITE_URL;

  return (
    <Dialog
      fullWidth
      fullScreen={isMobile}
      maxWidth="lg"
      open={Boolean(place)}
      onClose={onClose}
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: { xs: 0, sm: 2 },
          bgcolor: '#ffffff',
          border: `1px solid ${alpha(categoryColor, 0.16)}`,
          boxShadow: `0 28px 72px ${alpha(theme.palette.grey[900], 0.22)}`,
          backgroundImage: `linear-gradient(135deg, ${alpha(
            categoryColor,
            0.1
          )} 0%, rgba(255,255,255,0) 34%)`,
        },
      }}
    >
      {place && (
        <>
          <DialogTitle
            sx={{
              px: { xs: 2, sm: 3 },
              pt: { xs: 2, sm: 2.5 },
              pb: { xs: 1.5, sm: 2 },
              pr: { xs: 7, sm: 8 },
              color: theme.palette.grey[900],
            }}
          >
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.8 }}>
              <Chip
                size="small"
                label={getCategoryLabel(categoryConfig, place.category)}
                sx={{
                  color: categoryColor,
                  fontWeight: 900,
                  bgcolor: alpha(categoryColor, 0.12),
                  boxShadow: `inset 0 0 0 1px ${alpha(categoryColor, 0.16)}`,
                }}
              />
              {!!displayHighlight && (
                <Chip
                  size="small"
                  label={displayHighlight}
                  sx={{
                    color: theme.palette.grey[800],
                    fontWeight: 900,
                    bgcolor: alpha(theme.palette.grey[500], 0.1),
                    boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.grey[500], 0.14)}`,
                  }}
                />
              )}
            </Stack>

            <Box
              component="span"
              sx={{
                display: 'block',
                fontWeight: 900,
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
                fontSize: { xs: 20, sm: 24, md: 28 },
              }}
            >
              {place.name}
            </Box>

            <IconButton
              onClick={onClose}
              sx={{
                top: { xs: 14, sm: 18 },
                right: { xs: 14, sm: 18 },
                color: theme.palette.grey[800],
                position: 'absolute',
                bgcolor: alpha(theme.palette.common.white, 0.94),
                boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.12)}`,
                '&:hover': { bgcolor: theme.palette.common.white },
              }}
            >
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </DialogTitle>

          <DialogContent
            sx={{
              px: { xs: 2, sm: 3 },
              pt: 0,
              pb: { xs: 2.5, sm: 3 },
              overflowX: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2.2, md: 3 },
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.02fr) minmax(360px, 0.98fr)' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 230, sm: 330, md: 420 },
                    aspectRatio: { xs: '16 / 11', sm: '16 / 10', md: '4 / 5' },
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: placeImages?.[0]
                      ? alpha(categoryColor, 0.16)
                      : theme.palette.grey[300],
                    backgroundImage: placeImages?.[0]
                      ? `linear-gradient(180deg, ${alpha(
                          theme.palette.common.black,
                          0
                        )} 45%, ${alpha(theme.palette.common.black, 0.42)} 100%), url(${
                          placeImages[0]
                        })`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: `1px solid ${alpha(categoryColor, 0.14)}`,
                    boxShadow: `0 18px 42px ${alpha(theme.palette.grey[900], 0.14)}`,
                  }}
                >
                  {!placeImages?.[0] && (
                    <Box
                      component="img"
                      alt="Thailand Cultural Hub"
                      src="/assets/th-hub/logo-th-hub.png"
                      sx={{
                        width: 110,
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
                      py: 0.75,
                      color: categoryColor,
                      fontSize: 12,
                      fontWeight: 900,
                      maxWidth: 'calc(100% - 104px)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      borderRadius: '0 0 10px 10px',
                      position: 'absolute',
                      textOverflow: 'ellipsis',
                      transform: 'translateX(-50%)',
                      bgcolor: alpha(theme.palette.common.white, 0.96),
                      boxShadow: `0 8px 18px ${alpha(theme.palette.grey[900], 0.12)}`,
                    }}
                  >
                    {getCategoryLabel(categoryConfig, place.category)}
                  </Box>

                  {!!onPlaceLike && (
                    <Button
                      size="small"
                      disabled={likeState?.loading}
                      onClick={() => onPlaceLike(place)}
                      startIcon={
                        <Iconify icon={liked ? 'solar:heart-bold' : 'solar:heart-outline'} />
                      }
                      sx={{
                        top: 12,
                        right: 12,
                        m: 0,
                        px: 1.2,
                        py: 0.75,
                        border: 0,
                        minWidth: 0,
                        color: liked ? '#ffffff' : categoryColor,
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
                          color: liked ? '#ffffff' : categoryColor,
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
                  )}

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      left: 14,
                      right: 14,
                      bottom: 14,
                      position: 'absolute',
                      flexWrap: 'wrap',
                      rowGap: 1,
                    }}
                  >
                    <Chip
                      size="small"
                      icon={<Iconify icon="custom:location-fill" />}
                      label={districtText}
                      sx={{
                        color: 'white',
                        fontWeight: 900,
                        maxWidth: '100%',
                        bgcolor: alpha(theme.palette.grey[900], 0.72),
                        '& .MuiChip-icon': { color: 'white' },
                      }}
                    />
                    {!!coordinates && (
                      <Chip
                        size="small"
                        label={coordinates}
                        sx={{
                          color: 'white',
                          fontWeight: 900,
                          maxWidth: '100%',
                          bgcolor: alpha(theme.palette.grey[900], 0.72),
                        }}
                      />
                    )}
                  </Stack>
                </Box>

                {placeImages.length > 1 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt: 1.2,
                      mx: { xs: -2, sm: 0 },
                      px: { xs: 2, sm: 0 },
                      overflowX: 'auto',
                      pb: 0.5,
                      scrollbarWidth: 'thin',
                    }}
                  >
                    {placeImages.slice(0, 6).map((imageUrl, imageIndex) => (
                      <Box
                        key={`${imageUrl}-${imageIndex}`}
                        sx={{
                          width: { xs: 86, sm: 104 },
                          height: { xs: 64, sm: 76 },
                          flex: '0 0 auto',
                          borderRadius: 1.2,
                          bgcolor: 'grey.200',
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          boxShadow: `inset 0 0 0 1px ${alpha(
                            theme.palette.common.white,
                            0.56
                          )}, 0 8px 16px ${alpha(theme.palette.grey[900], 0.08)}`,
                        }}
                      />
                    ))}
                  </Stack>
                )}

                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: {
                      xs: 'auto auto auto',
                      sm: mapUrl ? 'minmax(0, 1fr) minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto',
                    },
                    alignItems: 'stretch',
                  }}
                >
                  {!!mapUrl && (
                    <Button
                      fullWidth
                      component="a"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      startIcon={<Iconify icon="custom:location-fill" />}
                      sx={{
                        px: 1.8,
                        py: 1,
                        color: 'white',
                        fontWeight: 900,
                        borderRadius: 1.2,
                        bgcolor: categoryColor,
                        whiteSpace: 'nowrap',
                        boxShadow: `0 12px 24px ${alpha(categoryColor, 0.24)}`,
                        '&:hover': { bgcolor: categoryColor },
                      }}
                    >
                      เปิดแผนที่
                    </Button>
                  )}

                  <Button
                    fullWidth
                    component={RouterLink}
                    href={correctionRequestHref}
                    disabled={authLoading}
                    variant="outlined"
                    startIcon={<Iconify icon="solar:pen-bold" />}
                    sx={{
                      px: 1.8,
                      py: 1,
                      fontWeight: 900,
                      borderRadius: 1.2,
                      color: categoryColor,
                      borderColor: alpha(categoryColor, 0.42),
                      bgcolor: alpha(theme.palette.common.white, 0.5),
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        borderColor: categoryColor,
                        bgcolor: alpha(categoryColor, 0.08),
                      },
                      '&.Mui-disabled': {
                        color: alpha(categoryColor, 0.52),
                        borderColor: alpha(categoryColor, 0.18),
                        bgcolor: alpha(categoryColor, 0.06),
                      },
                    }}
                  >
                    ขอเพิ่มเติมข้อมูล
                  </Button>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: { xs: 'center', sm: 'flex-end' },
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
                      url={shareUrl}
                      hashtag="#ThailandCulturalHub"
                      aria-label={`แชร์ ${place.name} บน Facebook`}
                    >
                      <FacebookIcon size={38} round color={categoryColor} />
                    </FacebookShareButton>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                {!!descriptionText && (
                  <Box
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 1.5,
                      bgcolor: alpha(categoryColor, 0.06),
                      border: `1px solid ${alpha(categoryColor, 0.12)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        mb: 1,
                        color: categoryColor,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      รายละเอียด
                    </Typography>
                    <Markdown
                      children={descriptionText}
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.85,
                        fontSize: { xs: 14, sm: 15 },
                        '& p': { m: 0, lineHeight: 1.85 },
                        '& p + p': { mt: 1.2 },
                      }}
                    />
                  </Box>
                )}

                {!!socialLinks.length && (
                  <Box
                    sx={{
                      mt: 2,
                      p: { xs: 1.25, sm: 1.5 },
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.grey[500], 0.06),
                      border: `1px solid ${alpha(categoryColor, 0.14)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        mb: 1,
                        color: 'text.secondary',
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      ช่องทางออนไลน์
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                      {socialLinks.map((link) => (
                        <Button
                          key={link.url}
                          component="a"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                          endIcon={<Iconify icon="eva:external-link-fill" />}
                          sx={{
                            px: 1.4,
                            py: 0.8,
                            color: categoryColor,
                            fontWeight: 900,
                            borderRadius: 1,
                            textDecoration: 'none',
                            bgcolor: alpha(categoryColor, 0.1),
                            '&:hover': { bgcolor: alpha(categoryColor, 0.16) },
                          }}
                        >
                          {link.label}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                )}

                {!!detailItems.length && (
                  <Box
                    sx={{
                      mt: 2,
                      p: { xs: 1.25, sm: 1.5 },
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.common.white, 0.82),
                      border: `1px solid ${alpha(categoryColor, 0.14)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        color: categoryColor,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      ข้อมูลสถานที่
                    </Typography>
                    <Divider sx={{ mt: 1, mb: 0.3, borderColor: alpha(categoryColor, 0.16) }} />
                    <Box
                      sx={{
                        display: 'grid',
                        columnGap: { xs: 0, sm: 2 },
                        alignItems: 'start',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      }}
                    >
                      {detailItems.map((item) => {
                        const isWideItem = item.label === 'ที่อยู่' || item.value.length > 96;

                        return (
                          <Box
                            key={item.label}
                            sx={{
                              py: { xs: 1.05, sm: 1.15 },
                              minWidth: 0,
                              gridColumn: {
                                xs: 'auto',
                                sm: isWideItem ? '1 / -1' : 'auto',
                              },
                            }}
                          >
                            <Stack
                              direction={{ xs: 'column', sm: isWideItem ? 'row' : 'column' }}
                              spacing={{ xs: 0.25, sm: isWideItem ? 2 : 0.35 }}
                              sx={{ minWidth: 0 }}
                            >
                              <Typography
                                sx={{
                                  flexShrink: 0,
                                  color: alpha(categoryColor, 0.86),
                                  fontSize: 12,
                                  fontWeight: 900,
                                  lineHeight: 1.45,
                                }}
                              >
                                {item.label}
                              </Typography>
                              <Typography
                                sx={{
                                  minWidth: 0,
                                  color: theme.palette.grey[700],
                                  lineHeight: 1.7,
                                  fontSize: { xs: 14, sm: 14.5 },
                                  fontWeight: 500,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {item.value}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* {!!sourceUrl && (
                  <Button
                    component="a"
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    endIcon={<Iconify icon="eva:external-link-fill" />}
                    sx={{
                      mt: 2,
                      px: 0,
                      color: categoryColor,
                      fontWeight: 900,
                      textDecoration: 'none',
                      '&:hover': {
                        bgcolor: 'transparent',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    ดูแหล่งข้อมูล
                  </Button>
                )} */}
              </Box>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}

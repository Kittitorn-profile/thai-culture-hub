'use client';

import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

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
import DialogContent from '@mui/material/DialogContent';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';

import { cleanCulturalText, cleanCulturalUrl } from './province-detail-utils';
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

function getCorrectionRequestHref(place: CulturalPlace) {
  const params = new URLSearchParams({ placeId: place.id });
  const provinceCode =
    place.details?.provinceCode ?? (place as CulturalPlace & { provinceCode?: string }).provinceCode ?? '';

  if (provinceCode) {
    params.set('provinceCode', provinceCode);
  }

  return `/creator/place-corrections/new?${params.toString()}`;
}

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
  const cleanHighlight = cleanCulturalText(place?.highlight);
  const displayHighlight = cleanHighlight ? getCategoryLabel(categoryConfig, cleanHighlight) : '';
  const detailItems = place ? getDetailItems(place) : [];
  const socialLinks = place ? getSocialLinks(place) : [];
  const descriptionText = cleanCulturalText(place?.description);
  const districtText = cleanCulturalText(place?.district) || provinceDisplayName;
  const mapUrl = cleanCulturalUrl(place?.mapUrl);
  const sourceUrl = cleanCulturalUrl(place?.sourceUrl);

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
            {place.name}
            <IconButton onClick={onClose} sx={{ top: 12, right: 12, position: 'absolute' }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 0, pb: 3 }}>
            {placeImages?.[0] ? (
              <Box
                sx={{
                  height: { xs: 260, sm: 360 },
                  overflow: 'hidden',
                  borderRadius: 1.5,
                  bgcolor: alpha(categoryColor, 0.16),
                  backgroundImage: `url(${placeImages?.[0]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  alignItems: 'center',
                }}
              />
            ) : (
              <Box>
                <Box
                  sx={{
                    minHeight: 200,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: theme.palette.grey[300],
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
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
                </Box>
              </Box>
            )}

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
                label={districtText}
                sx={{ fontWeight: 800 }}
              />
              <Chip label={coordinates} sx={{ fontWeight: 800 }} />
            </Stack>

            {!!displayHighlight && (
              <Typography sx={{ mt: 2, color: 'text.primary', fontWeight: 900 }}>
                {displayHighlight}
              </Typography>
            )}

            {!!descriptionText && (
              <Markdown
                children={descriptionText}
                sx={{
                  mt: 1,
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  '& p': { lineHeight: 1.8 },
                }}
              />
            )}

            {!!detailItems.length && (
              <Box sx={{ mt: 2.5 }}>
                <Divider sx={{ mb: 2, borderColor: alpha(categoryColor, 0.2) }} />
                <Stack spacing={1.2}>
                  {detailItems.map((item) => (
                    <Stack
                      key={item.label}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 0.2, sm: 1.5 }}
                    >
                      <Typography
                        sx={{
                          width: { sm: 150 },
                          flexShrink: 0,
                          color: categoryColor,
                          fontWeight: 900,
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {item.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.4 }}>
              {!!socialLinks.length && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                  {socialLinks.map((link) => (
                    <Button
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
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
                      {link.label}
                    </Button>
                  ))}
                </Stack>
              )}

              {!!mapUrl && (
                <Button
                  component="a"
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
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
                </Button>
              )}

              <Button
                component={RouterLink}
                href={getCorrectionRequestHref(place)}
                size="small"
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  fontWeight: 900,
                  borderRadius: 1,
                  color: categoryColor,
                  borderColor: alpha(categoryColor, 0.42),
                }}
              >
                ขอปรับแก้ข้อมูล
              </Button>

              {!!sourceUrl && (
                <Box
                  component="a"
                  href={sourceUrl}
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

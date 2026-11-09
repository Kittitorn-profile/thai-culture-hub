'use client';

import type { CulturalPlace } from '../province-data';

import { useState } from 'react';
import {
  RiEditLine,
  RiShareLine,
  RiMapPin2Line,
  RiArrowLeftSLine,
  RiArrowRightUpLine,
} from '@remixicon/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { isValidCoordinatePair } from 'src/utils/coordinates';

import { PublicDatasetGate } from 'src/lib/use-dataset-visibility';

import { Logo } from 'src/components/logo';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { getCategoryLabel, useCategoryConfig } from '../category-config';
import {
  getSourceLabel,
  cleanCulturalUrl,
  cleanCulturalText,
  getCorrectionRequestEntryHref,
} from './province-detail-utils';

type Place = CulturalPlace & { provinceCode: string; provinceName: string };
function externalUrl(value?: string | null) {
  const url = cleanCulturalUrl(value);
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

export function CulturePlaceDetailView({ place }: { place: Place }) {
  const config = useCategoryConfig();
  const { user } = useAuthContext();
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [shareStatus, setShareStatus] = useState('');
  const images = [
    ...new Set(
      (place.imageUrls ?? []).map(externalUrl).filter((url): url is string => Boolean(url))
    ),
  ].filter((url) => !failedImages[url]);
  const selectedImage = images[imageIndex] ?? images[0];
  const details = place.details;
  const provinceUrl = `/province/${encodeURIComponent(place.provinceCode)}/?${new URLSearchParams({ name: place.provinceName }).toString()}`;
  const listUrl = `/province/${encodeURIComponent(place.provinceCode)}/places/?${new URLSearchParams({ name: place.provinceName, ...(place.district ? { district: place.district } : {}) }).toString()}`;
  const hasCoordinates = isValidCoordinatePair(place.lat, place.lng);
  const mapUrl =
    externalUrl(place.mapUrl) ||
    (hasCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : undefined);
  const address = [
    details?.address,
    details?.addressRoad,
    details?.subdistrictNameTh,
    place.district,
    place.provinceName,
    details?.postcode,
  ]
    .map(cleanCulturalText)
    .filter(Boolean)
    .join(' ');
  const facts = [
    { label: 'เวลาเปิด–ปิด', value: details?.openingHours },
    { label: 'ค่าเข้าชม', value: details?.feeTh },
    { label: 'โทรศัพท์', value: details?.tel },
    { label: 'อีเมล', value: details?.email },
  ].filter((item) => cleanCulturalText(item.value));
  const sourceUrl = externalUrl(place.sourceUrl);
  const website = externalUrl(details?.website);
  const facebook = externalUrl(details?.facebook);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('คัดลอกลิงก์แล้ว');
    } catch {
      setShareStatus('ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกจากแถบที่อยู่');
    }
  };

  return (
    <PublicDatasetGate dataset="places">
      <Box
        sx={{
          maxWidth: 1408,
          mx: 'auto',
          px: HOME_SECTION_PX,
          pt: { xs: 3, md: 5 },
          pb: { xs: 6, md: 9 },
          width: 1,
        }}
      >
        <Button
          component={RouterLink}
          href={listUrl}
          color="inherit"
          startIcon={<RiArrowLeftSLine size={18} />}
          sx={{ mb: 3 }}
        >
          กลับสถานที่ใน{place.district || place.provinceName}
        </Button>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: '#eeeae0',
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              bgcolor: '#e6eae3',
              position: 'relative',
              minHeight: { xs: 240, md: 400 },
            }}
          >
            {selectedImage ? (
              <Box
                component="img"
                src={selectedImage}
                alt={place.name}
                fetchPriority="high"
                onError={() =>
                  setFailedImages((current) => ({ ...current, [selectedImage]: true }))
                }
                sx={{
                  display: 'block',
                  width: 1,
                  height: 1,
                  minHeight: { xs: 240, md: 400 },
                  maxHeight: 520,
                  objectFit: 'cover',
                  aspectRatio: '4 / 3',
                }}
              />
            ) : (
              <Box sx={{ height: 1, minHeight: 280, display: 'grid', placeItems: 'center', p: 6 }}>
                <Logo disabled sx={{ width: 180, opacity: 0.65 }} />
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <Typography sx={{ color: '#8b6b35', fontSize: 12, fontWeight: 600, mb: 1.5 }}>
              {getCategoryLabel(config, place.category)} · {place.provinceName}
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 28, md: 36 },
                fontWeight: 700,
                lineHeight: 1.4,
                color: '#26372f',
                overflowWrap: 'anywhere',
              }}
            >
              {place.name}
            </Typography>
            {place.highlight && place.highlight !== place.category && (
              <Typography
                sx={{
                  mt: 1.5,
                  color: 'text.secondary',
                  fontSize: 14,
                  lineHeight: 1.8,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {place.highlight}
              </Typography>
            )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mt: 2,
                color: '#5b685e',
                fontSize: 13,
              }}
            >
              <RiMapPin2Line size={18} style={{ flexShrink: 0 }} />
              <span>{[place.district, place.provinceName].filter(Boolean).join(' · ')}</span>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
              {mapUrl && (
                <Button
                  variant="contained"
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<RiMapPin2Line size={18} />}
                  sx={{ bgcolor: '#293c34', '&:hover': { bgcolor: '#3b5446' } }}
                >
                  นำทางไปสถานที่
                </Button>
              )}
              <Button
                variant="outlined"
                color="inherit"
                onClick={copyLink}
                startIcon={<RiShareLine size={17} />}
              >
                แชร์สถานที่
              </Button>
            </Stack>
            {shareStatus && (
              <Typography role="status" sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
                {shareStatus}
              </Typography>
            )}
          </Box>
        </Box>
        {images.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 1 }}>
            {images.map((url, index) => (
              <Box
                key={url}
                component="button"
                aria-label={`ดูภาพที่ ${index + 1}`}
                aria-pressed={url === selectedImage}
                onClick={() => setImageIndex(index)}
                sx={{
                  border: '2px solid',
                  borderColor: url === selectedImage ? '#526c56' : 'transparent',
                  borderRadius: 1.5,
                  p: 0.25,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={`${place.name} ภาพที่ ${index + 1}`}
                  loading="lazy"
                  sx={{
                    display: 'block',
                    width: 80,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 1,
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
        <Box
          sx={{
            mt: { xs: 4, md: 5 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
            gap: { xs: 4, md: 5 },
            alignItems: 'start',
          }}
        >
          <Box component="section" aria-labelledby="place-story-heading">
            <Typography
              id="place-story-heading"
              component="h2"
              sx={{ fontSize: 22, fontWeight: 700, mb: 2 }}
            >
              รู้จัก{place.name}
            </Typography>
            <Typography
              sx={{
                fontSize: 15,
                color: '#56605b',
                lineHeight: 2,
                whiteSpace: 'pre-line',
                overflowWrap: 'anywhere',
              }}
            >
              {place.description || 'ยังไม่มีรายละเอียดเพิ่มเติมสำหรับสถานที่นี้'}
            </Typography>
            <Button
              component={RouterLink}
              href={getCorrectionRequestEntryHref(place, isCreatorUser(user))}
              color="inherit"
              startIcon={<RiEditLine size={17} />}
              sx={{ mt: 3, color: '#826a40' }}
            >
              เสนอข้อมูลเพิ่มเติมหรือแจ้งแก้ไข
            </Button>
          </Box>
          <Box
            component="aside"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              p: 2.5,
            }}
          >
            <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700, mb: 2 }}>
              ข้อมูลสำหรับการเดินทาง
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>ที่ตั้ง</Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.8 }}>{address}</Typography>
            {facts.map((fact) => (
              <Box key={fact.label} sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  {fact.label}
                </Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                  {fact.value}
                </Typography>
              </Box>
            ))}
            {hasCoordinates && (
              <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 11 }}>
                พิกัด {Number(place.lat).toFixed(6)}, {Number(place.lng).toFixed(6)}
              </Typography>
            )}
            {(website || facebook) && (
              <Stack gap={1} sx={{ mt: 2 }}>
                {website && (
                  <Button
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    endIcon={<RiArrowRightUpLine size={16} />}
                  >
                    เว็บไซต์สถานที่
                  </Button>
                )}
                {facebook && (
                  <Button
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    endIcon={<RiArrowRightUpLine size={16} />}
                  >
                    Facebook
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mt: 5,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>แหล่งข้อมูล</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13 }}>{getSourceLabel(place.source)}</Typography>
            {sourceUrl && (
              <Button
                size="small"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<RiArrowRightUpLine size={14} />}
              >
                ดูข้อมูลต้นทาง
              </Button>
            )}
          </Box>
          <Button
            component={RouterLink}
            href={provinceUrl}
            color="inherit"
            endIcon={<RiArrowRightUpLine size={17} />}
          >
            สำรวจ{place.provinceName}ต่อ
          </Button>
        </Box>
      </Box>
    </PublicDatasetGate>
  );
}

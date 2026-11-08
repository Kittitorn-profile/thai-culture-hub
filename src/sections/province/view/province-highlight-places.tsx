'use client';

import type { CulturalPlace } from '../province-data';

import { RiImageLine, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { PROVINCE_HIGHLIGHTS, getProvinceHighlights } from '../province-highlights';

export function ProvinceHighlightPlaces({
  provinceCode,
  provinceName,
  places,
  loading,
}: {
  provinceCode: string;
  provinceName: string;
  places: CulturalPlace[];
  loading: boolean;
}) {
  if (!PROVINCE_HIGHLIGHTS[provinceCode]) return null;
  const highlights = getProvinceHighlights(provinceCode, places);
  if (!loading && !highlights.length) return null;
  return (
    <Box
      component="section"
      id="province-highlights"
      sx={{ mb: { xs: 4, md: 5 }, scrollMarginTop: 100 }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 12, color: '#608d8c', fontWeight: 600, mb: 0.75 }}>
            เริ่มต้นสำรวจจังหวัด
          </Typography>
          <Typography component="h2" sx={{ fontSize: { xs: 23, md: 28 }, fontWeight: 700 }}>
            จุดหมายเด่นของ{provinceName}
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
            คัดจุดหมายจากข้อมูล ททท. และหน่วยงานจังหวัด พร้อมแหล่งอ้างอิงและรายละเอียด
          </Typography>
        </Box>
        <Button
          component="a"
          href="#province-all-places"
          size="small"
          endIcon={<RiArrowRightUpLine size={16} />}
          sx={{ flexShrink: 0 }}
        >
          ดูสถานที่ทั้งหมด
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: `repeat(${loading ? 4 : Math.min(highlights.length, 4)}, 1fr)`,
          },
          gap: 2,
        }}
      >
        {loading
          ? Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={280} sx={{ borderRadius: 2.5 }} />
            ))
          : highlights.map(({ place, title, theme, summary, sourceUrl }) => (
              <Box
                key={title}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid #e1e5dc',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  component={RouterLink}
                  href={`/culture-place/${encodeURIComponent(place.id)}/`}
                  sx={{
                    display: 'block',
                    flex: 1,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover img': { transform: 'scale(1.035)' },
                    '&:focus-visible': { outline: '2px solid #608d8c', outlineOffset: -3 },
                  }}
                >
                  <Box
                    sx={{
                      aspectRatio: '4 / 3',
                      maxHeight: 220,
                      bgcolor: '#eaf0e6',
                      overflow: 'hidden',
                    }}
                  >
                    {place.imageUrls?.some(Boolean) ? (
                      <Box
                        component="img"
                        src={place.imageUrls.find(Boolean)}
                        alt={title}
                        loading="lazy"
                        sx={{
                          width: 1,
                          height: 1,
                          objectFit: 'cover',
                          transition: 'transform 180ms ease',
                          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          height: 1,
                          color: '#758777',
                          fontSize: 12,
                        }}
                      >
                        <RiImageLine size={20} />
                        ยังไม่มีภาพสถานที่
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ p: 2, pb: 1 }}>
                    <Typography sx={{ fontSize: 11, color: '#608d8c', mb: 0.75 }}>
                      {theme}
                    </Typography>
                    <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700 }}>
                      {title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                      {place.district
                        ? `${/^(อำเภอ|เขต)/.test(place.district) ? '' : provinceCode === 'TH-10' ? 'เขต' : 'อำเภอ'}${place.district}`
                        : provinceName}
                    </Typography>
                    {summary && (
                      <Typography
                        sx={{ mt: 1, fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}
                      >
                        {summary}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    pb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Button
                    component={RouterLink}
                    href={`/culture-place/${encodeURIComponent(place.id)}/`}
                    size="small"
                    endIcon={<RiArrowRightUpLine size={14} />}
                  >
                    สำรวจสถานที่
                  </Button>
                  <Button
                    component="a"
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ fontSize: 11, color: 'text.secondary' }}
                  >
                    อ้างอิง
                  </Button>
                </Box>
              </Box>
            ))}
      </Box>
    </Box>
  );
}

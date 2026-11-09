'use client';

import type { HomeHeroImage } from 'src/lib/home-hero';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { useDatasetVisibility } from 'src/lib/use-dataset-visibility';

import { HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

export function HomeHeroSection({ images = [] }: { images?: HomeHeroImage[] }) {
  const { isVisible } = useDatasetVisibility();
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleImages = images.filter((image) => image.isActive);
  const index = Math.min(activeIndex, Math.max(0, visibleImages.length - 1));
  const image = visibleImages[index];
  return (
    <Box
      component="section"
      aria-labelledby="home-heading"
      sx={{
        px: { ...HOME_SECTION_PX, xs: 2 },
        pt: { xs: 2, md: 3 },
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: HOME_SECTION_MAX_WIDTH,
          mx: 'auto',
          minHeight: { xs: 420, sm: 500, md: 560 },
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 2.5, md: 4 },
          bgcolor: '#50575a',
          display: 'flex',
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        {image && (
          <Box
            key={image.id}
            component="img"
            src={image.imageUrl}
            alt={image.alt}
            fetchPriority="high"
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
              objectPosition: { xs: '60% center', md: 'center' },
              filter: 'saturate(0.55)',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: {
              xs: 'linear-gradient(180deg, rgba(16,22,24,.08) 0%, rgba(16,22,24,.6) 35%, rgba(16,22,24,.92) 100%)',
              md: 'linear-gradient(90deg, rgba(16,22,24,.88), rgba(16,22,24,.45) 55%, rgba(16,22,24,.08))',
            },
          }}
        />
        <Box
          sx={{
            position: 'relative',
            p: { xs: 2.5, sm: 5, md: 7 },
            pb: visibleImages.length > 1 ? { xs: 10, sm: 10, md: 10 } : undefined,
            maxWidth: 740,
            color: '#fff',
            width: 1,
          }}
        >
          <Typography
            sx={{
              mb: { xs: 1.5, md: 2.5 },
              fontSize: { xs: 10, sm: 11 },
              fontWeight: 500,
              letterSpacing: 1.8,
              color: '#ffffffba',
            }}
          >
            THAILAND CULTURAL HUB
          </Typography>
          <Typography
            id="home-heading"
            component="h1"
            sx={{
              fontSize: { xs: 28, sm: 52, md: 64 },
              lineHeight: { xs: 1.4, sm: 1.25 },
              letterSpacing: '-0.035em',
              fontWeight: 600,
            }}
          >
            ค้นพบวัฒนธรรมไทย
            <br />
            ผ่านผู้คนและท้องถิ่น
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1.5, md: 2.5 },
              maxWidth: 450,
              fontSize: { xs: 13, sm: 16, md: 18 },
              lineHeight: 1.7,
              color: '#ffffffde',
            }}
          >
            ค้นหาสถานที่ ศิลปิน ชุมชน ผ้า และภูมิปัญญา
            <Box component="br" sx={{ display: { xs: 'none', sm: 'block' } }} />
            จากข้อมูลหลายแหล่ง พร้อมที่มาให้ศึกษาเพิ่มเติม
          </Typography>
          {isVisible('places') && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 1, sm: 2 },
                mt: { xs: 2.5, md: 3.5 },
                '& .MuiButton-root': { minHeight: 44, fontSize: { xs: 13, sm: 14 } },
              }}
            >
              <Button
                component="a"
                href="#explore-map"
                variant="contained"
                sx={{
                  px: 3,
                  py: 1.4,
                  borderRadius: 1.5,
                  bgcolor: '#fff',
                  color: '#202124',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#e9e9e7' },
                }}
              >
                สำรวจตามจังหวัด
              </Button>
              <Button
                component={RouterLink}
                href="/culture-category"
                sx={{
                  color: '#fff',
                  fontWeight: 500,
                  px: 1.5,
                  '&:hover': { bgcolor: '#ffffff14' },
                }}
              >
                ค้นหาสถานที่ตามหมวด{' '}
                <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>
                  →
                </Box>
              </Button>
            </Box>
          )}
        </Box>
        {visibleImages.length > 1 && (
          <Box
            role="group"
            aria-label="เลือกภาพแบนเนอร์"
            sx={{
              position: 'absolute',
              bottom: 20,
              right: { xs: 20, md: 32 },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.5,
              borderRadius: 99,
              bgcolor: 'rgba(16,22,24,.65)',
              color: '#fff',
            }}
          >
            <Button
              aria-label="ภาพก่อนหน้า"
              onClick={() =>
                setActiveIndex((index + visibleImages.length - 1) % visibleImages.length)
              }
              sx={{ minWidth: 44, minHeight: 44, color: 'inherit', borderRadius: 99 }}
            >
              ←
            </Button>
            <Typography
              role="status"
              aria-live="polite"
              sx={{
                fontSize: 13,
                minWidth: 44,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {index + 1} / {visibleImages.length}
            </Typography>
            <Button
              aria-label="ภาพถัดไป"
              onClick={() => setActiveIndex((index + 1) % visibleImages.length)}
              sx={{ minWidth: 44, minHeight: 44, color: 'inherit', borderRadius: 99 }}
            >
              →
            </Button>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          maxWidth: HOME_SECTION_MAX_WIDTH,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          gap: { xs: 3, md: 8 },
          pt: { xs: 3.5, md: 7 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontSize: { xs: 23, md: 36 }, fontWeight: 600, lineHeight: 1.3, mb: 2 }}
          >
            พื้นที่เรียนรู้วัฒนธรรมไทย
          </Typography>
          <Typography
            sx={{ maxWidth: 510, color: '#62666a', lineHeight: 1.85, fontSize: { xs: 13, sm: 15 } }}
          >
            Thailand Cultural Hub รวบรวมข้อมูลสถานที่ ศิลปิน มรดกภูมิปัญญา ชุมชนชาติพันธุ์
            ผลิตภัณฑ์วัฒนธรรม และผ้ากับงานช่าง ให้ค้นหาตามจังหวัดหรือประเภทข้อมูล
            พร้อมแหล่งอ้างอิงและเรื่องเล่าจากสมาชิก
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: { xs: 2, md: 4 },
            rowGap: 3,
            alignContent: 'center',
          }}
        >
          {[
            ['สถานที่และชุมชน', 'แหล่งวัฒนธรรมและผู้คนในแต่ละพื้นที่'],
            ['ศิลปินและภูมิปัญญา', 'ผู้สร้างสรรค์และความรู้ที่สืบทอดกันมา'],
            ['ผ้าและงานช่าง', 'ลวดลาย เทคนิค และทักษะท้องถิ่น'],
            ['ผลิตภัณฑ์และเรื่องเล่า', 'ผลงานชุมชนและบทความจากสมาชิก'],
          ].map(([title, detail]) => (
            <Box key={title} sx={{ borderTop: '1px solid #dfe3df', pt: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 16, md: 23 }, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography sx={{ color: '#74777a', fontSize: 13, lineHeight: 1.7 }}>
                {detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

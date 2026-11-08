import type { CultureCategoryCard, CultureCategoriesContent } from './home-types';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import {
  HOME_TEXT,
  HOME_SECTION_PX,
  HOME_SECTION_MAX_WIDTH,
  FEATURED_CULTURE_CATEGORY_LIMIT,
} from './home-constants';

type Props = {
  content: CultureCategoriesContent;
  cards: CultureCategoryCard[];
};

export function HomeCultureCategoriesSection({ content, cards }: Props) {
  if (cards.length === 0) return null;

  const featuredCards = cards.slice(0, FEATURED_CULTURE_CATEGORY_LIMIT);
  const remainingCount = Math.max(cards.length - featuredCards.length, 0);

  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 6, md: 9 },
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 96,
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: HOME_SECTION_MAX_WIDTH,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3.5, md: 4.5 } }}
        >
          <Box sx={{ maxWidth: 700 }}>
            <Typography
              sx={{
                px: 1.4,
                py: 0.6,
                width: 'fit-content',
                color: HOME_TEXT,
                borderRadius: 999,
                bgcolor: 'transparent',
                border: '1px solid rgba(32,33,36,0.28)',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              หมวดสถานที่และแหล่งวัฒนธรรม
            </Typography>
            <Typography
              variant="h3"
              sx={{
                mt: 2,
                color: HOME_TEXT,
                fontSize: { xs: 28, md: 44 },
                fontWeight: 600,
                lineHeight: 1.15,
              }}
            >
              {content.title}
            </Typography>
            <Typography sx={{ mt: 1.3, color: 'rgba(32,33,36,0.76)', lineHeight: 1.75 }}>
              {content.description}
            </Typography>
          </Box>

          <Button
            component={RouterLink}
            href="/culture-category"
            variant="outlined"
            sx={{
              flexShrink: 0,
              color: HOME_TEXT,
              borderColor: 'rgba(32,33,36,0.5)',
              '&:hover': {
                borderColor: HOME_TEXT,
                bgcolor: 'rgba(32,33,36,0.08)',
              },
            }}
          >
            ดูสถานที่ทุกหมวด
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1.5, md: 2 },
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {featuredCards.map((image, index) => (
            <Box
              key={`${image?.title}-${index}`}
              component={RouterLink}
              href={paths.cultureCategory.details(image.categoryKey)}
              aria-label={`ดูรายละเอียด ${image.title}`}
              sx={{
                minWidth: 0,
                width: 1,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                p: 2,
                overflow: 'hidden',
                textDecoration: 'none',
                color: HOME_TEXT,
                bgcolor: '#fff',
                border: '1px solid #e3e5e2',
                borderRadius: 1.5,
                transition: 'border-color 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                  borderColor: '#aab3b5',
                  boxShadow: '0 6px 20px rgba(25,35,40,0.05)',
                },
                '&:focus-visible': {
                  outline: '2px solid #505b63',
                  outlineOffset: 4,
                },
                '&:hover .culture-category-arrow': { transform: 'translateX(3px)' },
                '& .culture-category-arrow': { transition: 'transform 180ms ease' },
              }}
            >
              <Box
                component="img"
                src={image.src}
                alt=""
                loading="lazy"
                sx={{
                  width: { xs: 52, md: 60 },
                  height: { xs: 52, md: 60 },
                  flexShrink: 0,
                  borderRadius: 1,
                  opacity: 0.8,
                  filter: 'saturate(0.55)',
                  display: 'block',
                  objectFit: 'cover',
                }}
              />

              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  sx={{
                    color: 'inherit',
                    fontSize: { xs: 15, md: 16 },
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {image.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ pt: 0.5, color: '#7a8285' }}
                >
                  <Typography
                    className="culture-category-count"
                    sx={{ fontSize: 12, fontWeight: 400 }}
                  >
                    ดูสถานที่ในหมวดนี้
                  </Typography>
                  <Iconify
                    className="culture-category-arrow"
                    icon="eva:arrow-ios-forward-fill"
                    width={18}
                  />
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>

        {remainingCount > 0 && (
          <Typography sx={{ mt: 2.5, color: 'rgba(32,33,36,0.68)', fontSize: 13 }}>
            ยังมีอีก {remainingCount.toLocaleString('th-TH')} หมวดในหน้าข้อมูลทั้งหมด
          </Typography>
        )}
      </Box>
    </Box>
  );
}

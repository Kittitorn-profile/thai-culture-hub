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
                bgcolor: 'rgba(42,55,54,0.28)',
                border: '1px solid rgba(255,255,255,0.28)',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Culture categories
            </Typography>
            <Typography
              variant="h3"
              sx={{
                mt: 2,
                color: HOME_TEXT,
                fontSize: { xs: 28, md: 44 },
                fontWeight: 950,
                lineHeight: 1.15,
              }}
            >
              {content.title}
            </Typography>
            <Typography sx={{ mt: 1.3, color: 'rgba(248,246,238,0.76)', lineHeight: 1.75 }}>
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
              borderColor: 'rgba(248,246,238,0.5)',
              '&:hover': {
                borderColor: HOME_TEXT,
                bgcolor: 'rgba(248,246,238,0.08)',
              },
            }}
          >
            ดูข้อมูลทั้งหมด
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
                px: 2.2,
                py: 2.4,
                m: 0,
                width: 1,
                minHeight: { xs: 142, md: 168 },
                display: 'flex',
                textDecoration: 'none',
                cursor: 'pointer',
                overflow: 'hidden',
                textAlign: 'left',
                borderRadius: 1.5,
                color: HOME_TEXT,
                alignItems: 'flex-start',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: 'rgba(42,55,54,0.32)',
                position: 'relative',
                boxShadow: '0 18px 42px rgba(31,40,38,0.16)',
                border: '1px solid rgba(248,246,238,0.2)',
                backdropFilter: 'blur(7px)',
                transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                '&::after': {
                  content: '""',
                  left: 0,
                  top: 0,
                  width: 5,
                  height: 1,
                  position: 'absolute',
                  bgcolor: image.color,
                },
                '& .culture-category-count': {
                  color: image.color,
                },
                '& .culture-category-icon-wrap': {
                  color: image.color,
                  bgcolor: 'rgba(248,246,238,0.9)',
                },
                '& .culture-category-arrow': {
                  opacity: 0,
                  transform: 'translateX(-4px)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                },
                '&::before': {
                  content: '""',
                  right: -24,
                  top: -30,
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  position: 'absolute',
                  bgcolor: 'rgba(248,246,238,0.06)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${HOME_TEXT}`,
                  outlineOffset: 4,
                },
                '&:hover, &:focus-visible': {
                  transform: 'translateY(-3px)',
                  borderColor: 'rgba(248,246,238,0.36)',
                  boxShadow: '0 24px 54px rgba(31,40,38,0.22)',
                },
                '&:hover .culture-category-arrow, &:focus-visible .culture-category-arrow': {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              }}
            >
              <Box
                sx={{
                  zIndex: 1,
                  width: 46,
                  height: 46,
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                }}
                className="culture-category-icon-wrap"
              >
                <Iconify icon={image.icon} width={25} />
              </Box>

              <Box
                sx={{
                  zIndex: 1,
                  width: 1,
                }}
              >
                <Typography
                  sx={{
                    color: 'inherit',
                    fontSize: { xs: 18, md: 20 },
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  {image.title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.2 }}>
                  <Typography className="culture-category-count" sx={{ fontSize: 13, fontWeight: 900 }}>
                    ดูหมวดนี้
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
          <Typography sx={{ mt: 2.5, color: 'rgba(248,246,238,0.68)', fontSize: 13 }}>
            ยังมีอีก {remainingCount.toLocaleString('th-TH')} หมวดในหน้าข้อมูลทั้งหมด
          </Typography>
        )}
      </Box>
    </Box>
  );
}

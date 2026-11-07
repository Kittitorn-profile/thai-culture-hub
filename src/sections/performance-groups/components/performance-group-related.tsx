'use client';

import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

type Props = {
  category: string;
  relatedGroups: PerformanceGroupEntry[];
};

export function PerformanceGroupRelated({ category, relatedGroups }: Props) {
  if (relatedGroups.length === 0) return null;

  return (
    <Box
      component="section"
      id="group-related"
      aria-labelledby="related-performance-groups-title"
      sx={{
        scrollMarginTop: 112,
        mt: { xs: 4, md: 6 },
        color: '#202124',
      }}
    >
      <Typography
        id="related-performance-groups-title"
        component="h2"
        sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 600 }}
      >
        วงอื่น ๆ ในหมวดเดียวกัน
      </Typography>
      <Typography sx={{ mt: 0.75, color: 'rgba(32,33,36,0.7)' }}>
        แนะนำวงในหมวด {category} ที่คุณอาจสนใจ
      </Typography>

      <Box
        sx={{
          mt: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {relatedGroups.map((relatedGroup) => {
          const relatedGroupId = relatedGroup.id || relatedGroup.name;
          const performanceImage = relatedGroup.yearlyData.find(
            (record) => record.performanceImages?.length
          )?.performanceImages?.[0];
          const imageUrl = relatedGroup.coverImageUrl || performanceImage || relatedGroup.logoUrl;
          const usesLogo = !relatedGroup.coverImageUrl && !performanceImage;

          return (
            <Box
              key={relatedGroupId}
              component={RouterLink}
              href={paths.performanceGroup.details(relatedGroupId)}
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                borderRadius: 2.5,
                color: '#26312f',
                textDecoration: 'none',
                bgcolor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'none',
                transition: 'background-color 180ms ease',
                '&:hover, &:focus-visible': {
                  bgcolor: '#eef1ec',
                },
                '&:focus-visible': {
                  outline: '2px solid #40514c',
                  outlineOffset: 3,
                },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                {imageUrl ? (
                  <Box
                    component="img"
                    src={imageUrl}
                    loading="lazy"
                    alt={`ภาพ ${relatedGroup.name}`}
                    sx={{
                      width: 1,
                      display: 'block',
                      aspectRatio: '16 / 9',
                      objectFit: usesLogo ? 'contain' : 'cover',
                      height: '100%',
                      minHeight: 0,
                      p: usesLogo ? 4 : 0,
                      bgcolor: usesLogo ? 'rgba(99,126,105,0.12)' : 'transparent',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 1,
                      display: 'grid',
                      placeItems: 'center',
                      aspectRatio: '16 / 9',
                      color: 'rgba(32,33,36,0.82)',
                      bgcolor: relatedGroup.primaryColor || '#637e69',
                    }}
                  >
                    <Iconify icon="solar:video-frame-play-horizontal-bold" width={42} />
                  </Box>
                )}
              </Box>
              <Box sx={{ p: 2, flex: 1 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  {relatedGroup.logoUrl && !usesLogo && (
                    <Avatar
                      src={relatedGroup.logoUrl}
                      alt={`โลโก้ ${relatedGroup.name}`}
                      sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        bgcolor: '#fff',
                        '& img': { objectFit: 'contain' },
                      }}
                    />
                  )}
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        minWidth: 0,
                        fontSize: 17,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {relatedGroup.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {relatedGroup.description}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 1.5 }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ color: 'text.secondary', minWidth: 0 }}
                  >
                    <Iconify icon="mingcute:location-fill" width={15} />
                    <Typography variant="caption" noWrap>
                      {relatedGroup.provinceName || relatedGroup.category}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ color: '#26312f', flexShrink: 0 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      รู้จักวงนี้
                    </Typography>
                    <Iconify icon="eva:diagonal-arrow-right-up-fill" width={17} />
                  </Stack>
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

'use client';

import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
      aria-labelledby="related-performance-groups-title"
      sx={{
        mt: { xs: 3, md: 4 },
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 3,
        color: '#f8f6ee',
        bgcolor: 'rgba(42,55,54,0.48)',
        border: '1px solid rgba(248,246,238,0.2)',
        boxShadow: '0 22px 58px rgba(31,40,38,0.16)',
      }}
    >
      <Typography
        id="related-performance-groups-title"
        component="h2"
        sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950 }}
      >
        วงอื่น ๆ ในหมวดเดียวกัน
      </Typography>
      <Typography sx={{ mt: 0.75, color: 'rgba(248,246,238,0.7)' }}>
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
                bgcolor: '#f8f6ee',
                borderTop: `4px solid ${relatedGroup.primaryColor || '#637e69'}`,
                boxShadow: '0 14px 34px rgba(20,28,26,0.18)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                '&:hover, &:focus-visible': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 42px rgba(20,28,26,0.26)',
                },
                '&:focus-visible': {
                  outline: '3px solid rgba(234,215,161,0.95)',
                  outlineOffset: 3,
                },
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
                    p: usesLogo ? 3 : 0,
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
                    color: 'rgba(248,246,238,0.82)',
                    bgcolor: relatedGroup.primaryColor || '#637e69',
                  }}
                >
                  <Iconify icon="solar:video-frame-play-horizontal-bold" width={42} />
                </Box>
              )}
              <Box sx={{ p: 2.25 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  {relatedGroup.logoUrl && (
                    <Avatar
                      src={relatedGroup.logoUrl}
                      alt={`โลโก้ ${relatedGroup.name}`}
                      sx={{ width: 48, height: 48, flexShrink: 0 }}
                    />
                  )}
                  <Stack>
                    <Typography
                      sx={{
                        minWidth: 0,
                        fontSize: 18,
                        fontWeight: 950,
                        lineHeight: 1.3,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {relatedGroup.name}
                    </Typography>
                    <Typography variant="caption">{relatedGroup.description}</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                  <Chip label={relatedGroup.category} size="small" />
                  {relatedGroup.provinceName && (
                    <Chip
                      label={`จังหวัด${relatedGroup.provinceName}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="flex-end"
                  sx={{ mt: 2, color: '#40514c', fontWeight: 900 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 900 }}>
                    ดูรายละเอียด
                  </Typography>
                  <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

'use client';

import type { Developer } from 'src/lib/contact-developers';

import { useQuery } from '@tanstack/react-query';

import { Box, Link, Stack, Typography } from '@mui/material';

import { cultureUi } from 'src/theme/culture-ui';

export function ContactDevelopers() {
  const { data } = useQuery({
    queryKey: ['contact-developers'],
    queryFn: async ({ signal }): Promise<Developer[]> => {
      const response = await fetch('/api/contact/developers', { signal });
      if (!response.ok) throw new Error('โหลดข้อมูลนักพัฒนาไม่สำเร็จ');
      return (await response.json()).data;
    },
    staleTime: 60_000,
  });
  if (!data?.length) return null;
  return (
    <Box
      component="section"
      aria-labelledby="contact-developers-heading"
      sx={{ mt: { xs: 4, md: 6 }, pt: 3, borderTop: `1px solid ${cultureUi.border}` }}
    >
      <Typography
        component="h2"
        id="contact-developers-heading"
        sx={{ fontSize: 22, fontWeight: 600, mb: 2 }}
      >
        นักพัฒนา
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {data.map((developer) => (
          <Box key={developer.id} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography component="h3" sx={{ fontWeight: 600, fontSize: 16 }}>
              {developer.name}
            </Typography>
            {developer.role && (
              <Typography sx={{ fontSize: 13, color: cultureUi.muted, mt: 0.5 }}>
                {developer.role}
              </Typography>
            )}
            {developer.bio && (
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 14,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                  overflowWrap: 'anywhere',
                }}
              >
                {developer.bio}
              </Typography>
            )}
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} sx={{ mt: 1 }}>
              {developer.email && (
                <Link
                  href={`mailto:${developer.email}`}
                  sx={{ color: cultureUi.muted, fontSize: 13, overflowWrap: 'anywhere' }}
                >
                  {developer.email}
                </Link>
              )}
              {developer.website && (
                <Link
                  href={developer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: cultureUi.muted, fontSize: 13, overflowWrap: 'anywhere' }}
                >
                  เว็บไซต์
                </Link>
              )}
              {developer.github && (
                <Link
                  href={developer.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: cultureUi.muted, fontSize: 13, overflowWrap: 'anywhere' }}
                >
                  GitHub
                </Link>
              )}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

import type { HomeAnalyticsSummary } from './home-types';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

type Props = {
  summary: HomeAnalyticsSummary;
};

export function HomeAnalyticsSection({ summary }: Props) {
  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        pb: { xs: 7, md: 10 },
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 1.5,
            color: HOME_TEXT,
            bgcolor: 'rgba(42,55,54,0.34)',
            border: '1px solid rgba(248,246,238,0.22)',
            boxShadow: '0 28px 70px rgba(31,40,38,0.2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          >
            <Box>
              <Typography
                component="p"
                sx={{
                  color: 'rgba(234,215,161,0.92)',
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Live usage insights
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  mt: 1,
                  color: HOME_TEXT,
                  fontSize: { xs: 24, md: 48 },
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                สถิติการสำรวจวัฒนธรรมบนเว็บไซต์
              </Typography>
              <Typography sx={{ mt: 1.5, maxWidth: 620, color: 'rgba(248,246,238,0.76)' }}>
                ภาพรวม {summary.days} วันล่าสุดจากการเข้าชม คำค้นหา จังหวัด และอำเภอที่ผู้ใช้สนใจ
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 4,
                display: 'grid',
                gap: 1.5,
                width: { xs: 1, md: '300px' },
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 1,
                  bgcolor: 'rgba(248,246,238,0.12)',
                  border: '1px solid rgba(248,246,238,0.18)',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ mt: 1, fontSize: { xs: 30, md: 42 }, fontWeight: 950 }}>
                  {fNumber(summary.visitors)}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

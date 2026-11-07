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
        pb: 0,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
        <Box
          sx={{
            py: { xs: 3, md: 4 },
            borderRadius: 0,
            color: HOME_TEXT,
            bgcolor: 'transparent',
            borderTop: '1px solid rgba(32,33,36,0.18)',
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
                  color: '#4f575d',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                การใช้งานเว็บไซต์
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  mt: 1,
                  color: HOME_TEXT,
                  fontSize: { xs: 24, md: 34 },
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                ผู้คนที่ออกสำรวจไปกับเรา
              </Typography>
              <Typography sx={{ mt: 1.5, maxWidth: 620, color: 'rgba(32,33,36,0.76)' }}>
                จำนวนผู้เข้าชมเว็บไซต์ในช่วง {summary.days} วันล่าสุด
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                width: { xs: 1, md: '300px' },
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 1,
                  bgcolor: 'transparent',
                  borderLeft: { xs: 'none', md: '1px solid rgba(32,33,36,0.18)' },
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ mt: 1, fontSize: { xs: 30, md: 42 }, fontWeight: 600 }}>
                  {fNumber(summary.visitors)}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#62666a' }}>ผู้เข้าชม</Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

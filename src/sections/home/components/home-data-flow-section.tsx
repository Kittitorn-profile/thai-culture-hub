import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { HOME_TEXT, DATA_FLOW_STEPS, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

export function HomeDataFlowSection() {
  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 7, md: 9 },
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
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3.5, md: 4.5 } }}
        >
          <Box sx={{ maxWidth: 720 }}>
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
              Scalable data system
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
              ระบบข้อมูลที่พร้อมขยายต่อ
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(248,246,238,0.76)', lineHeight: 1.75 }}>
              ออกแบบให้ข้อมูลวัฒนธรรมไม่หยุดอยู่แค่รายการสถานที่ แต่ต่อยอดเป็นแผนที่ หน้าหมวด บทความ
              และระบบตรวจแก้ข้อมูลร่วมกับผู้ใช้ได้ในระยะยาว
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
            ดูฐานข้อมูล
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 2.5 },
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            mb: { xs: 2.5, md: 3 },
          }}
        >
          {DATA_FLOW_STEPS.map((step, index) => (
            <Box
              key={step.title}
              sx={{
                p: { xs: 2.2, md: 2.6 },
                minHeight: 190,
                borderRadius: 1.5,
                color: HOME_TEXT,
                bgcolor: 'rgba(42,55,54,0.3)',
                border: '1px solid rgba(248,246,238,0.2)',
                backdropFilter: 'blur(7px)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 1,
                  height: 4,
                  bgcolor: 'rgba(234,215,161,0.72)',
                },
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(234,215,161,0.92)',
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                }}
              >
                {String(index + 1).padStart(2, '0')} / {step.label}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: { xs: 19, md: 21 }, fontWeight: 900 }}>
                {step.title}
              </Typography>
              <Typography sx={{ mt: 1, color: 'rgba(248,246,238,0.72)', fontSize: 13.5, lineHeight: 1.7 }}>
                {step.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

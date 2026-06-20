'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { HomeFooter } from 'src/layouts/main/footer';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const tone = {
  text: '#f8f6ee',
  deep: '#2a3736',
  muted: 'rgba(248,246,238,0.76)',
  subtle: 'rgba(248,246,238,0.58)',
  gold: '#ead7a1',
  top: '#6f8790',
  middle: '#7b8476',
  bottom: '#8f7c5c',
};

const pageBackground = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${tone.top} 0%, ${tone.middle} 54%, ${tone.bottom} 100%)
`;

const posterPattern = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

const contactItems = [
  {
    icon: 'solar:phone-bold',
    label: 'โทร',
    value: '082-954-9263 (คุณฟลุ๊ค)',
  },
  {
    icon: 'solar:letter-bold',
    label: 'อีเมล',
    value: 'codeforcat.official@gmail.com',
  },
  {
    icon: 'solar:letter-bold',
    label: 'LINE',
    value: 'fluketoselnwza',
  },
  {
    icon: 'solar:flag-bold',
    label: 'พื้นที่ให้บริการ',
    value: 'รับงานทั่วไทย / Online meeting',
  },
] as const;

export function ContactView() {
  return (
    <Box
      component="main"
      sx={{
        px: { xs: 1.5, md: '5%' },
        py: { xs: 2, md: '5%' },
        minHeight: '100vh',
        color: tone.text,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: tone.middle,
        backgroundImage: pageBackground,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: posterPattern,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          zIndex: 1,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 1.5, md: 2 },
          backdropFilter: 'blur(3px)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2.25, md: 5 },
            py: { xs: 2.25, md: 10 },
            backgroundImage: `
              linear-gradient(90deg, rgba(248,246,238,0.08) 1px, transparent 1px),
              linear-gradient(180deg, rgba(248,246,238,0.08) 1px, transparent 1px)
            `,
            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <Box sx={{ mx: 'auto', maxWidth: 1040 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 5, md: 7 }}
              alignItems="stretch"
              sx={{ mt: { xs: 7, md: 9 } }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    px: 1.4,
                    py: 0.6,
                    width: 'fit-content',
                    color: tone.text,
                    borderRadius: 999,
                    bgcolor: 'rgba(42,55,54,0.28)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Contact us
                </Typography>

                <Typography
                  component="h3"
                  sx={{
                    mt: 2,
                    color: tone.text,
                    maxWidth: 560,
                    fontSize: { xs: 32, sm: 48, md: 60 },
                    fontWeight: 950,
                    lineHeight: 0.98,
                    textShadow: '0 5px 22px rgba(32,42,43,0.36)',
                  }}
                >
                  มาคุยเรื่องเว็บไซต์และแอปของคุณ
                </Typography>

                <Typography
                  sx={{
                    mt: 2.5,
                    color: tone.muted,
                    maxWidth: 520,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  ส่งรายละเอียดโปรเจกต์ งบประมาณคร่าว ๆ หรือสิ่งที่อยากทำมาได้เลย
                  เราจะช่วยสรุปแนวทางและประเมินขั้นตอนเริ่มต้นให้ชัดเจน
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 4 }}>
                  {contactItems.map((item) => (
                    <Stack
                      key={item.label}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        p: 1.6,
                        maxWidth: 440,
                        borderRadius: 1,
                        bgcolor: 'rgba(42,55,54,0.28)',
                        border: '1px solid rgba(255,255,255,0.24)',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          display: 'grid',
                          flexShrink: 0,
                          borderRadius: '50%',
                          placeItems: 'center',
                          color: tone.deep,
                          bgcolor: tone.gold,
                        }}
                      >
                        <Iconify icon={item.icon} width={18} />
                      </Box>
                      <Box>
                        <Typography sx={{ color: tone.subtle, fontSize: 12, fontWeight: 800 }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ color: tone.text, fontSize: 14, fontWeight: 900 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  p: { xs: 2.5, md: 4 },
                  borderRadius: 1,
                  bgcolor: 'rgba(248,246,238,0.9)',
                  border: '1px solid rgba(255,255,255,0.44)',
                  boxShadow: '0 24px 70px rgba(31,42,41,0.24)',
                }}
              >
                <Typography sx={{ color: tone.deep, fontSize: 28, fontWeight: 950 }}>
                  ส่งข้อความถึงเรา
                </Typography>
                <Typography
                  sx={{ mt: 1, color: 'rgba(42,55,54,0.74)', fontSize: 13, lineHeight: 1.7 }}
                >
                  กรอกข้อมูลสั้น ๆ แล้วทีม Code for Cat จะติดต่อกลับพร้อมแนวทางเริ่มต้น
                </Typography>

                <Stack spacing={2} sx={{ mt: 3 }}>
                  <TextField fullWidth label="ชื่อของคุณ" sx={fieldSx} />
                  <TextField fullWidth label="อีเมล / เบอร์โทร" sx={fieldSx} />
                  <TextField fullWidth label="งบประมาณโดยประมาณ" sx={fieldSx} />
                  <TextField
                    fullWidth
                    label="เล่าโปรเจกต์ที่อยากทำ"
                    multiline
                    rows={5}
                    sx={fieldSx}
                  />
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    py: 1.2,
                    color: tone.deep,
                    borderRadius: 999,
                    bgcolor: tone.gold,
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: '0 14px 28px rgba(80,63,13,0.2)',
                    '&:hover': { bgcolor: '#f2dfaa', boxShadow: '0 16px 32px rgba(80,63,13,0.24)' },
                  }}
                >
                  ส่งข้อมูลโปรเจกต์
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      <HomeFooter />
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.72)',
    borderRadius: 1,
    '& fieldset': { borderColor: 'rgba(42,55,54,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(42,55,54,0.34)' },
    '&.Mui-focused fieldset': { borderColor: tone.deep },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(42,55,54,0.64)',
    '&.Mui-focused': { color: tone.deep },
  },
};

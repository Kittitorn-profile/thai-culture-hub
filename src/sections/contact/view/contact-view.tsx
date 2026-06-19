'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { CodeForCatHeader } from 'src/components/code-for-cat-header';
import { CodeForCatFooter } from 'src/components/code-for-cat-footer';

// ----------------------------------------------------------------------

const tone = {
  ink: '#171717',
  muted: '#6f6a62',
  subtle: '#8d887f',
  page: '#e8e5df',
  frame: '#f4f2ee',
  surface: '#fbfaf7',
  soft: '#ece8e1',
  line: '#ded9cf',
  accent: '#756b60',
};

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
        color: tone.ink,
        bgcolor: tone.page,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 4 },
          bgcolor: tone.frame,
          border: '8px solid rgba(255,255,255,0.7)',
          boxShadow: '0 34px 100px rgba(46, 42, 36, 0.1)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2.25, md: 5 },
            py: { xs: 2.25, md: 5 },
            backgroundImage: `
              linear-gradient(90deg, rgba(45,40,34,0.06) 1px, transparent 1px),
              linear-gradient(180deg, rgba(45,40,34,0.06) 1px, transparent 1px)
            `,
            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <Box sx={{ mx: 'auto', maxWidth: 1040 }}>
            <CodeForCatHeader activeHref="/contact-us" sticky />

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
                    color: tone.muted,
                    borderRadius: 999,
                    bgcolor: tone.surface,
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
                    color: tone.ink,
                    maxWidth: 560,
                    fontSize: { xs: 32, sm: 48, md: 60 },
                    fontWeight: 950,
                    lineHeight: 0.98,
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
                        borderRadius: 2,
                        bgcolor: tone.surface,
                        border: `1px solid ${tone.line}`,
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
                          color: '#fff',
                          bgcolor: tone.accent,
                        }}
                      >
                        <Iconify icon={item.icon} width={18} />
                      </Box>
                      <Box>
                        <Typography sx={{ color: tone.subtle, fontSize: 12, fontWeight: 800 }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ color: tone.ink, fontSize: 14, fontWeight: 900 }}>
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
                  borderRadius: 2,
                  bgcolor: tone.surface,
                  border: `1px solid ${tone.line}`,
                  boxShadow: '0 18px 52px rgba(46,42,36,0.08)',
                }}
              >
                <Typography sx={{ color: tone.ink, fontSize: 28, fontWeight: 950 }}>
                  ส่งข้อความถึงเรา
                </Typography>
                <Typography sx={{ mt: 1, color: tone.muted, fontSize: 13, lineHeight: 1.7 }}>
                  กรอกข้อมูลสั้น ๆ แล้วทีม Code for Cat จะติดต่อกลับพร้อมแนวทางเริ่มต้น
                </Typography>

                <Stack spacing={2} sx={{ mt: 3 }}>
                  <TextField fullWidth label="ชื่อของคุณ" />
                  <TextField fullWidth label="อีเมล / เบอร์โทร" />
                  <TextField fullWidth label="งบประมาณโดยประมาณ" />
                  <TextField fullWidth label="เล่าโปรเจกต์ที่อยากทำ" multiline rows={5} />
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    py: 1.2,
                    color: '#fff',
                    borderRadius: 999,
                    bgcolor: tone.ink,
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#000', boxShadow: 'none' },
                  }}
                >
                  ส่งข้อมูลโปรเจกต์
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>

        <CodeForCatFooter />
      </Box>
    </Box>
  );
}

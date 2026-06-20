import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

// ----------------------------------------------------------------------

const SOCIALS = [
  { label: 'Facebook', icon: 'socials:facebook', href: '#' },
  { label: 'Twitter', icon: 'socials:twitter', href: '#' },
  { label: 'Linkedin', icon: 'socials:linkedin', href: '#' },
] as const;

const FEATURED_MEMBER = {
  name: 'Code For Cat Team',
  role: 'Product & Development Team',
  image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-1.webp`,
};

const EXPERIENCE = [
  'วางแผน scope, sitemap และ user flow ให้ชัดก่อนเริ่มพัฒนา',
  'ออกแบบ UI/UX ให้ตรงแบรนด์ ใช้งานง่าย และรองรับทุกอุปกรณ์',
  'พัฒนาระบบจริงพร้อมดูแลหลังส่งมอบ เพื่อให้ทีมเดินงานต่อได้สบาย',
];

const VISION_MISSION = [
  {
    title: 'Vision',
    eyebrow: 'ภาพที่เราอยากไปให้ถึง',
    icon: 'solar:eye-bold',
    description:
      'เป็นทีมเทคโนโลยีที่ช่วยให้ธุรกิจเริ่มต้นและเติบโตบนโลกดิจิทัลได้ง่ายขึ้น ด้วยเว็บไซต์ แอป และระบบที่เข้าใจคนใช้งานจริง',
  },
  {
    title: 'Mission',
    eyebrow: 'สิ่งที่เราทำในทุกโปรเจกต์',
    icon: 'solar:flag-bold',
    description:
      'ออกแบบ พัฒนา และดูแลระบบอย่างเป็นขั้นตอน ตั้งแต่ฟังโจทย์ วางแผน สร้างประสบการณ์ใช้งาน ไปจนถึงส่งมอบงานที่ทีมลูกค้าดูแลต่อได้',
  },
] as const;

const HIGHLIGHTS = [
  {
    title: 'เริ่มจากโจทย์ธุรกิจ',
    icon: 'solar:chat-round-dots-bold',
    description: 'ฟังเป้าหมายและข้อจำกัดก่อนเลือก solution เพื่อให้งานที่ทำตอบโจทย์จริง',
  },
  {
    title: 'ออกแบบให้ใช้งานง่าย',
    icon: 'solar:like-bold',
    description: 'วาง flow และ UI ให้ทีมกับลูกค้าเข้าใจเร็ว ลดขั้นตอนซ้ำซ้อนในงานประจำ',
  },
  {
    title: 'พร้อมดูแลต่อ',
    icon: 'solar:shield-check-bold',
    description: 'ส่งมอบพร้อมคำแนะนำ ดูแลหลังขึ้นระบบ และช่วยปรับปรุงเมื่อต้องขยายต่อ',
  },
] as const;

const ABOUT_TEXT = '#f8f6ee';
const ABOUT_DEEP = '#2a3736';
const ABOUT_GOLD = '#ead7a1';
const ABOUT_BG_TOP = '#6f8790';
const ABOUT_BG_MIDDLE = '#7b8476';
const ABOUT_BG_BOTTOM = '#8f7c5c';
const ABOUT_MUTED = 'rgba(248,246,238,0.76)';
const ABOUT_SHARED_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${ABOUT_BG_TOP} 0%, ${ABOUT_BG_MIDDLE} 54%, ${ABOUT_BG_BOTTOM} 100%)
`;
const ABOUT_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

// ----------------------------------------------------------------------

export function AboutTeam({ sx, ...other }: BoxProps) {
  return (
    <Box
      component="section"
      sx={[
        {
          px: { xs: 1.5, md: '5%' },
          py: { xs: 2, md: '5%' },
          overflow: 'hidden',
          color: ABOUT_TEXT,
          position: 'relative',
          bgcolor: ABOUT_BG_MIDDLE,
          backgroundImage: ABOUT_SHARED_BACKGROUND,
          fontFamily: "'LINE Seed Sans TH', sans-serif",
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: { xs: -80, md: -120 },
            zIndex: 0,
            opacity: 0.22,
            pointerEvents: 'none',
            backgroundImage: ABOUT_POSTER_PATTERN,
            transform: 'rotate(-4deg)',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          mx: 'auto',
          zIndex: 1,
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: { xs: 1.5, md: 2 },
          backdropFilter: 'blur(3px)',
        }}
      >
        <Box
          component={MotionViewport}
          viewport={{ amount: 0.01 }}
          sx={{
            pt: { xs: 2, md: 7 },
            pb: { xs: 8, md: 12 },
            backgroundImage: `
              linear-gradient(90deg, rgba(248,246,238,0.08) 1px, transparent 1px),
              linear-gradient(180deg, rgba(248,246,238,0.08) 1px, transparent 1px)
            `,
            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <Box sx={{ mx: 'auto', mt: { xs: 7, md: 10 }, maxWidth: 760, textAlign: 'center' }}>
            <m.div variants={varFade('inDown')}>
              <SectionPill>About CODE FOR CAT</SectionPill>
            </m.div>

            <m.div variants={varFade('inUp')}>
              <Typography
                component="h2"
                sx={{
                  mt: 2,
                  color: ABOUT_TEXT,
                  fontSize: { xs: 34, md: 54 },
                  fontWeight: 950,
                  lineHeight: 1.25,
                  letterSpacing: 0,
                  textShadow: '0 5px 22px rgba(32,42,43,0.36)',
                }}
              >
                ทีมเล็กที่ออกแบบและพัฒนาระบบให้ธุรกิจใช้งานได้จริง
                <Box
                  component="span"
                  sx={{
                    mt: 1.4,
                    px: 2,
                    py: 0.8,
                    color: ABOUT_DEEP,
                    display: 'inline-block',
                    borderRadius: 999,
                    bgcolor: ABOUT_GOLD,
                    fontSize: { xs: 24, md: 34 },
                    boxShadow: '0 14px 28px rgba(80,63,13,0.18)',
                  }}
                >
                  Design + Development
                </Box>
              </Typography>
            </m.div>

            <m.div variants={varFade('inUp')}>
              <Typography
                sx={{
                  mx: 'auto',
                  mt: 2,
                  color: ABOUT_MUTED,
                  maxWidth: 590,
                  fontSize: { xs: 14, md: 15 },
                  lineHeight: 1.75,
                }}
              >
                เราช่วยวางแผน ออกแบบ และพัฒนาเว็บไซต์ แอปพลิเคชัน
                ไปจนถึงระบบหลังบ้านให้ตอบโจทย์ธุรกิจ พร้อมดูแลต่อหลังส่งมอบ
              </Typography>
            </m.div>
          </Box>

          <Box
            sx={{
              mx: 'auto',
              maxWidth: 1040,
              mt: { xs: 7, md: 10 },
              textAlign: 'center',
            }}
          >
            <m.div variants={varFade('inUp')}>
              <SectionPill>Vision & Mission</SectionPill>
            </m.div>

            <Grid container spacing={3} sx={{ mt: { xs: 3, md: 4 } }}>
              {VISION_MISSION.map((item) => (
                <Grid key={item.title} size={{ xs: 12, md: 6 }}>
                  <VisionMissionCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box
            sx={{
              mx: 'auto',
              maxWidth: 1040,
              mt: { xs: 5, md: 7 },
            }}
          >
            <Grid container spacing={2.5}>
              {HIGHLIGHTS.map((item) => (
                <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                  <HighlightCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box
            sx={{
              mx: 'auto',
              maxWidth: 1040,
              mt: { xs: 5, md: 7 },
              p: { xs: 2.5, md: 5 },
              overflow: 'hidden',
              borderRadius: 1,
              bgcolor: 'rgba(248,246,238,0.9)',
              border: '1px solid rgba(255,255,255,0.44)',
              boxShadow: '0 24px 70px rgba(31,42,41,0.24)',
            }}
          >
            <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <m.div variants={varFade('inLeft')}>
                  <Box
                    sx={{
                      p: 1.5,
                      minHeight: { xs: 430, md: 520 },
                      position: 'relative',
                      bgcolor: 'rgba(42,55,54,0.1)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid rgba(42,55,54,0.16)',
                    }}
                  >
                    <RoleLabel>{FEATURED_MEMBER.role}</RoleLabel>

                    <Image
                      alt={FEATURED_MEMBER.name}
                      src={FEATURED_MEMBER.image}
                      ratio="4/5"
                      sx={{
                        height: 1,
                        width: 1,
                        '& img': { objectFit: 'contain', objectPosition: 'center bottom' },
                      }}
                    />
                  </Box>
                </m.div>
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Stack component={m.div} variants={varFade('inRight')} spacing={{ xs: 3, md: 4 }}>
                  <Box>
                    <Typography
                      sx={{
                        color: ABOUT_DEEP,
                        fontSize: { xs: 28, md: 42 },
                        fontWeight: 950,
                        lineHeight: 1.05,
                      }}
                    >
                      {FEATURED_MEMBER.name}
                    </Typography>

                    <Typography sx={{ mt: 2, color: 'rgba(42,55,54,0.76)', lineHeight: 1.8 }}>
                      เราทำงานแบบพาร์ตเนอร์ เริ่มจากเข้าใจเป้าหมายของธุรกิจ
                      แล้วค่อยออกแบบหน้าจอและระบบที่ทีมของคุณใช้ต่อได้จริง ไม่ใช่แค่สวยในวันส่งมอบ
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {SOCIALS.map((social) => (
                      <IconButton
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        sx={{
                          width: 40,
                          height: 40,
                          color: ABOUT_DEEP,
                          bgcolor: 'rgba(255,255,255,0.78)',
                          borderRadius: 999,
                          boxShadow: '0 12px 24px rgba(46,42,36,0.08)',
                          '&:hover': { bgcolor: '#fff' },
                        }}
                      >
                        <Iconify icon={social.icon} width={18} />
                      </IconButton>
                    ))}
                  </Stack>

                  <Divider sx={{ borderColor: 'rgba(42,55,54,0.16)' }} />

                  <Box>
                    <Typography
                      sx={{
                        mb: 2,
                        color: ABOUT_DEEP,
                        fontSize: { xs: 22, md: 28 },
                        fontWeight: 900,
                      }}
                    >
                      วิธีทำงานของเรา
                    </Typography>

                    <Stack spacing={1.5}>
                      {EXPERIENCE.map((item) => (
                        <Stack
                          key={item}
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: 'center' }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              flexShrink: 0,
                              display: 'grid',
                              borderRadius: '50%',
                              placeItems: 'center',
                              color: ABOUT_DEEP,
                              bgcolor: ABOUT_GOLD,
                            }}
                          >
                            <Iconify icon="eva:checkmark-fill" width={18} />
                          </Box>

                          <Typography sx={{ color: 'rgba(42,55,54,0.76)', fontSize: 14 }}>
                            {item}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>

      <HomeFooter />
    </Box>
  );
}

// ----------------------------------------------------------------------

type SectionPillProps = {
  children: React.ReactNode;
};

function SectionPill({ children }: SectionPillProps) {
  return (
    <Typography
      sx={{
        px: 1.5,
        py: 0.6,
        width: 'fit-content',
        mx: 'auto',
        color: ABOUT_TEXT,
        borderRadius: 999,
        bgcolor: 'rgba(42,55,54,0.28)',
        border: '1px solid rgba(255,255,255,0.28)',
        fontSize: 12,
        fontWeight: 800,
        boxShadow: '0 10px 20px rgba(31,42,41,0.1)',
      }}
    >
      {children}
    </Typography>
  );
}

// ----------------------------------------------------------------------

type RoleLabelProps = {
  children: React.ReactNode;
};

type HighlightCardProps = {
  item: (typeof HIGHLIGHTS)[number];
};

function HighlightCard({ item }: HighlightCardProps) {
  return (
    <Card
      component={m.div}
      variants={varFade('inUp')}
      sx={{
        p: 3,
        height: 1,
        borderRadius: 1,
        boxShadow: 'none',
        color: ABOUT_TEXT,
        bgcolor: 'rgba(42,55,54,0.28)',
        border: '1px solid rgba(255,255,255,0.24)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            display: 'grid',
            borderRadius: 1.5,
            placeItems: 'center',
            color: ABOUT_DEEP,
            bgcolor: ABOUT_GOLD,
            boxShadow: '0 12px 24px rgba(80,63,13,0.18)',
          }}
        >
          <Iconify icon={item.icon} width={22} />
        </Box>

        <Box>
          <Typography sx={{ color: ABOUT_TEXT, fontSize: 17, fontWeight: 950 }}>
            {item.title}
          </Typography>

          <Typography sx={{ mt: 0.8, color: ABOUT_MUTED, fontSize: 13, lineHeight: 1.7 }}>
            {item.description}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

type VisionMissionCardProps = {
  item: (typeof VISION_MISSION)[number];
};

function VisionMissionCard({ item }: VisionMissionCardProps) {
  return (
    <Card
      component={m.div}
      variants={varFade('inUp')}
      sx={{
        p: { xs: 3, md: 4 },
        height: 1,
        borderRadius: 1,
        textAlign: 'start',
        boxShadow: 'none',
        color: ABOUT_TEXT,
        bgcolor: 'rgba(42,55,54,0.28)',
        border: '1px solid rgba(255,255,255,0.24)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          display: 'grid',
          borderRadius: 1.5,
          placeItems: 'center',
          color: ABOUT_DEEP,
          bgcolor: ABOUT_GOLD,
          boxShadow: '0 12px 24px rgba(80,63,13,0.18)',
        }}
      >
        <Iconify icon={item.icon} width={24} />
      </Box>

      <Typography sx={{ mt: 3, color: 'rgba(248,246,238,0.62)', fontSize: 12, fontWeight: 800 }}>
        {item.eyebrow}
      </Typography>

      <Typography
        sx={{
          mt: 0.8,
          color: ABOUT_TEXT,
          fontSize: { xs: 28, md: 34 },
          fontWeight: 950,
          lineHeight: 1,
        }}
      >
        {item.title}
      </Typography>

      <Typography sx={{ mt: 2, color: ABOUT_MUTED, fontSize: 14, lineHeight: 1.8 }}>
        {item.description}
      </Typography>
    </Card>
  );
}

// ----------------------------------------------------------------------

function RoleLabel({ children }: RoleLabelProps) {
  return (
    <Box
      sx={{
        top: 20,
        left: 20,
        zIndex: 1,
        px: 1.4,
        py: 0.7,
        borderRadius: 999,
        position: 'absolute',
        bgcolor: ABOUT_GOLD,
        boxShadow: '0 12px 24px rgba(80,63,13,0.18)',
        color: ABOUT_DEEP,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </Box>
  );
}

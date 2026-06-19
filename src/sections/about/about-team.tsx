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

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';
import { CodeForCatHeader } from 'src/components/code-for-cat-header';
import { CodeForCatFooter } from 'src/components/code-for-cat-footer';

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

const DIRECTORS = [
  {
    name: 'Product Planning',
    role: 'Strategy',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-2.webp`,
    description: 'ช่วยแปลงโจทย์ธุรกิจให้เป็น feature, timeline และแผนงานที่ทำต่อได้จริง',
  },
  {
    name: 'UI/UX Design',
    role: 'Design',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-3.webp`,
    description: 'ออกแบบหน้าจอให้สวย อ่านง่าย และมี flow ที่ผู้ใช้เข้าใจตั้งแต่ครั้งแรก',
  },
  {
    name: 'Web Development',
    role: 'Frontend',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-4.webp`,
    description: 'สร้างเว็บไซต์ responsive พร้อม performance, SEO และโครงสร้างที่ดูแลง่าย',
  },
  {
    name: 'Application',
    role: 'Mobile App',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-5.webp`,
    description: 'พัฒนาแอปและ web app พร้อมเชื่อมต่อ API, login และ workflow สำคัญ',
  },
  {
    name: 'Dashboard',
    role: 'Back Office',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-6.webp`,
    description: 'ทำระบบจัดการข้อมูล สิทธิ์ผู้ใช้ รายงาน และเครื่องมือหลังบ้านให้ทีมใช้งานจริง',
  },
  {
    name: 'Care & Support',
    role: 'Maintenance',
    image: `${CONFIG.assetsDir}/assets/images/mock/portrait/portrait-7.webp`,
    description: 'ดูแลระบบหลังขึ้นงานจริง ตรวจสุขภาพเว็บ แก้บั๊ก และปรับปรุงต่อเนื่อง',
  },
];

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
          color: 'primary.darker',
          bgcolor: 'secondary.dark',
          fontFamily: "'LINE Seed Sans TH', sans-serif",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 4 },
          bgcolor: 'secondary.main',
          border: '8px solid rgba(255,255,255,0.7)',
          boxShadow: '0 34px 100px rgba(46, 42, 36, 0.1)',
        }}
      >
        <Box
          component={MotionViewport}
          viewport={{ amount: 0.01 }}
          sx={{
            pt: { xs: 2, md: 7 },
            pb: { xs: 8, md: 12 },
            bgcolor: 'secondary.main',
            backgroundImage: `
              linear-gradient(90deg, rgba(45,40,34,0.06) 1px, transparent 1px),
              linear-gradient(180deg, rgba(45,40,34,0.06) 1px, transparent 1px)
            `,
            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <CodeForCatHeader activeHref="/about-us" sticky />

          <Box sx={{ mx: 'auto', mt: { xs: 7, md: 10 }, maxWidth: 760, textAlign: 'center' }}>
            <m.div variants={varFade('inDown')}>
              <SectionPill>About CODE FOR CAT</SectionPill>
            </m.div>

            <m.div variants={varFade('inUp')}>
              <Typography
                component="h2"
                sx={{
                  mt: 2,
                  color: 'primary.darker',
                  fontSize: { xs: 34, md: 54 },
                  fontWeight: 950,
                  lineHeight: 1.25,
                  letterSpacing: 0,
                }}
              >
                ทีมเล็กที่ออกแบบและพัฒนาระบบให้ธุรกิจใช้งานได้จริง
                <Box
                  component="span"
                  sx={{
                    mt: 1.4,
                    px: 2,
                    py: 0.8,
                    color: 'primary.main',
                    display: 'inline-block',
                    borderRadius: 999,
                    bgcolor: 'primary.lighter',
                    fontSize: { xs: 24, md: 34 },
                    boxShadow: 'inset 0 0 0 2px rgba(117,107,96,0.1)',
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
                  color: 'primary.dark',
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
              borderRadius: 2,
              bgcolor: 'secondary.lighter',
              border: 1,
              borderColor: 'secondary.darker',
              boxShadow: '0 18px 52px rgba(46,42,36,0.08)',
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
                      bgcolor: 'secondary.light',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'secondary.darker',
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
                        color: 'primary.darker',
                        fontSize: { xs: 28, md: 42 },
                        fontWeight: 950,
                        lineHeight: 1.05,
                      }}
                    >
                      {FEATURED_MEMBER.name}
                    </Typography>

                    <Typography sx={{ mt: 2, color: 'primary.dark', lineHeight: 1.8 }}>
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
                          color: 'primary.darker',
                          bgcolor: '#fff',
                          borderRadius: 999,
                          boxShadow: '0 12px 24px rgba(46,42,36,0.08)',
                          '&:hover': { bgcolor: '#fff' },
                        }}
                      >
                        <Iconify icon={social.icon} width={18} />
                      </IconButton>
                    ))}
                  </Stack>

                  <Divider sx={{ borderColor: 'secondary.darker' }} />

                  <Box>
                    <Typography
                      sx={{
                        mb: 2,
                        color: 'primary.darker',
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
                              color: '#fff',
                              bgcolor: 'primary.darker',
                            }}
                          >
                            <Iconify icon="eva:checkmark-fill" width={18} />
                          </Box>

                          <Typography sx={{ color: 'primary.dark', fontSize: 14 }}>
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

          <Box
            sx={{
              mx: 'auto',
              maxWidth: 1040,
              mt: { xs: 9, md: 13 },
              textAlign: { xs: 'center', md: 'unset' },
            }}
          >
            <Grid
              container
              columnSpacing={{ xs: 3, md: 9 }}
              rowSpacing={{ xs: 3, md: 0 }}
              sx={{ alignItems: 'flex-start', textAlign: 'start', mb: { xs: 5, md: 7 } }}
            >
              <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { xs: 'center', md: 'start' } }}>
                <m.div variants={varFade('inLeft')}>
                  <SectionPill>What we do</SectionPill>
                </m.div>

                <m.div variants={varFade('inUp')}>
                  <Typography
                    sx={{
                      mt: { xs: 2.5, md: 3 },
                      color: 'primary.darker',
                      fontSize: { xs: 32, md: 42 },
                      fontWeight: 950,
                      lineHeight: 1.35,
                      letterSpacing: 0,
                    }}
                  >
                    ความถนัดที่ช่วยให้โปรเจกต์เดินเร็วขึ้น
                  </Typography>
                </m.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }} sx={{ pt: { md: 0.6 } }}>
                <m.div variants={varFade('inRight')}>
                  <Typography
                    sx={{
                      color: 'primary.dark',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.75,
                      textAlign: { xs: 'center', md: 'start' },
                    }}
                  >
                    เลือกทีมตามโจทย์ของคุณได้ตั้งแต่ landing page, เว็บไซต์บริษัท, mobile app, ระบบ
                    dashboard ไปจนถึงการดูแลระบบหลังขึ้นงานจริง
                  </Typography>
                </m.div>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {DIRECTORS.map((member) => (
                <Grid key={member.name} size={{ xs: 12, sm: 6, md: 4 }}>
                  <DirectorCard member={member} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        <CodeForCatFooter />
      </Box>
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
        color: 'primary.dark',
        borderRadius: 999,
        bgcolor: 'secondary.lighter',
        fontSize: 12,
        fontWeight: 800,
        boxShadow: '0 10px 20px rgba(46,42,36,0.06)',
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
        borderRadius: 2,
        boxShadow: 'none',
        bgcolor: 'secondary.lighter',
        border: 1,
        borderColor: 'secondary.darker',
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
            color: '#fff',
            bgcolor: 'primary.darker',
            boxShadow: '0 12px 24px rgba(46,42,36,0.12)',
          }}
        >
          <Iconify icon={item.icon} width={22} />
        </Box>

        <Box>
          <Typography sx={{ color: 'primary.darker', fontSize: 17, fontWeight: 950 }}>
            {item.title}
          </Typography>

          <Typography sx={{ mt: 0.8, color: 'primary.dark', fontSize: 13, lineHeight: 1.7 }}>
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
        borderRadius: 2,
        textAlign: 'start',
        boxShadow: 'none',
        bgcolor: 'secondary.lighter',
        border: 1,
        borderColor: 'secondary.darker',
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          display: 'grid',
          borderRadius: 1.5,
          placeItems: 'center',
          color: 'primary.darker',
          bgcolor: 'primary.lighter',
          boxShadow: 'inset 0 0 0 1px rgba(117,107,96,0.12)',
        }}
      >
        <Iconify icon={item.icon} width={24} />
      </Box>

      <Typography sx={{ mt: 3, color: 'primary.dark', fontSize: 12, fontWeight: 800 }}>
        {item.eyebrow}
      </Typography>

      <Typography
        sx={{
          mt: 0.8,
          color: 'primary.darker',
          fontSize: { xs: 28, md: 34 },
          fontWeight: 950,
          lineHeight: 1,
        }}
      >
        {item.title}
      </Typography>

      <Typography sx={{ mt: 2, color: 'primary.dark', fontSize: 14, lineHeight: 1.8 }}>
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
        bgcolor: '#fff',
        boxShadow: '0 12px 24px rgba(46,42,36,0.1)',
        color: 'primary.darker',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

type DirectorCardProps = {
  member: (typeof DIRECTORS)[number];
};

function DirectorCard({ member }: DirectorCardProps) {
  return (
    <Card
      component={m.div}
      variants={varFade('inUp')}
      sx={{
        height: 1,
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 'none',
        bgcolor: 'secondary.lighter',
        border: 1,
        borderColor: 'secondary.darker',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 18px 42px rgba(46,42,36,0.1)',
        },
      }}
    >
      <Box
        sx={{
          p: 1.5,
          height: 300,
          position: 'relative',
          bgcolor: 'secondary.light',
          overflow: 'hidden',
        }}
      >
        <RoleLabel>{member.role}</RoleLabel>

        <Image
          alt={member.name}
          src={member.image}
          ratio="1/1"
          sx={{
            height: 1,
            width: 1,
            '& img': { objectFit: 'contain', objectPosition: 'center bottom' },
          }}
        />
      </Box>

      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: 'primary.darker', fontSize: 18, fontWeight: 900, mb: 1.2 }}>
          {member.name}
        </Typography>

        <Typography sx={{ color: 'primary.dark', fontSize: 13, lineHeight: 1.75 }}>
          {member.description}
        </Typography>
      </Box>
    </Card>
  );
}

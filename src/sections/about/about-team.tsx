import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

// ----------------------------------------------------------------------

const VISION_MISSION = [
  {
    title: 'Vision',
    eyebrow: 'ภาพที่อยากเห็น',
    icon: 'solar:eye-bold',
    description:
      'ทำให้ข้อมูลวัฒนธรรมไทยเข้าถึงง่าย เห็นความเชื่อมโยงกับพื้นที่จริง และช่วยให้ผู้คนเริ่มสำรวจเรื่องราวของแต่ละจังหวัดได้จากจุดเดียว',
  },
  {
    title: 'Mission',
    eyebrow: 'สิ่งที่ระบบนี้ทำ',
    icon: 'solar:flag-bold',
    description:
      'รวบรวม จัดกลุ่ม และนำเสนอข้อมูลสถานที่ วัฒนธรรม ประเพณี อาหารพื้นถิ่น หัตถกรรม และภูมิปัญญา ผ่านแผนที่และหน้ารายละเอียดจังหวัด',
  },
] as const;

const HIGHLIGHTS = [
  {
    title: 'เริ่มจากพื้นที่',
    icon: 'solar:chat-round-dots-bold',
    description: 'ใช้จังหวัดและอำเภอเป็นแกนหลัก เพื่อให้ข้อมูลวัฒนธรรมไม่ลอยออกจากบริบทจริง',
  },
  {
    title: 'จัดข้อมูลให้อ่านง่าย',
    icon: 'solar:like-bold',
    description: 'แยกหมวด แหล่งข้อมูล และรายละเอียดสำคัญ เพื่อให้ค้นหาและเปรียบเทียบได้เร็วขึ้น',
  },
  {
    title: 'พร้อมต่อยอด',
    icon: 'solar:shield-check-bold',
    description: 'โครงสร้างข้อมูลรองรับการเพิ่มจังหวัด แหล่งข้อมูล และมุมมองใหม่ในอนาคต',
  },
] as const;

const SOURCE_DATASETS = [
  {
    name: 'บัญชีข้อมูลด้านวัฒนธรรม',
    owner: 'กระทรวงวัฒนธรรม / Government Data Catalog',
    logo: 'GDC',
    icon: 'solar:file-text-bold',
    href: 'https://culture.gdcatalog.go.th/dataset/culture_heritage',
    description: 'ข้อมูลมรดกภูมิปัญญาทางวัฒนธรรมและรายละเอียดประกอบที่ใช้จัดหมวดหมู่เชิงวัฒนธรรม',
  },
  {
    name: 'TAT Data API',
    owner: 'การท่องเที่ยวแห่งประเทศไทย',
    logo: 'TAT',
    icon: 'solar:flag-bold',
    href: 'https://tatdataapi.io/',
    description: 'ข้อมูลสถานที่ท่องเที่ยว ภาพประกอบ รายละเอียด และพิกัดที่นำมาเชื่อมกับจังหวัด',
  },
  {
    name: 'Fine Arts Open Data API',
    owner: 'กรมศิลปากร',
    logo: 'FAD',
    icon: 'solar:notebook-bold-duotone',
    href: 'https://api.finearts.go.th/',
    description:
      'ข้อมูลโบราณสถาน แหล่งโบราณคดี พิพิธภัณฑ์ และรายการศิลปวัตถุสำหรับหมวดประวัติศาสตร์',
  },
  {
    name: 'Thailand Boundary & Province Data',
    owner: 'apisit/thailand.json',
    logo: 'MAP',
    icon: 'solar:add-folder-bold',
    href: 'https://www.geoboundaries.org/',
    description: 'ชุดข้อมูลขอบเขตจังหวัด อำเภอ ชื่อพื้นที่ และตำแหน่งศูนย์กลางสำหรับแสดงผลแผนที่',
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
            pt: { xs: 2, md: 0 },
            pb: { xs: 8, md: 12 },
            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <Box sx={{ mx: 'auto', mt: { xs: 7, md: 10 }, maxWidth: 760, textAlign: 'center' }}>
            <m.div variants={varFade('inDown')}>
              <SectionPill>About Thai Culture Hub</SectionPill>
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
                พื้นที่กลางสำหรับสำรวจข้อมูลวัฒนธรรมไทยรายจังหวัด
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
                  Map + Culture Data
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
                เรารวบรวมข้อมูลสถานที่และวัฒนธรรมจากหลายแหล่ง แล้วจัดให้อยู่ในรูปแบบที่ค้นหา กรอง
                และสำรวจผ่านแผนที่ได้ง่ายขึ้น โดยยังคงแหล่งอ้างอิงของข้อมูลแต่ละรายการ
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
              textAlign: 'center',
            }}
          >
            <m.div variants={varFade('inUp')}>
              <SectionPill>Credits & Data Sources</SectionPill>
            </m.div>

            <AttributionSection />
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

type SourceDatasetCardProps = {
  dataset: (typeof SOURCE_DATASETS)[number];
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

function AttributionSection() {
  return (
    <Box
      component={m.div}
      variants={varFade('inUp')}
      sx={{
        mt: { xs: 3, md: 4 },
        p: { xs: 2.5, md: 4 },
        overflow: 'hidden',
        color: ABOUT_DEEP,
        textAlign: 'start',
        borderRadius: 1,
        position: 'relative',
        bgcolor: 'rgba(42,55,54,0.28)',
        border: '1px solid rgba(255,255,255,0.24)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack
            spacing={2}
            sx={{
              p: 3,
              height: 1,
              borderRadius: 1,
              justifyContent: 'space-between',
              bgcolor: 'rgba(42,55,54,0.28)',
              border: '1px solid rgba(255,255,255,0.24)',
            }}
          >
            <Box sx={{ textAlign: 'center', color: '#fff' }}>
              <Image
                alt="Single logo"
                sx={{
                  width: { xs: 96, md: 200 },
                  mb: { xs: 0.5, md: 0 },
                }}
                src="/logo/logo-single.png"
              />

              <Typography sx={{ mt: 2.5, fontSize: { xs: 25, md: 30 }, fontWeight: 950 }}>
                Thai Culture Hub
              </Typography>

              <Typography sx={{ mt: 1, lineHeight: 1.8 }}>
                ขอบคุณทุกแหล่งข้อมูลที่เปิดให้เข้าถึงและนำมาต่อยอด
                เรานำข้อมูลมาจัดระเบียบเพื่อการสำรวจและการเรียนรู้ โดยยังคงอ้างอิงที่มาของข้อมูล
              </Typography>
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2}>
            {SOURCE_DATASETS.map((dataset) => (
              <Grid key={dataset.name} size={{ xs: 12, sm: 6 }}>
                <SourceDatasetCard dataset={dataset} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

// ----------------------------------------------------------------------

function SourceDatasetCard({ dataset }: SourceDatasetCardProps) {
  return (
    <Card
      sx={{
        p: 2.5,
        height: 1,
        gap: 2,
        display: 'flex',
        boxShadow: 'none',
        borderRadius: 1,
        textDecoration: 'none',
        color: '#fff',
        bgcolor: 'rgba(42,55,54,0.28)',
        border: '1px solid rgba(255,255,255,0.24)',
        transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          bgcolor: 'rgba(42,55,54,0.28)',
          border: '1px solid rgba(255,255,255,0.24)',
        },
      }}
    >
      <Box
        sx={{
          width: 54,
          height: 54,
          flexShrink: 0,
          display: 'grid',
          borderRadius: 1.5,
          placeItems: 'center',
          color: ABOUT_DEEP,
          bgcolor: ABOUT_GOLD,
          fontSize: 13,
          fontWeight: 950,
          boxShadow: '0 12px 24px rgba(80,63,13,0.16)',
        }}
      >
        {dataset.logo}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 950, lineHeight: 1.25 }}>
            {dataset.name}
          </Typography>
        </Stack>

        <Typography sx={{ mt: 0.7, fontSize: 12, fontWeight: 800 }}>{dataset.owner}</Typography>

        <Typography sx={{ mt: 1.2, fontSize: 13, lineHeight: 1.7 }}>
          {dataset.description}
        </Typography>
      </Box>
    </Card>
  );
}

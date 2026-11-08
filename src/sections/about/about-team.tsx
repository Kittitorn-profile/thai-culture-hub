import type { BoxProps } from '@mui/material/Box';

import {
  RiEdit2Line,
  RiMapPinLine,
  RiSearchLine,
  RiArrowRightLine,
  RiExternalLinkLine,
} from '@remixicon/react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { cultureUi } from 'src/theme/culture-ui';
import { HomeFooter } from 'src/layouts/main/footer';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { AboutSystem } from './about-system';

const FEATURES = [
  {
    icon: RiMapPinLine,
    title: 'สำรวจจากแผนที่',
    description: 'เลือกจังหวัดเพื่อรู้จักสถานที่ ประเพณี และเรื่องราวในพื้นที่',
    href: '/#explore-map',
    action: 'เปิดแผนที่',
  },
  {
    icon: RiSearchLine,
    title: 'ค้นหาตามความสนใจ',
    description: 'ค้นหาสถานที่ ศิลปิน มรดกภูมิปัญญา ชุมชน ผลิตภัณฑ์ และผ้ากับงานช่าง',
    href: '/cultural-data/',
    action: 'ดูประเภทข้อมูล',
  },
  {
    icon: RiEdit2Line,
    title: 'ร่วมแบ่งปันเรื่องราว',
    description: 'สมัครสมาชิกเพื่อเขียนบทความ หรือเสนอข้อมูลและภาพเพิ่มเติมให้ทีมงานตรวจสอบ',
    href: '/creator/register',
    action: 'สมัครสมาชิก',
  },
];

const SOURCES = [
  {
    name: 'บัญชีข้อมูลด้านวัฒนธรรม',
    owner: 'กระทรวงวัฒนธรรม',
    detail: 'มรดกภูมิปัญญาและข้อมูลวัฒนธรรม',
    href: 'https://culture.gdcatalog.go.th/dataset/culture_heritage',
  },
  {
    name: 'TAT Data API',
    owner: 'การท่องเที่ยวแห่งประเทศไทย',
    detail: 'แหล่งท่องเที่ยว ภาพ และพิกัดสถานที่',
    href: 'https://tatdataapi.io/',
  },
  {
    name: 'Fine Arts Open Data',
    owner: 'กรมศิลปากร',
    detail: 'โบราณสถาน พิพิธภัณฑ์ และศิลปวัตถุ',
    href: 'https://api.finearts.go.th/',
  },
  {
    name: 'geoBoundaries',
    owner: 'ข้อมูลขอบเขตพื้นที่',
    detail: 'ขอบเขตทางภูมิศาสตร์สำหรับแผนที่',
    href: 'https://www.geoboundaries.org/',
  },
];

export function AboutTeam({ sx, ...other }: BoxProps) {
  return (
    <Box
      {...other}
      sx={[
        { bgcolor: cultureUi.background, color: cultureUi.text },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="main"
        sx={{
          px: HOME_SECTION_PX,
          pt: { xs: 4, md: 6 },
          pb: { xs: 5, md: 7 },
          maxWidth: 1408,
          mx: 'auto',
        }}
      >
        <Box
          component="header"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
            gap: { xs: 3, md: 7 },
            alignItems: 'center',
            pb: { xs: 4, md: 5 },
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 12, color: cultureUi.muted, mb: 1.5 }}>
              เกี่ยวกับ Thailand Cultural Hub
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 32, sm: 40, md: 46 },
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: '-0.02em',
              }}
            >
              รู้จักวัฒนธรรมไทย
              <br />
              เริ่มได้จากที่นี่
            </Typography>
            <Typography
              sx={{ mt: 2, maxWidth: 530, color: cultureUi.muted, fontSize: 15, lineHeight: 1.85 }}
            >
              รวมข้อมูลสถานที่ ศิลปิน มรดกภูมิปัญญา ชุมชน ผลิตภัณฑ์ และผ้ากับงานช่าง
              ให้ค้นหาตามพื้นที่หรือประเภทข้อมูล พร้อมแหล่งอ้างอิงสำหรับศึกษาเพิ่มเติม
            </Typography>
            <Button
              component={RouterLink}
              href="/cultural-data/"
              variant="contained"
              endIcon={<RiArrowRightLine size={18} />}
              sx={{
                mt: 3,
                px: 2.5,
                py: 1.25,
                bgcolor: '#252d31',
                color: '#fff',
                '&:hover': { bgcolor: '#3d484e' },
              }}
            >
              เริ่มสำรวจวัฒนธรรม
            </Button>
          </Box>
          <Box component="figure" sx={{ m: 0 }}>
            <Box
              component="img"
              src="/assets/background/akhahas-sri-1.jpg"
              alt="ศิลปะการแสดงและผู้คนในพื้นที่วัฒนธรรมไทย"
              sx={{
                display: 'block',
                width: 1,
                height: { xs: 220, md: 290 },
                objectFit: 'cover',
                borderRadius: 2.5,
              }}
            />
            <Typography component="figcaption" sx={{ mt: 1, color: cultureUi.muted, fontSize: 11 }}>
              สถานที่ ผู้คน และวิถีชีวิต คือส่วนหนึ่งของเรื่องราววัฒนธรรม
            </Typography>
          </Box>
        </Box>

        <AboutSystem />

        <Box
          component="section"
          aria-labelledby="about-explore-heading"
          sx={{ borderTop: `1px solid ${cultureUi.border}`, pt: 3, pb: { xs: 4, md: 5 } }}
        >
          <Typography
            id="about-explore-heading"
            component="h2"
            sx={{ fontSize: { xs: 23, md: 27 }, fontWeight: 600, mb: 3 }}
          >
            คุณทำอะไรได้บ้าง
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 3, md: 4 },
            }}
          >
            {FEATURES.map(({ icon: FeatureIcon, title, description, href, action }) => (
              <Box
                key={title}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <FeatureIcon size={24} color={cultureUi.accent} />
                <Typography component="h3" sx={{ mt: 1.5, mb: 1, fontSize: 18, fontWeight: 600 }}>
                  {title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14,
                    color: cultureUi.muted,
                    lineHeight: 1.8,
                    maxWidth: 350,
                    mb: 1.5,
                  }}
                >
                  {description}
                </Typography>
                <Link
                  component={RouterLink}
                  href={href}
                  underline="hover"
                  sx={{
                    mt: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: cultureUi.text,
                  }}
                >
                  {action}
                  <RiArrowRightLine size={16} />
                </Link>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          component="section"
          aria-labelledby="about-sources-heading"
          sx={{
            borderTop: `1px solid ${cultureUi.border}`,
            pt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.5fr' },
            gap: { xs: 3, md: 7 },
          }}
        >
          <Box>
            <Typography
              id="about-sources-heading"
              component="h2"
              sx={{ fontSize: { xs: 23, md: 27 }, fontWeight: 600 }}
            >
              ข้อมูลมาจากไหน
            </Typography>
            <Typography sx={{ mt: 1.5, fontSize: 14, color: cultureUi.muted, lineHeight: 1.8 }}>
              เรานำข้อมูลจากหลายแหล่งมาจัดระเบียบ โดยคงแหล่งอ้างอิงของแต่ละรายการไว้
            </Typography>
            <Typography sx={{ mt: 2, fontSize: 12, color: cultureUi.muted, lineHeight: 1.8 }}>
              รายละเอียดอาจเปลี่ยนแปลงได้ ควรตรวจสอบกับต้นทางก่อนเดินทาง พบข้อมูลคลาดเคลื่อน
              แจ้งทีมงานได้ที่{' '}
              <Link component={RouterLink} href="/contact-us" color="inherit">
                หน้าติดต่อเรา
              </Link>
            </Typography>
          </Box>
          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 3,
            }}
          >
            {SOURCES.map((source) => (
              <Box
                component="li"
                key={source.name}
                sx={{ borderBottom: `1px solid ${cultureUi.border}` }}
              >
                <Link
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'block',
                    py: 2,
                    color: cultureUi.text,
                    '&:hover': { color: cultureUi.accent },
                    '&:focus-visible': {
                      outline: `2px solid ${cultureUi.accent}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600 }}>
                      {source.name}
                    </Typography>
                    <RiExternalLinkLine size={15} style={{ flexShrink: 0 }} />
                  </Stack>
                  <Typography sx={{ mt: 0.5, fontSize: 12, color: cultureUi.muted }}>
                    {source.owner}
                  </Typography>
                  <Typography
                    sx={{ mt: 0.5, fontSize: 12, color: cultureUi.muted, lineHeight: 1.7 }}
                  >
                    {source.detail}
                  </Typography>
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <HomeFooter />
    </Box>
  );
}

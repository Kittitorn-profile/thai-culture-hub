import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

export const metadata: Metadata = { title: `นโยบายความเป็นส่วนตัว - ${CONFIG.appName}` };

const SECTIONS = [
  {
    title: 'ข้อมูลที่เราเก็บ',
    body: 'เว็บไซต์อาจเก็บข้อมูลการใช้งานพื้นฐาน เช่น หน้าที่เข้าชม คำค้นหา ปุ่มที่กด จังหวัดหรืออำเภอที่เลือก referrer และข้อมูลทางเทคนิคของเบราว์เซอร์ เพื่อวิเคราะห์และปรับปรุงประสบการณ์การใช้งาน',
  },
  {
    title: 'คุกกี้และตัวระบุในเบราว์เซอร์',
    body: 'เราใช้ localStorage และ sessionStorage เพื่อจำการยอมรับคุกกี้ สร้าง visitor id/session id สำหรับวิเคราะห์การใช้งาน และจำสถานะบางอย่างบนอุปกรณ์ของผู้ใช้ ข้อมูลนี้ช่วยให้เราเข้าใจภาพรวมการใช้งานโดยไม่จำเป็นต้องให้ผู้ใช้เข้าสู่ระบบ',
  },
  {
    title: 'การกดหัวใจสถานที่',
    body: 'ฟีเจอร์หัวใจใช้ IP address เพื่อป้องกันการนับซ้ำต่อสถานที่ โดยระบบจะแปลง IP เป็นค่า hash ก่อนจัดเก็บ และไม่จัดเก็บ IP ดิบในฐานข้อมูล',
  },
  {
    title: 'ความคิดเห็นและการติดต่อกลับ',
    body: 'เมื่อผู้ใช้ส่งความคิดเห็นผ่านปุ่มแสดงความคิดเห็น เว็บไซต์จะจัดเก็บข้อความ ชื่อและช่องทางติดต่อหากผู้ใช้กรอก หน้าเว็บที่ส่งความคิดเห็น visitor id/session id และข้อมูลทางเทคนิคของเบราว์เซอร์ เพื่อให้ผู้ดูแลระบบตรวจสอบและติดต่อกลับได้ตามความเหมาะสม',
  },
  {
    title: 'การใช้งานข้อมูล',
    body: 'ข้อมูลที่เก็บจะใช้เพื่อวิเคราะห์จำนวนผู้เข้าชม เนื้อหาที่ได้รับความสนใจ ประสิทธิภาพของเว็บไซต์ และปรับปรุงเนื้อหาด้านวัฒนธรรมให้เป็นประโยชน์มากขึ้น',
  },
  {
    title: 'การไม่รวมข้อมูลผู้ดูแลระบบ',
    body: 'เมื่อผู้ดูแลระบบเข้าสู่ระบบ เว็บไซต์จะไม่ส่งข้อมูล analytics จากเบราว์เซอร์นั้น เพื่อให้รายงานสะท้อนพฤติกรรมผู้ใช้งานทั่วไปมากขึ้น',
  },
  {
    title: 'การเปลี่ยนแปลงนโยบาย',
    body: 'เราอาจปรับปรุงนโยบายนี้เมื่อมีการเปลี่ยนแปลงฟีเจอร์ วิธีจัดเก็บข้อมูล หรือข้อกำหนดทางกฎหมาย โดยจะแสดงฉบับล่าสุดบนหน้านี้',
  },
];

const LEGAL_BACKGROUND = 'none';
const LEGAL_PATTERN = 'none';

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: 1,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#f7f7f5',
        backgroundImage: LEGAL_BACKGROUND,
        pt: { xs: 4, md: 6 },
        pb: { xs: 5, md: 8 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: LEGAL_PATTERN,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          position: 'relative',
          p: { xs: 3, md: 5 },
          borderRadius: 2,
          bgcolor: '#fff',
          boxShadow: 'none',
        }}
      >
        <Typography sx={{ color: '#8f3d20', fontSize: 13, fontWeight: 600 }}>
          Thailand Cultural Hub
        </Typography>
        <Typography
          component="h1"
          sx={{
            mt: 1,
            color: '#2a211b',
            fontSize: { xs: 34, md: 48 },
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          นโยบายความเป็นส่วนตัว
        </Typography>
        <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 16, lineHeight: 1.8 }}>
          อัปเดตล่าสุด: 21 มิถุนายน 2026
        </Typography>

        <Stack spacing={3.4} sx={{ mt: 6 }}>
          {SECTIONS.map((section) => (
            <Box key={section.title}>
              <Typography sx={{ color: '#2a211b', fontSize: 22, fontWeight: 600 }}>
                {section.title}
              </Typography>
              <Typography sx={{ mt: 1.2, color: 'text.secondary', fontSize: 15, lineHeight: 1.85 }}>
                {section.body}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

export const metadata: Metadata = { title: `ข้อกำหนดและเงื่อนไข - ${CONFIG.appName}` };

const SECTIONS = [
  {
    title: 'การใช้งานเว็บไซต์',
    body: 'Thailand Cultural Hub จัดทำขึ้นเพื่อรวบรวมและนำเสนอข้อมูลด้านวัฒนธรรม แหล่งท่องเที่ยว ประเพณี ภูมิปัญญา และสถานที่สำคัญในประเทศไทย ผู้ใช้งานควรใช้ข้อมูลเพื่อการเรียนรู้ วางแผนเดินทาง และอ้างอิงเบื้องต้นอย่างเหมาะสม',
  },
  {
    title: 'ความถูกต้องของข้อมูล',
    body: 'เราพยายามดูแลข้อมูลให้ถูกต้องและเป็นปัจจุบัน แต่ข้อมูลจากแหล่งภายนอกอาจมีการเปลี่ยนแปลง เช่น เวลาเปิดทำการ สถานะสถานที่ หรือรายละเอียดกิจกรรม ผู้ใช้งานควรตรวจสอบกับแหล่งข้อมูลทางการก่อนตัดสินใจเดินทางหรือดำเนินการใด ๆ',
  },
  {
    title: 'ทรัพย์สินทางปัญญา',
    body: 'ข้อความ ภาพประกอบ ส่วนติดต่อผู้ใช้ และองค์ประกอบบนเว็บไซต์นี้อาจอยู่ภายใต้ลิขสิทธิ์ของ Thailand Cultural Hub หรือเจ้าของข้อมูลต้นทาง ห้ามคัดลอก ดัดแปลง หรือเผยแพร่ซ้ำเพื่อวัตถุประสงค์เชิงพาณิชย์โดยไม่ได้รับอนุญาต',
  },
  {
    title: 'การเชื่อมโยงไปยังเว็บไซต์ภายนอก',
    body: 'เว็บไซต์อาจมีลิงก์ไปยังแผนที่ แหล่งข้อมูลราชการ หรือเว็บไซต์ภายนอกอื่น ๆ เราไม่สามารถควบคุมเนื้อหา นโยบายความเป็นส่วนตัว หรือความพร้อมใช้งานของเว็บไซต์เหล่านั้นได้',
  },
  {
    title: 'การเปลี่ยนแปลงข้อกำหนด',
    body: 'เราอาจปรับปรุงข้อกำหนดและเงื่อนไขนี้เป็นครั้งคราวเพื่อให้สอดคล้องกับการพัฒนาเว็บไซต์หรือข้อกำหนดทางกฎหมาย โดยจะแสดงฉบับล่าสุดบนหน้านี้',
  },
];

const LEGAL_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
`;
const LEGAL_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: 1,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#7b8476',
        backgroundImage: LEGAL_BACKGROUND,
        pt: { xs: 12, md: 16 },
        pb: { xs: 8, md: 18 },
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
          bgcolor: 'rgba(248,246,238,0.9)',
          boxShadow: '0 24px 70px rgba(32,42,43,0.22)',
          backdropFilter: 'blur(3px)',
        }}
      >
        <Typography sx={{ color: '#8f3d20', fontSize: 13, fontWeight: 900 }}>
          Thailand Cultural Hub
        </Typography>
        <Typography
          component="h1"
          sx={{
            mt: 1,
            color: '#2a211b',
            fontSize: { xs: 34, md: 48 },
            fontWeight: 950,
            lineHeight: 1.05,
          }}
        >
          ข้อกำหนดและเงื่อนไข
        </Typography>
        <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 16, lineHeight: 1.8 }}>
          อัปเดตล่าสุด: 21 มิถุนายน 2026
        </Typography>

        <Stack spacing={3.4} sx={{ mt: 6 }}>
          {SECTIONS.map((section) => (
            <Box key={section.title}>
              <Typography sx={{ color: '#2a211b', fontSize: 22, fontWeight: 900 }}>
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

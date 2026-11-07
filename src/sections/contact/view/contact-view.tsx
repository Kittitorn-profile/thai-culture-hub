'use client';

import { RiMapPinLine, RiChat3Line, RiDatabase2Line } from '@remixicon/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { HomeFooter } from 'src/layouts/main/footer';

import { cultureUi } from 'src/theme/culture-ui';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { ContactMessageForm } from '../contact-message-form';

// ----------------------------------------------------------------------

const CONTACT_TOPICS = [
  {
    icon: RiMapPinLine,
    title: 'แจ้งแก้ไขข้อมูล',
    detail: 'ชื่อสถานที่ พิกัด หรือรายละเอียดที่ไม่ถูกต้อง',
  },
  {
    icon: RiDatabase2Line,
    title: 'แนะนำข้อมูลใหม่',
    detail: 'สถานที่ เรื่องราว หรือแหล่งอ้างอิงที่อยากแบ่งปัน',
  },
  { icon: RiChat3Line, title: 'เสนอแนะการใช้งาน', detail: 'ปัญหาที่พบ หรือสิ่งที่อยากให้ปรับปรุง' },
];

export function ContactView() {
  return (
    <Box sx={{ bgcolor: cultureUi.background, color: cultureUi.text }}>
      <Box
        component="main"
        sx={{
          maxWidth: 1408,
          mx: 'auto',
          px: HOME_SECTION_PX,
          pt: { xs: 4, md: 6 },
          pb: { xs: 5, md: 7 },
        }}
      >
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography sx={{ fontSize: 12, color: cultureUi.muted, mb: 1 }}>
            ติดต่อ Thailand Cultural Hub
          </Typography>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: 32, md: 42 }, fontWeight: 600, lineHeight: 1.4 }}
          >
            คุยกับเรา
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 15, color: cultureUi.muted, lineHeight: 1.8 }}>
            พบข้อมูลคลาดเคลื่อน หรือมีเรื่องอยากแนะนำ ส่งข้อความถึงทีมงานได้ที่นี่
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
            gap: { xs: 4, md: 7 },
            alignItems: 'start',
          }}
        >
          <Box
            component="section"
            aria-labelledby="contact-topics-heading"
            sx={{ borderTop: `1px solid ${cultureUi.border}`, pt: 3 }}
          >
            <Typography
              id="contact-topics-heading"
              component="h2"
              sx={{ fontSize: 20, fontWeight: 600, mb: 2.5 }}
            >
              เราช่วยเรื่องอะไรได้บ้าง
            </Typography>
            <Stack spacing={2.5}>
              {CONTACT_TOPICS.map(({ icon: TopicIcon, title, detail }) => (
                <Stack key={title} direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ color: cultureUi.accent, display: 'flex', pt: 0.25 }}>
                    <TopicIcon size={22} />
                  </Box>
                  <Box>
                    <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600 }}>
                      {title}
                    </Typography>
                    <Typography
                      sx={{ mt: 0.5, fontSize: 13, color: cultureUi.muted, lineHeight: 1.8 }}
                    >
                      {detail}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
            <Typography
              sx={{
                mt: 3,
                pt: 2,
                borderTop: `1px solid ${cultureUi.border}`,
                fontSize: 12,
                color: cultureUi.muted,
                lineHeight: 1.8,
              }}
            >
              หากแจ้งแก้ไขข้อมูล กรุณาแนบชื่อสถานที่หรือลิงก์หน้าที่พบ
              เพื่อให้ทีมงานตรวจสอบได้ตรงจุด
            </Typography>
          </Box>
          <Box
            component="section"
            aria-labelledby="contact-form-heading"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              bgcolor: cultureUi.paper,
              border: `1px solid ${cultureUi.border}`,
              borderRadius: 2.5,
              '& .MuiFormLabel-asterisk': { color: 'error.main' },
            }}
          >
            <Typography
              id="contact-form-heading"
              component="h2"
              sx={{ fontSize: 22, fontWeight: 600 }}
            >
              ส่งข้อความถึงทีมงาน
            </Typography>
            <Typography sx={{ mt: 0.75, mb: 3, color: cultureUi.muted, fontSize: 13 }}>
              กรอกช่องที่มี * ให้ครบ พร้อมช่องทางติดต่อกลับ
            </Typography>
            <ContactMessageForm />
          </Box>
        </Box>
      </Box>
      <HomeFooter />
    </Box>
  );
}

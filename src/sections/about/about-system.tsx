import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { cultureUi } from 'src/theme/culture-ui';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';

import { Logo } from 'src/components/logo';

export function AboutSystem() {
  return (
    <Box
      component="section"
      aria-labelledby="about-system-heading"
      sx={{ borderTop: `1px solid ${cultureUi.border}`, pt: 3, pb: { xs: 4, md: 5 } }}
    >
      <Typography
        component="h2"
        id="about-system-heading"
        sx={{ fontSize: { xs: 23, md: 27 }, fontWeight: 600, mb: 3 }}
      >
        เกี่ยวกับระบบ
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' }, gap: 3 }}>
        <Box
          sx={{
            p: { xs: 2.5, md: 3.5 },
            border: `1px solid ${cultureUi.border}`,
            borderRadius: 2.5,
            bgcolor: cultureUi.paper,
            textAlign: 'center',
          }}
        >
          <Logo
            href="/"
            aria-label="Thailand Cultural Hub — กลับหน้าแรก"
            sx={{
              width: { xs: 200, sm: 240 },
              maxWidth: '100%',
              height: 'auto',
              aspectRatio: '2941 / 1169',
              mb: 3,
              mx: 'auto',
              '& img': { display: 'block', objectFit: 'contain' },
            }}
          />
          <Typography component="h3" sx={{ fontSize: { xs: 21, md: 25 }, fontWeight: 600 }}>
            Thailand Cultural Hub
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 14, color: cultureUi.accent, fontWeight: 500 }}>
            พื้นที่เรียนรู้และร่วมพัฒนาข้อมูลวัฒนธรรมไทย
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 14, color: cultureUi.muted, lineHeight: 1.85 }}>
            ระบบรวบรวมข้อมูลวัฒนธรรมจากหลายแหล่ง ให้ค้นหาตามจังหวัดและประเภทข้อมูล
            พร้อมเปิดดูรายละเอียด ภาพประกอบ และแหล่งอ้างอิงของแต่ละรายการ
          </Typography>
        </Box>
        <Box
          sx={{
            p: { xs: 2.5, md: 3.5 },
            border: `1px solid ${cultureUi.border}`,
            borderRadius: 2.5,
            bgcolor: cultureUi.subtle,
          }}
        >
          <Typography component="h3" sx={{ fontSize: 18, fontWeight: 600 }}>
            ข้อมูลวัฒนธรรม 6 ประเภท
          </Typography>
          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              p: 0,
              my: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.25,
            }}
          >
            {PUBLIC_DATA_GROUPS.map((group) => (
              <Box component="li" key={group.key}>
                <Link
                  component={RouterLink}
                  href={group.href}
                  underline="none"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    height: '100%',
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: cultureUi.paper,
                    color: cultureUi.text,
                    fontSize: 13,
                    lineHeight: 1.65,
                    '&:hover': { color: cultureUi.accent, bgcolor: '#f8faf6' },
                    '&:focus-visible': {
                      outline: `2px solid ${cultureUi.accent}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {group.label}
                  <Box component="span" aria-hidden="true" sx={{ flexShrink: 0 }}>
                    ↗
                  </Box>
                </Link>
              </Box>
            ))}
          </Box>
          <Stack spacing={1} sx={{ pt: 2, borderTop: `1px solid ${cultureUi.border}` }}>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 600 }}>
              สมาชิกช่วยเติมข้อมูล ทีมงานช่วยตรวจสอบ
            </Typography>
            <Typography sx={{ fontSize: 14, color: cultureUi.muted, lineHeight: 1.85 }}>
              สมาชิกเขียนบทความ หรือเสนอแก้ไขข้อมูลและเพิ่มภาพได้ทั้ง 6 ประเภท ติดตามสถานะได้ที่{' '}
              <Link component={RouterLink} href="/creator/contributions/" color="inherit">
                ร่วมพัฒนาข้อมูล
              </Link>{' '}
              โดยข้อเสนอจะผ่านการตรวจสอบก่อนเผยแพร่
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

import {
  RiArrowRightLine,
  RiDatabase2Line,
  RiFolderCheckLine,
  RiGroupLine,
} from '@remixicon/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const STEPS = [
  {
    icon: RiDatabase2Line,
    title: 'รวมเรื่องราวจากหลายแหล่ง',
    description: 'ค้นพบข้อมูลวัฒนธรรม แหล่งท่องเที่ยว และเรื่องราวท้องถิ่นในที่เดียว',
  },
  {
    icon: RiFolderCheckLine,
    title: 'ค้นหาตามพื้นที่และความสนใจ',
    description: 'เลือกจังหวัด อำเภอ หรือหมวดหมู่ พร้อมเปิดดูแหล่งอ้างอิงของข้อมูล',
  },
  {
    icon: RiGroupLine,
    title: 'ร่วมเติมข้อมูลให้สมบูรณ์',
    description: 'ส่งเรื่องเล่าหรือเสนอแก้ไขข้อมูล ให้ทีมงานตรวจสอบก่อนเผยแพร่',
  },
];

export function HomeDataFlowSection() {
  return (
    <Box
      component="section"
      aria-labelledby="home-data-heading"
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 4, md: 6 },
        position: 'relative',
        zIndex: 1,
        color: HOME_TEXT,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: HOME_SECTION_MAX_WIDTH,
          borderTop: '1px solid #dfe3df',
          pt: { xs: 3, md: 4 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3, md: 4 } }}
        >
          <Box sx={{ maxWidth: 660 }}>
            <Typography sx={{ color: '#727b7f', fontSize: 12, mb: 1 }}>
              เบื้องหลังข้อมูลวัฒนธรรม
            </Typography>
            <Typography
              id="home-data-heading"
              component="h2"
              sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 600, lineHeight: 1.4 }}
            >
              จากข้อมูลท้องถิ่น สู่การค้นพบใหม่
            </Typography>
            <Typography sx={{ mt: 1.25, color: '#626a6e', fontSize: 14, lineHeight: 1.8 }}>
              เชื่อมเรื่องราวกับพื้นที่จริง ให้คุณสำรวจต่อได้ง่าย และร่วมดูแลข้อมูลไปกับชุมชน
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            href="/culture-category"
            endIcon={<RiArrowRightLine size={17} />}
            sx={{
              flexShrink: 0,
              color: '#303b40',
              border: '1px solid #d8deda',
              borderRadius: 1.5,
              px: 2.5,
              py: 1,
              fontWeight: 500,
              '&:hover': { bgcolor: '#ecefeb', borderColor: '#aab5ae' },
            }}
          >
            สำรวจข้อมูล
          </Button>
        </Stack>
        <Box
          component="ol"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 3, md: 4 },
            m: 0,
            p: 0,
            listStyle: 'none',
          }}
        >
          {STEPS.map(({ icon: StepIcon, title, description }, index) => (
            <Box component="li" key={title} sx={{ borderTop: '1px solid #dfe3df', pt: 2.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <StepIcon size={24} color="#4e6658" />
                <Typography
                  component="span"
                  sx={{ color: '#929c96', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </Typography>
              </Stack>
              <Typography component="h3" sx={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>
                {title}
              </Typography>
              <Typography
                sx={{ mt: 1, color: '#727b7f', fontSize: 13, lineHeight: 1.8, maxWidth: 360 }}
              >
                {description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

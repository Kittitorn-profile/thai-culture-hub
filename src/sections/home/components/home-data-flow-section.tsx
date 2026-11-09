'use client';

import {
  RiGroupLine,
  RiDatabase2Line,
  RiArrowRightLine,
  RiFolderCheckLine,
} from '@remixicon/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { PublicDatasetGate } from 'src/lib/use-dataset-visibility';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const STEPS = [
  {
    icon: RiDatabase2Line,
    title: 'เรียนรู้จากข้อมูลหลายแหล่ง',
    description: 'สำรวจข้อมูลจากหน่วยงานและแหล่งอ้างอิง พร้อมบทความจากสมาชิก',
  },
  {
    icon: RiFolderCheckLine,
    title: 'ค้นหาตามพื้นที่และความสนใจ',
    description: 'เลือกจังหวัดหรือประเภทข้อมูล แล้วเปิดรายละเอียดและแหล่งอ้างอิง',
  },
  {
    icon: RiGroupLine,
    title: 'ร่วมเติมข้อมูลให้สมบูรณ์',
    description:
      'สมัครสมาชิกเพื่อเขียนบทความ หรือเสนอข้อมูลและภาพเพิ่มเติมได้ทั้ง 6 ประเภท ให้ทีมงานตรวจสอบ',
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
              เรียนรู้และร่วมดูแลข้อมูล
            </Typography>
            <Typography
              id="home-data-heading"
              component="h2"
              sx={{ fontSize: { xs: 23, md: 34 }, fontWeight: 600, lineHeight: 1.4 }}
            >
              ค้นหา เรียนรู้ และร่วมเติมข้อมูล
            </Typography>
            <Typography sx={{ mt: 1.25, color: '#626a6e', fontSize: 14, lineHeight: 1.8 }}>
              อ่านข้อมูลพร้อมที่มา และช่วยเพิ่มเติมสิ่งที่คุณรู้ เพื่อให้ผู้อื่นได้เรียนรู้ต่อ
            </Typography>
          </Box>
          <PublicDatasetGate dataset="places">
            <Button
              component={RouterLink}
              href="/culture-category"
              endIcon={<RiArrowRightLine size={17} />}
              sx={{
                width: { xs: 1, sm: 'auto' },
                minHeight: 44,
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
              เริ่มค้นหาสถานที่
            </Button>
          </PublicDatasetGate>
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

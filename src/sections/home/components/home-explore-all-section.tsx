import type { IconifyName } from 'src/components/iconify/register-icons';

import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const EXPLORE_HIGHLIGHTS: Array<{ icon: IconifyName; title: string; body: string }> = [
  {
    icon: 'solar:file-text-bold',
    title: 'ค้นจากชื่อหรือพื้นที่',
    body: 'ค้นชื่อสถานที่ หรือเลือกจังหวัดเพื่อดูแหล่งวัฒนธรรมในพื้นที่',
  },
  {
    icon: 'solar:add-folder-bold',
    title: 'เลือกหมวดสถานที่',
    body: 'ดูสถานที่ที่เกี่ยวข้องกับอาหาร ประเพณี งานช่าง และภูมิปัญญา',
  },
  {
    icon: 'solar:check-circle-bold',
    title: 'ร่วมเสนอแก้ไข',
    body: 'เปิดรายละเอียดสถานที่ แล้วส่งข้อมูลเพิ่มเติมให้ทีมงานตรวจสอบ',
  },
];

export function HomeExploreAllSection() {
  return (
    <Box
      component="section"
      aria-labelledby="explore-all-heading"
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: HOME_SECTION_MAX_WIDTH,
          display: 'grid',
          gap: { xs: 4, md: 7 },
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' },
        }}
      >
        <Box>
          <Typography
            sx={{
              mb: 1,
              width: 'fit-content',
              color: HOME_TEXT,
              borderRadius: 0,
              bgcolor: 'transparent',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            ค้นหาสถานที่และแหล่งวัฒนธรรม
          </Typography>
          <Typography
            id="explore-all-heading"
            component="h2"
            sx={{
              mt: 1,
              color: HOME_TEXT,
              fontSize: { xs: 23, md: 34 },
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            ค้นหาสถานที่
            <Box component="span" sx={{ display: 'block' }}>
              ตามหมวดที่คุณสนใจ
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              maxWidth: 560,
              color: 'rgba(32,33,36,0.78)',
              lineHeight: 1.8,
              fontSize: 14,
            }}
          >
            ค้นหาสถานที่ตามชื่อ จังหวัด หรือหมวดวัฒนธรรม
            พร้อมรายละเอียดและแหล่งอ้างอิงให้สำรวจต่อได้ในที่เดียว
          </Typography>
          <Button
            component={RouterLink}
            href="/culture-category"
            variant="contained"
            startIcon={<Iconify icon="solar:add-folder-bold" />}
            sx={{
              mt: 2.5,
              py: 1.2,
              px: 2.5,
              borderRadius: 1.5,
              boxShadow: 'none',
              width: { xs: 1, sm: 'auto' },
            }}
          >
            ดูสถานที่ทุกหมวด
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          {EXPLORE_HIGHLIGHTS.map((item) => (
            <Box
              key={item.title}
              sx={{
                pt: 2.5,
                pb: 1,
                borderRadius: 0,
                color: HOME_TEXT,
                bgcolor: 'transparent',
                borderTop: '1px solid rgba(32,33,36,0.2)',
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  mb: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#384740',
                }}
              >
                <Iconify icon={item.icon} width={21} />
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{item.title}</Typography>
              <Typography
                sx={{ mt: 1, color: 'rgba(32,33,36,0.72)', fontSize: 13.5, lineHeight: 1.65 }}
              >
                {item.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

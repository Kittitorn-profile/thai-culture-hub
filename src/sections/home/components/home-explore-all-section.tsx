import type { IconifyName } from 'src/components/iconify/register-icons';

import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { HOME_DEEP, HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const EXPLORE_HIGHLIGHTS: Array<{ icon: IconifyName; title: string; body: string }> = [
  {
    icon: 'solar:file-text-bold',
    title: 'ค้นหาเร็วขึ้น',
    body: 'เริ่มจากจังหวัดแรกเพื่อลดเวลารอโหลด แล้วค่อยขยายเป็นทุกจังหวัดได้',
  },
  {
    icon: 'solar:add-folder-bold',
    title: 'ดูรวมทุกหมวด',
    body: 'รวมสถานที่ ประเพณี อาหาร งานช่าง ภูมิปัญญา และแหล่งเรียนรู้ไว้ในหน้าเดียว',
  },
  {
    icon: 'solar:check-circle-bold',
    title: 'ช่วยแก้ข้อมูล',
    body: 'เมื่อพบข้อมูลคลาดเคลื่อน สามารถเปิดสถานที่และส่งคำขอให้ทีมงานตรวจสอบ',
  },
];

export function HomeExploreAllSection() {
  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 7, md: 9 },
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
          gap: { xs: 3, md: 5 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '0.92fr 1.08fr' },
        }}
      >
        <Box>
          <Typography
            sx={{
              px: 1.4,
              py: 0.6,
              width: 'fit-content',
              color: HOME_TEXT,
              borderRadius: 999,
              bgcolor: 'rgba(42,55,54,0.28)',
              border: '1px solid rgba(255,255,255,0.28)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Explore all data
          </Typography>
          <Typography
            variant="h3"
            sx={{
              mt: 2,
              color: HOME_TEXT,
              fontSize: { xs: 28, md: 44 },
              fontWeight: 950,
              lineHeight: 1.15,
            }}
          >
            ค้นหาสถานที่วัฒนธรรมจากข้อมูลทั้งหมด
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              maxWidth: 560,
              color: 'rgba(248,246,238,0.78)',
              lineHeight: 1.75,
            }}
          >
            เปิดมุมมองรวมเพื่อค้นหาชื่อสถานที่ อำเภอ จังหวัด หรือเลือกจังหวัดก่อนดูรายการ
            เหมาะสำหรับสำรวจข้อมูลและส่งคำขอแก้ไขเมื่อพบรายละเอียดที่ควรปรับปรุง
          </Typography>
          <Button
            component={RouterLink}
            href="/culture-category"
            variant="contained"
            startIcon={<Iconify icon="solar:add-folder-bold" />}
            sx={{ mt: 3, width: { xs: 1, sm: 'auto' } }}
          >
            สำรวจข้อมูลทั้งหมด
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
                p: { xs: 2, md: 2.5 },
                minHeight: 210,
                borderRadius: 1.5,
                color: HOME_TEXT,
                bgcolor: 'rgba(42,55,54,0.3)',
                border: '1px solid rgba(248,246,238,0.2)',
                backdropFilter: 'blur(7px)',
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  mb: 2,
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                  color: HOME_DEEP,
                  bgcolor: 'rgba(248,246,238,0.86)',
                }}
              >
                <Iconify icon={item.icon} width={25} />
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 900 }}>{item.title}</Typography>
              <Typography sx={{ mt: 1, color: 'rgba(248,246,238,0.72)', fontSize: 13.5, lineHeight: 1.65 }}>
                {item.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

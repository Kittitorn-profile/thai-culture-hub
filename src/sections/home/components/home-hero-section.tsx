import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

export function HomeHeroSection() {
  return (
    <Box
      component="section"
      aria-labelledby="home-heading"
      sx={{ px: HOME_SECTION_PX, pt: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}
    >
      <Box
        sx={{
          maxWidth: HOME_SECTION_MAX_WIDTH,
          mx: 'auto',
          minHeight: { xs: 440, sm: 500, md: 560 },
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 2.5, md: 4 },
          bgcolor: '#50575a',
          display: 'flex',
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Box
          component="img"
          src="/assets/th-hub/hub-bg.png"
          alt="ศิลปะและการแสดงวัฒนธรรมไทย"
          fetchPriority="high"
          sx={{
            position: 'absolute',
            inset: 0,
            width: 1,
            height: 1,
            objectFit: 'cover',
            objectPosition: { xs: '60% center', md: 'center' },
            filter: 'saturate(0.55)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(16,22,24,.88), rgba(16,22,24,.45) 55%, rgba(16,22,24,.08))',
          }}
        />
        <Box
          sx={{
            position: 'relative',
            p: { xs: 3, sm: 5, md: 7 },
            maxWidth: 740,
            color: '#fff',
            width: 1,
          }}
        >
          <Typography
            sx={{ mb: 2.5, fontSize: 11, fontWeight: 500, letterSpacing: 1.8, color: '#ffffffba' }}
          >
            THAILAND CULTURAL HUB
          </Typography>
          <Typography
            id="home-heading"
            component="h1"
            sx={{
              fontSize: { xs: 36, sm: 52, md: 64 },
              lineHeight: 1.25,
              letterSpacing: '-0.035em',
              fontWeight: 600,
            }}
          >
            เปิดมุมมองใหม่
            <br />
            ผ่านวัฒนธรรมไทย
          </Typography>
          <Typography
            sx={{
              mt: 2.5,
              maxWidth: 450,
              fontSize: { xs: 16, md: 18 },
              lineHeight: 1.7,
              color: '#ffffffde',
            }}
          >
            สำรวจสถานที่ ประเพณี และภูมิปัญญาท้องถิ่น
            <br />
            ค้นพบเรื่องราวที่ทำให้แต่ละพื้นที่ไม่เหมือนใคร
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 3.5 }}>
            <Button
              component="a"
              href="#explore-map"
              variant="contained"
              sx={{
                px: 3,
                py: 1.4,
                borderRadius: 1.5,
                bgcolor: '#fff',
                color: '#202124',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#e9e9e7' },
              }}
            >
              เริ่มสำรวจวัฒนธรรม
            </Button>
            <Button
              component={RouterLink}
              href="/culture-category"
              sx={{ color: '#fff', fontWeight: 500, px: 1.5, '&:hover': { bgcolor: '#ffffff14' } }}
            >
              เลือกหมวดที่สนใจ{' '}
              <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>
                →
              </Box>
            </Button>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          maxWidth: HOME_SECTION_MAX_WIDTH,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          gap: { xs: 4, md: 8 },
          pt: { xs: 5, md: 7 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontSize: { xs: 27, md: 36 }, fontWeight: 600, lineHeight: 1.3, mb: 2 }}
          >
            รู้จักไทยให้ใกล้กว่าเดิม
          </Typography>
          <Typography sx={{ maxWidth: 510, color: '#62666a', lineHeight: 1.85, fontSize: 15 }}>
            Thailand Cultural Hub รวมเรื่องราววัฒนธรรมจากท้องถิ่นให้ค้นหาได้ในที่เดียว
            เริ่มจากจังหวัดที่คุณสนใจ แล้วทำความรู้จักสถานที่ วิถีชีวิต อาหาร และงานศิลป์
            ผ่านข้อมูลที่เชื่อมโยงกับพื้นที่จริง
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: { xs: 2, md: 4 },
            rowGap: 3,
            alignContent: 'center',
          }}
        >
          {[
            ['สถานที่', 'แหล่งเรียนรู้และมรดกท้องถิ่น'],
            ['ประเพณี', 'วิถีชีวิตที่ส่งต่อกันมา'],
            ['ภูมิปัญญา', 'ความรู้จากผู้คนในชุมชน'],
            ['เรื่องเล่า', 'มุมมองจากคนในพื้นที่'],
          ].map(([title, detail]) => (
            <Box key={title} sx={{ borderTop: '1px solid #dfe3df', pt: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 19, md: 23 }, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography sx={{ color: '#74777a', fontSize: 13, lineHeight: 1.7 }}>
                {detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

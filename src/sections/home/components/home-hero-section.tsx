import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Image } from 'src/components/image';

import {
  HOME_TEXT,
  HOME_SECTION_PX,
  HOME_HIGHLIGHTS,
  POSTER_FRAME_IMAGES,
  HOME_SECTION_MAX_WIDTH,
} from './home-constants';

export function HomeHeroSection() {
  return (
    <Box
      sx={{
        minHeight: { xs: 780, md: 860 },
        position: 'relative',
        display: 'grid',
        overflow: 'hidden',
        px: HOME_SECTION_PX,
        py: { xs: 5, md: 8 },
        zIndex: 1,
      }}
    >
      {POSTER_FRAME_IMAGES.map((image) => (
        <Box
          key={image.src}
          sx={{
            p: { xs: 0.7, md: 1 },
            zIndex: 1,
            opacity: { xs: 0.64, md: 0.78 },
            overflow: 'hidden',
            position: 'absolute',
            borderRadius: 1,
            filter: 'saturate(0.78) sepia(0.12)',
            ...image.sx,
          }}
        >
          <Image
            src={image.src}
            alt={image.alt}
            ratio="4/3"
            visibleByDefault
            disablePlaceholder
            sx={{
              width: 1,
              borderRadius: 0.75,
              '& img': { objectFit: 'cover' },
            }}
          />
        </Box>
      ))}

      <Box
        sx={{
          zIndex: 2,
          width: 1,
          mx: 'auto',
          maxWidth: HOME_SECTION_MAX_WIDTH,
          position: 'relative',
          textAlign: 'center',
          color: HOME_TEXT,
          textShadow: '0 3px 16px rgba(40,48,48,0.34)',
        }}
      >
        <Stack
          spacing={1.2}
          alignItems="center"
          sx={{
            mt: { xs: 7, md: 14 },
            mx: 'auto',
            maxWidth: 670,
          }}
        >
          <Image
            alt="Single logo"
            sx={{
              width: { xs: 300, md: 200 },
              mb: { xs: 0.5, md: 4 },
            }}
            src="/logo/logo-single.png"
          />

          <Typography
            component="p"
            sx={{
              fontSize: { xs: 13, md: 15 },
              fontWeight: 800,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.88)',
            }}
          >
            Explore Thai Cultural Heritage
          </Typography>

          <Typography
            component="h1"
            sx={{
              maxWidth: 610,
              color: HOME_TEXT,
              fontWeight: 800,
              lineHeight: 0.92,
              fontSize: { xs: 52, sm: 96, md: 132 },
              textShadow: '0 5px 22px rgba(32,42,43,0.36)',
            }}
          >
            Thailand
            <Box
              component="span"
              sx={{
                display: 'block',
                color: 'rgba(248,246,238,0.82)',
                mt: { xs: -0.7, md: -1.4 },
              }}
            >
              Cultural Hub
            </Box>
          </Typography>

          <Typography
            sx={{
              maxWidth: 540,
              mx: 'auto',
              mt: { xs: 1, md: 1.5 },
              color: 'rgba(255,255,255,0.86)',
              fontSize: { xs: 16, md: 19 },
              lineHeight: 1.65,
            }}
          >
            สำรวจข้อมูลวัฒนธรรมไทยรายจังหวัด ผ่านแผนที่ สถานที่สำคัญ ประเพณี ภูมิปัญญา
            อาหารพื้นถิ่น และแหล่งข้อมูลที่ตรวจสอบย้อนกลับได้
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: { xs: 4, md: 20 },
            display: 'grid',
            gap: { xs: 2, md: 4 },
            alignItems: 'end',
            textAlign: { xs: 'left', md: 'left' },
            gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' },
          }}
        >
          <Box
            sx={{
              p: { xs: 2, md: 0 },
              borderRadius: { xs: 1.5, md: 0 },
              bgcolor: { xs: 'rgba(42,55,54,0.24)', md: 'transparent' },
              border: { xs: '1px solid rgba(255,255,255,0.18)', md: 'none' },
              backdropFilter: { xs: 'blur(5px)', md: 'none' },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 13, md: 32 },
                fontWeight: { xs: 800, md: 800 },
                letterSpacing: { xs: 0.8, md: 0 },
                textTransform: { xs: 'uppercase', md: 'none' },
                lineHeight: 1.35,
                color: { xs: 'rgba(234,215,161,0.9)', md: 'rgba(255,255,255,0.92)' },
              }}
            >
              ภาพรวมวัฒนธรรมรายจังหวัด
            </Typography>

            <Typography
              sx={{
                mt: { xs: 1, md: 2 },
                color: '#ffffff',
                fontSize: { xs: 24, sm: 30, md: 46 },
                fontWeight: 900,
                lineHeight: { xs: 1.18, md: 1.2 },
              }}
            >
              สำรวจพื้นที่ วัฒนธรรม และเรื่องเล่าท้องถิ่น
            </Typography>

            <Stack
              direction="row"
              spacing={0.8}
              sx={{
                mt: { xs: 1.5, md: 1.25 },
                flexWrap: 'wrap',
                rowGap: 0.8,
              }}
            >
              {['แผนที่', 'อำเภอ', 'หมวดหมู่', 'แหล่งอ้างอิง'].map((label) => (
                <Chip
                  key={label}
                  size="small"
                  label={label}
                  sx={{
                    color: HOME_TEXT,
                    fontWeight: 800,
                    bgcolor: 'rgba(248,246,238,0.13)',
                    border: '1px solid rgba(248,246,238,0.18)',
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Stack
            sx={{
              justifySelf: { xs: 'center', md: 'end' },
              width: { xs: 1, md: 380 },
              display: 'grid',
              gap: { xs: 1, md: 1.2 },
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))', md: '1fr' },
              p: { xs: 0, md: 2.5 },
              borderRadius: 1,
              color: HOME_TEXT,
              textAlign: 'left',
              bgcolor: { xs: 'transparent', md: 'rgba(42,55,54,0.28)' },
              border: { xs: 'none', md: '1px solid rgba(255,255,255,0.28)' },
              backdropFilter: { xs: 'none', md: 'blur(6px)' },
            }}
          >
            {HOME_HIGHLIGHTS.map((item) => (
              <Stack
                key={item.title}
                direction={{ xs: 'row', md: 'row' }}
                spacing={1.2}
                sx={{
                  p: { xs: 1.4, md: 0 },
                  minHeight: { xs: 88, md: 'auto' },
                  borderRadius: { xs: 1.25, md: 0 },
                  bgcolor: { xs: 'rgba(42,55,54,0.24)', md: 'transparent' },
                  border: { xs: '1px solid rgba(255,255,255,0.16)', md: 'none' },
                }}
              >
                <Typography
                  sx={{
                    color: { xs: 'rgba(234,215,161,0.92)', md: 'rgba(255,255,255,0.68)' },
                    fontSize: { xs: 15, md: 18 },
                    fontWeight: 800,
                    lineHeight: 1.25,
                    minWidth: { xs: 24, md: 28 },
                  }}
                >
                  {item.icon}
                </Typography>
                <Box>
                  <Typography sx={{ fontSize: { xs: 14, md: 17 }, fontWeight: 900 }}>
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.35,
                      color: 'rgba(255,255,255,0.72)',
                      fontSize: { xs: 12, md: 13 },
                      lineHeight: 1.55,
                    }}
                  >
                    {item.body}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

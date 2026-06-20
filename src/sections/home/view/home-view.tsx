'use client';

import { useState } from 'react';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import ThailandMap from './thailand-map';

// ----------------------------------------------------------------------

// const ReactPlayer = dynamic(() => import('react-player'), {
//   ssr: false,
//   loading: () => null,
// });

const HOME_BG_TOP = '#6f8790';
const HOME_BG_MIDDLE = '#7b8476';
const HOME_BG_BOTTOM = '#8f7c5c';
const HOME_TEXT = '#f8f6ee';
const HOME_DEEP = '#2a3736';
const HOME_SECTION_MAX_WIDTH = 1280;
const HOME_SECTION_PX = { xs: 2.5, sm: 4, md: 6, lg: 8 };
const HOME_SHARED_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${HOME_BG_TOP} 0%, ${HOME_BG_MIDDLE} 54%, ${HOME_BG_BOTTOM} 100%)
`;
const HOME_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

const POSTER_FRAME_IMAGES = [
  {
    src: '/assets/th-hub/bg-1.png',
    alt: 'การแสดงศิลปวัฒนธรรมไทย',
    sx: {
      top: { xs: 0, md: -12 },
      left: { xs: 0, md: -10 },
      width: { xs: 190, sm: 240, md: 1200 },
      // rotate: '-10deg',
    },
  },
  // {
  //   src: '/assets/th-hub/bg-right.png',
  //   alt: 'เครื่องแต่งกายและภูมิปัญญาไทย',
  //   sx: {
  //     right: { xs: -104, md: 0 },
  //     top: { xs: 38, md: 0 },
  //     width: { xs: 190, sm: 246, md: 850 },
  //   },
  // },
];

const highlights = [
  {
    icon: '01',
    title: 'ประเพณีและพิธีกรรม',
    body: 'เรื่องเล่าของชุมชน ฤดูกาล ความเชื่อ และวิถีชีวิตที่สืบทอดจากรุ่นสู่รุ่น',
  },
  {
    icon: '02',
    title: 'ภูมิปัญญาและหัตถกรรม',
    body: 'งานจักสาน ผ้าทอ เครื่องมือพื้นถิ่น และทักษะช่างที่สะท้อนตัวตนของพื้นที่',
  },
  {
    icon: '03',
    title: 'ดนตรีและการแสดง',
    body: 'เสียงเพลง ท่ารำ เครื่องแต่งกาย และเวทีชุมชนที่ทำให้วัฒนธรรมยังมีชีวิต',
  },
];

const ROYAL_IMAGE_ITEMS = [
  {
    title: 'สถานที่ท่องเที่ยว',
    description: 'แหล่งท่องเที่ยว วัด เมืองเก่า และจุดหมายสำคัญทางวัฒนธรรม',
    icon: 'custom:location-fill',
    src: '/assets/background/akhahas-sri-1.jpg',
    color: '#608D8C',
  },
  {
    title: 'อาหารพื้นบ้าน',
    description: 'รสชาติท้องถิ่น วัตถุดิบตามฤดูกาล และครัวชุมชนไทย',
    icon: 'solar:tea-cup-bold',
    src: '/assets/background/akhahas-sri-2.jpg',
    color: '#D19F46',
  },
  {
    title: 'ศิลปะการแสดง',
    description: 'นาฏศิลป์ ดนตรีไทย การแสดงพื้นบ้านที่งดงามและทรงคุณค่า',
    icon: 'solar:palette-bold',
    src: '/assets/background/akhahas-sri-3.jpg',
    color: '#CE7B48',
  },
  {
    title: 'ประเพณีท้องถิ่น',
    description: 'เทศกาล งานบุญ และขนบธรรมเนียมที่สืบทอดในแต่ละพื้นที่',
    icon: 'solar:confetti-minimalistic-outline',
    src: '/assets/background/akhahas-sri-4.jpg',
    color: '#947488',
  },
  {
    title: 'ภูมิปัญญาชุมชน',
    description: 'ความรู้ท้องถิ่น วิธีคิด และทักษะที่เกิดจากชีวิตในชุมชน',
    icon: 'solar:notebook-bold-duotone',
    src: '/assets/background/akhahas-sri-5.jpg',
    color: '#7E9578',
  },
  {
    title: 'งานช่างฝีมือ',
    description: 'งานจักสาน ผ้าทอ เครื่องปั้น และฝีมือช่างพื้นถิ่น',
    icon: 'solar:settings-bold',
    src: '/assets/background/akhahas-sri-6.jpg',
    color: '#5B7B91',
  },
  {
    title: 'ศิลปะพื้นบ้าน',
    description: 'ลวดลาย สีสัน เครื่องแต่งกาย และงานศิลป์จากชุมชน',
    icon: 'solar:gallery-wide-bold',
    src: '/assets/background/akhahas-sri-7.jpg',
    color: '#AB8395',
  },
  {
    title: 'พิธีกรรม',
    description: 'ความเชื่อ พิธีบูชา และเรื่องเล่าศักดิ์สิทธิ์ของท้องถิ่น',
    icon: 'solar:shield-check-bold',
    src: '/assets/akhahas-sri/hero-1.jpg',
    color: '#B2865A',
  },
] as const;

const VIDEO_ITEMS = [
  {
    title: 'ดนตรีพื้นบ้านและการแสดงร่วมสมัย',
    src: 'https://www.youtube.com/watch?v=hZB0LIYLSgM&list=RDhZB0LIYLSgM&start_radio=1',
    cover: 'https://img.youtube.com/vi/hZB0LIYLSgM/maxresdefault.jpg',
  },
  {
    title: 'เวทีวัฒนธรรมและพลังของเยาวชน',
    src: 'https://www.youtube.com/watch?v=S1twzNXRbCY&list=RDS1twzNXRbCY&start_radio=1&t=1076s',
    cover: 'https://img.youtube.com/vi/S1twzNXRbCY/maxresdefault.jpg',
  },
  {
    title: 'บทเพลง พิธีกรรม และเรื่องเล่าท้องถิ่น',
    src: 'https://www.youtube.com/watch?v=gxiq1n3JOT8&list=RDgxiq1n3JOT8&start_radio=1',
    cover: 'https://img.youtube.com/vi/gxiq1n3JOT8/maxresdefault.jpg',
  },
  {
    title: 'วัฒนธรรมอีสานในภาษาภาพและเสียง',
    src: 'https://www.youtube.com/watch?v=Zr1H0ultIQ8',
    cover: 'https://img.youtube.com/vi/Zr1H0ultIQ8/maxresdefault.jpg',
  },
];

function PlayButton({ small = false }: { small?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        width: small ? 34 : 48,
        height: small ? 34 : 48,
        display: 'grid',
        borderRadius: '50%',
        color: HOME_TEXT,
        placeItems: 'center',
        border: '2px solid rgba(234,215,161,0.88)',
        backgroundColor: 'rgba(42,55,54,0.58)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.34), 0 0 20px rgba(217,181,109,0.14)',
        '&::before': {
          content: '""',
          width: 0,
          height: 0,
          ml: '3px',
          borderTop: `${small ? 6 : 8}px solid transparent`,
          borderBottom: `${small ? 6 : 8}px solid transparent`,
          borderLeft: `${small ? 9 : 13}px solid currentColor`,
        },
      }}
    />
  );
}

export function HomeView() {
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<(typeof VIDEO_ITEMS)[number] | null>(null);
  const [selectedImage, setSelectedImage] = useState<(typeof ROYAL_IMAGE_ITEMS)[number] | null>(
    null
  );

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setVideoPreviewKey((prev) => prev + 1);
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        color: HOME_TEXT,
        overflow: 'hidden',
        bgcolor: HOME_BG_MIDDLE,
        position: 'relative',
        backgroundImage: HOME_SHARED_BACKGROUND,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: HOME_POSTER_PATTERN,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Box
        sx={{
          minHeight: { xs: 780, md: 860 },
          position: 'relative',
          display: 'grid',
          overflow: 'hidden',
          px: HOME_SECTION_PX,
          py: { xs: 11, md: 8 },
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
              // bgcolor: 'rgba(229,218,194,0.52)',
              // border: '1px solid rgba(255,255,255,0.34)',
              // boxShadow: '0 28px 70px rgba(43,54,50,0.28)',
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
                width: { xs: 96, md: 200 },
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
                fontSize: { xs: 70, sm: 96, md: 132 },
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
              สำรวจรากเหง้า วิถีชีวิต ประเพณี อาหารพื้นถิ่น หัตถกรรม ภาษา
              และความหลากหลายของชุมชนไทยผ่านเรื่องเล่าและแผนที่ Interactive
            </Typography>
          </Stack>

          <Box
            sx={{
              mt: { xs: 6, md: 20 },
              display: 'grid',
              gap: { xs: 2.4, md: 4 },
              alignItems: 'end',
              textAlign: { xs: 'center', md: 'left' },
              gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: 22, md: 31 },
                  fontWeight: 800,
                  lineHeight: 1.35,
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                จากภูเขาถึงทะเล จากเมืองเก่าสู่ชุมชนร่วมสมัย
              </Typography>

              <Typography
                sx={{
                  mt: 2,
                  color: '#ffffff',
                  fontSize: { xs: 32, md: 46 },
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                มรดกไทยที่ยังมีชีวิต
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: 'rgba(255,255,255,0.84)',
                  fontSize: { xs: 18, md: 23 },
                  fontWeight: 700,
                }}
              >
                ประเพณี • อาหาร • หัตถกรรม • ภาษา • ดนตรี • การแสดง
              </Typography>
            </Box>

            <Stack
              spacing={1.2}
              sx={{
                justifySelf: { xs: 'center', md: 'end' },
                width: { xs: 1, sm: 420, md: 380 },
                p: { xs: 2, md: 2.5 },
                borderRadius: 1,
                color: HOME_TEXT,
                textAlign: 'left',
                bgcolor: 'rgba(42,55,54,0.28)',
                border: '1px solid rgba(255,255,255,0.28)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {highlights.map((item) => (
                <Stack key={item.title} direction="row" spacing={1.6}>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.68)',
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1.25,
                      minWidth: 28,
                    }}
                  >
                    {item.icon}
                  </Typography>
                  <Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{item.title}</Typography>
                    <Typography sx={{ mt: 0.35, color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                      {item.body}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          scrollMarginTop: 96,
          px: HOME_SECTION_PX,
          zIndex: 1,
        }}
      >
        <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
          <ThailandMap />
        </Box>
      </Box>

      <Box
        sx={{
          px: HOME_SECTION_PX,
          py: { xs: 7, md: 10 },
          minHeight: 800,
          position: 'relative',
          overflow: 'hidden',
          scrollMarginTop: 96,
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            maxWidth: HOME_SECTION_MAX_WIDTH,
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" sx={{ color: HOME_TEXT }}>
            ประเพณีไทยในจังหวะชีวิตของชุมชน
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mt: 1.4, color: 'rgba(248,246,238,0.82)', textAlign: 'center' }}
          >
            ประเพณีไทยไม่ได้เป็นเพียงพิธีในปฏิทิน แต่คือความสัมพันธ์ระหว่างผู้คน ธรรมชาติ ความเชื่อ
            และชุมชน ตั้งแต่สงกรานต์ ลอยกระทง บุญบั้งไฟ งานแห่เทียน ไปจนถึงพิธีเล็ก ๆ
            ในท้องถิ่นที่บอกว่าแต่ละพื้นที่มองโลกอย่างไร
          </Typography>

          <Box
            sx={{
              mt: { xs: 4, md: 6 },
              display: 'grid',
              gap: { xs: 1.8, md: 2 },
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {ROYAL_IMAGE_ITEMS.map((image) => (
              <Box
                key={image.src}
                component="button"
                type="button"
                aria-label={`ดูภาพ ${image.title}`}
                onClick={() => setSelectedImage(image)}
                sx={{
                  p: 0,
                  m: 0,
                  width: 1,
                  minHeight: 230,
                  display: 'grid',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 1.5,
                  color: HOME_DEEP,
                  gridTemplateRows: '100px 1fr',
                  bgcolor: 'rgba(250,244,232,0.94)',
                  position: 'relative',
                  boxShadow: '0 18px 44px rgba(44,35,21,0.2)',
                  border: '1px solid rgba(255,255,255,0.64)',
                  transition: 'transform 180ms ease, box-shadow 180ms ease',
                  '&:focus-visible': {
                    outline: `2px solid ${HOME_TEXT}`,
                    outlineOffset: 4,
                  },
                  '&:hover, &:focus-visible': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 24px 56px rgba(44,35,21,0.28)',
                  },
                  '&:hover .culture-category-image, &:focus-visible .culture-category-image': {
                    transform: 'scale(1.06)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 1,
                    height: 100,
                    overflow: 'hidden',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(42,55,54,0.02) 0%, rgba(42,55,54,0.28) 100%)',
                    },
                  }}
                >
                  <Image
                    alt={image.title}
                    src={image.src}
                    className="culture-category-image"
                    ratio="16/9"
                    sx={{
                      width: 1,
                      height: 1,
                      transition: 'transform 240ms ease',
                      '& img': { objectFit: 'cover' },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    top: 76,
                    left: '50%',
                    width: 56,
                    height: 56,
                    zIndex: 1,
                    display: 'grid',
                    borderRadius: '50%',
                    placeItems: 'center',
                    position: 'absolute',
                    color: HOME_TEXT,
                    bgcolor: image.color,
                    transform: 'translateX(-50%)',
                    border: '3px solid rgba(250,244,232,0.95)',
                    boxShadow: '0 12px 28px rgba(49,35,20,0.22)',
                  }}
                >
                  <Iconify icon={image.icon} width={27} />
                </Box>

                <Box
                  sx={{
                    px: 2,
                    pt: 4.8,
                    pb: 2,
                    display: 'flex',
                    minHeight: 130,
                    textAlign: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background:
                      'linear-gradient(180deg, rgba(255,251,242,0.98) 0%, rgba(241,232,214,0.96) 100%)',
                  }}
                >
                  <Typography
                    sx={{
                      color: '#4b3523',
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1.2,
                    }}
                  >
                    {image.title}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.8,
                      color: 'rgba(75,53,35,0.78)',
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {image.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          px: HOME_SECTION_PX,
          py: { xs: 8, md: 12 },
          minHeight: 670,
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            gap: { xs: 6, md: 5 },
            maxWidth: HOME_SECTION_MAX_WIDTH,
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '0.88fr 1.12fr' },
          }}
        >
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(248,246,238,0.1)',
                border: '1px solid rgba(248,246,238,0.22)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              }}
            >
              <Box
                sx={{
                  width: 1,
                  aspectRatio: '16 / 9',
                  height: { xs: 200, md: 350 },
                  overflow: 'hidden',
                  borderRadius: 1,
                  bgcolor: HOME_DEEP,
                  '& .react-player__preview': {
                    borderRadius: 1,
                  },
                  '& .react-player__shadow': {
                    bgcolor: 'rgba(42,55,54,0.58)',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                  },
                }}
              >
                {/* <ReactPlayer
                  src="https://www.youtube.com/watch?v=76jSHW8-Sug&t=5s"
                  light="https://img.youtube.com/vi/76jSHW8-Sug/maxresdefault.jpg"
                  width="100%"
                  height="100%"
                  playIcon={<PlayButton small />}
                  // previewAriaLabel={`ดูวิดีโอ ${video.title}`}
                  // onClickPreview={() => setSelectedVideo(video)}
                /> */}
              </Box>
            </Box>
          </Box>

          <Box>
            <Typography
              component="h2"
              sx={{
                color: HOME_TEXT,
                maxWidth: 520,
                fontSize: { xs: 42, sm: 58, md: 68 },
                fontWeight: 800,
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              หัตถกรรมและภูมิปัญญาไทย
            </Typography>

            <Typography
              sx={{
                mt: 4,
                maxWidth: 430,
                color: 'rgba(248,246,238,0.82)',
                lineHeight: 1.75,
              }}
            >
              งานจักสาน ผ้าทอ เครื่องปั้น เครื่องเงิน เครื่องไม้ และอาหารพื้นถิ่น
              คือหลักฐานของความรู้ที่เกิดจากการอยู่ร่วมกับภูมิประเทศ วัสดุ และฤดูกาล
              ภูมิปัญญาเหล่านี้ไม่ได้หยุดอยู่ในอดีต แต่ยังปรับตัวกับชีวิตร่วมสมัย ทั้งในบ้าน ในตลาด
              ในงานออกแบบ และในพื้นที่การเรียนรู้ของคนรุ่นใหม่
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontStyle: 'italic',
                mt: 3,
              }}
            >
              &quot;ภูมิปัญญาไทย คือความงามที่ใช้งานได้จริง&quot;
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontStyle: 'italic',
                mt: 3,
              }}
            >
              มองวัฒนธรรมผ่านวัสดุ ฝีมือ และวิธีคิดของชุมชน
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: HOME_SECTION_PX,
          py: { xs: 8, md: 12 },
          minHeight: 700,
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            gap: { xs: 6, md: 5 },
            maxWidth: HOME_SECTION_MAX_WIDTH,
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '0.88fr 1.12fr' },
          }}
        >
          <Box>
            <Typography
              component="h2"
              sx={{
                color: HOME_TEXT,
                maxWidth: 520,
                fontSize: { xs: 42, sm: 58, md: 68 },
                fontWeight: 800,
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              ดนตรี การแสดง และเรื่องเล่าของไทย
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4.5 }}>
              <PlayButton small />
              <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                รับชมเรื่องราว
              </Typography>
            </Stack>

            <Typography
              sx={{
                mt: 4,
                maxWidth: 430,
                color: 'rgba(248,246,238,0.82)',
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              ดนตรีและการแสดงพื้นบ้านเป็นภาษาที่ชุมชนใช้เล่าความทรงจำ ความศรัทธา และความสนุกสนาน
              ไม่ว่าจะเป็นเสียงแคน กลองยาว โปงลาง ลิเก มโนราห์ หรือท่ารำในงานบุญ
              ทุกเวทีคือพื้นที่ที่อดีตและปัจจุบันได้พบกัน
            </Typography>
          </Box>

          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {VIDEO_ITEMS.map((video, index) => (
              <Box
                key={`${video.title}-${index}`}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(248,246,238,0.1)',
                  border: '1px solid rgba(248,246,238,0.22)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                }}
              >
                <Box
                  sx={{
                    width: 1,
                    aspectRatio: '16 / 9',
                    overflow: 'hidden',
                    borderRadius: 1,
                    bgcolor: HOME_DEEP,
                    '& .react-player__preview': {
                      borderRadius: 1,
                    },
                    '& .react-player__shadow': {
                      bgcolor: 'rgba(42,55,54,0.58)',
                      boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                    },
                  }}
                >
                  {/* <ReactPlayer
                    key={`${video.title}-${videoPreviewKey}`}
                    src={video.src}
                    light={video.cover}
                    width="100%"
                    height="100%"
                    playIcon={<PlayButton small />}
                    previewAriaLabel={`ดูวิดีโอ ${video.title}`}
                    onClickPreview={() => setSelectedVideo(video)}
                  /> */}
                </Box>

                <Typography
                  sx={{
                    mt: 1.25,
                    px: 0.5,
                    color: HOME_TEXT,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {video.title}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: HOME_SECTION_PX,
          py: { xs: 7, md: 10 },
          minHeight: 400,
          position: 'relative',
          overflow: 'hidden',
          scrollMarginTop: 96,
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            maxWidth: HOME_SECTION_MAX_WIDTH,
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" sx={{ color: HOME_TEXT }}>
            ข้อมูล
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mt: 1.4, color: 'rgba(248,246,238,0.82)', textAlign: 'center' }}
          >
            ประเพณีไทยไม่ได้เป็นเพียงพิธีในปฏิทิน แต่คือความสัมพันธ์ระหว่างผู้คน ธรรมชาติ ความเชื่อ
            และชุมชน ตั้งแต่สงกรานต์ ลอยกระทง บุญบั้งไฟ งานแห่เทียน ไปจนถึงพิธีเล็ก ๆ
            ในท้องถิ่นที่บอกว่าแต่ละพื้นที่มองโลกอย่างไร
          </Typography>

          <Box
            sx={{
              mt: 7,
              display: 'grid',
              gap: { xs: 2.2, sm: 2.5 },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            กกกกหก
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          width: 1000,
          p: { xs: 0.7, md: 1 },
          zIndex: 0,
          opacity: { xs: 0.64, md: 0.78 },
          overflow: 'hidden',
          position: 'absolute',
          bottom: -140,
          right: -110,
          borderRadius: 1,
          filter: 'saturate(0.78) sepia(0.12)',
        }}
      >
        <Image
          src="/assets/th-hub/hub-bg-removebg.png"
          alt="การแสดงศิลปวัฒนธรรมไทย"
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

      <HomeFooter />

      <Dialog
        fullWidth
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        slotProps={{
          paper: {
            sx: {
              overflow: 'hidden',
              bgcolor: HOME_DEEP,
              borderRadius: 1.5,
              border: '1px solid rgba(234,215,161,0.24)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            color: HOME_TEXT,
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{selectedImage?.title}</Typography>

          <IconButton onClick={() => setSelectedImage(null)} sx={{ color: 'inherit' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <DialogContent sx={{ py: 3, bgcolor: HOME_DEEP, width: 'auto' }}>
          {selectedImage && (
            <Box
              component="img"
              alt={selectedImage.title}
              src={selectedImage.src}
              sx={{
                width: 1,
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                maxHeight: { xs: '78vh', md: '82vh' },
                bgcolor: HOME_DEEP,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* <Dialog
        fullWidth
        maxWidth="lg"
        open={!!selectedVideo}
        onClose={handleCloseVideo}
        slotProps={{
          paper: {
            sx: {
              overflow: 'hidden',
              bgcolor: HOME_DEEP,
              borderRadius: 1.5,
              border: '1px solid rgba(234,215,161,0.24)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            color: HOME_TEXT,
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{selectedVideo?.title}</Typography>

          <IconButton onClick={handleCloseVideo} sx={{ color: 'inherit' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          <Box sx={{ width: 1, aspectRatio: '16 / 9' }}>
            {selectedVideo && (
              <ReactPlayer controls playing src={selectedVideo.src} width="100%" height="100%" />
            )}
          </Box>
        </DialogContent>
      </Dialog> */}
    </Box>
  );
}

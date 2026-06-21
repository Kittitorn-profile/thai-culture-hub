'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import ThailandMap from './thailand-map';
import { HomePopupBanner } from '../components/home-popup-banner';

// ----------------------------------------------------------------------

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

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
      left: { xs: -10, md: -10 },
      width: { xs: 400, sm: 600, md: 1200 },
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
    title: 'ค้นจากแผนที่จังหวัด',
    body: 'เลือกจังหวัดเพื่อดูสถานที่ วัฒนธรรม และหมวดข้อมูลที่เชื่อมกับพื้นที่จริง',
  },
  {
    icon: '02',
    title: 'รวมข้อมูลหลายแหล่ง',
    body: 'จัดกลุ่มข้อมูลจาก ททท. กรมศิลปากร และบัญชีข้อมูลวัฒนธรรมให้สำรวจง่ายขึ้น',
  },
  {
    icon: '03',
    title: 'ดูตามอำเภอและหมวดหมู่',
    body: 'แยกสถานที่ ประเพณี อาหาร หัตถกรรม การแสดง และภูมิปัญญาตามบริบทท้องถิ่น',
  },
];

type CultureCategoryCard = {
  categoryKey: string;
  title: string;
  description: string;
  icon: IconifyName;
  src: string;
  color: string;
};

type HomeVideoItem = {
  title: string;
  src: string;
  cover: string;
};

type StoryContent = {
  title: string;
  actionLabel: string;
  body: string;
};

type LocalWisdomContent = {
  title: string;
  body: string;
  quote: string;
  caption: string;
  mediaUrl: string;
  coverUrl: string;
};

type CultureCategoriesContent = {
  title: string;
  description: string;
};

type StoredHomeContent = {
  story?: StoryContent;
  mediaItems?: Array<{
    title: string;
    description?: string;
    url: string;
    coverUrl: string;
    isActive?: boolean;
  }>;
};

type StoredCultureCategoriesContent = {
  content?: CultureCategoriesContent;
  items?: Array<{
    title: string;
    description: string;
    imageUrl: string;
    icon: IconifyName;
    color: string;
    isActive?: boolean;
  }>;
};

type HomeAnalyticsSummary = {
  days: number;
  pageViews: number;
  visitors: number;
  sessions: number;
  topSearches: Array<{ name: string; count: number; visitors: number }>;
  topProvinces: Array<{ name: string; count: number; visitors: number }>;
  topDistricts: Array<{ name: string; count: number; visitors: number }>;
};

const STORY_MEDIA_SECTION_KEY = 'story-media';
const LOCAL_WISDOM_SECTION_KEY = 'local-wisdom';
const CULTURE_CATEGORIES_SECTION_KEY = 'culture-categories';

const DATA_FEATURES = [
  {
    title: 'สถานที่และพิกัด',
    description: 'แสดงตำแหน่งบนแผนที่จังหวัด พร้อมจัดกลุ่มตามอำเภอเมื่อข้อมูลระบุพื้นที่ชัดเจน',
  },
  {
    title: 'หมวดวัฒนธรรม',
    description: 'แยกข้อมูลเป็นอาหารพื้นบ้าน ศิลปะการแสดง งานช่าง ประเพณี พิธีกรรม และภูมิปัญญา',
  },
  {
    title: 'แหล่งอ้างอิง',
    description:
      'เก็บที่มาของข้อมูลแต่ละรายการ เพื่อให้ย้อนกลับไปยังชุดข้อมูลหรือหน่วยงานต้นทางได้',
  },
  {
    title: 'ตัวกรองจังหวัด',
    description: 'ค้นหาและกรองตามอำเภอ หมวดหมู่ และแหล่งข้อมูล เพื่อเจอเรื่องที่ต้องการเร็วขึ้น',
  },
];

const DEFAULT_HOME_ANALYTICS: HomeAnalyticsSummary = {
  days: 30,
  pageViews: 0,
  visitors: 0,
  sessions: 0,
  topSearches: [],
  topProvinces: [],
  topDistricts: [],
};

const CATEGORY_KEY_BY_TITLE: Record<string, string> = {
  สถานที่ท่องเที่ยว: 'tourist_attraction',
  อาหารพื้นบ้าน: 'local_food',
  ศิลปะการแสดง: 'performing_art',
  ประเพณีท้องถิ่น: 'local_tradition',
  ภูมิปัญญาชุมชน: 'community_wisdom',
  งานช่างฝีมือ: 'craftsmanship',
  ศิลปะพื้นบ้าน: 'folk_art',
  พิธีกรรม: 'ritual',
  วัด: 'temple',
  พิพิธภัณฑ์: 'museum',
  แหล่งเรียนรู้: 'learning_center',
};

function getFilledText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCultureCategoryKey(title: string) {
  return CATEGORY_KEY_BY_TITLE[title] ?? 'cultural_attraction';
}

function normalizeStoryContent(story?: StoredHomeContent['story']) {
  if (!story) {
    return undefined;
  }

  const title = getFilledText(story.title);
  const actionLabel = getFilledText(story.actionLabel);
  const body = getFilledText(story.body);

  if (!title || !actionLabel || !body) {
    return undefined;
  }

  return { title, actionLabel, body };
}

function normalizeLocalWisdomContent(content?: LocalWisdomContent) {
  if (!content) {
    return undefined;
  }

  const title = getFilledText(content.title);
  const body = getFilledText(content.body);
  const quote = getFilledText(content.quote);
  const caption = getFilledText(content.caption);
  const mediaUrl = getFilledText(content.mediaUrl);
  const coverUrl = getFilledText(content.coverUrl);

  if (!title || !body || !mediaUrl) {
    return undefined;
  }

  return {
    title,
    body,
    quote,
    caption,
    mediaUrl,
    coverUrl,
  };
}

function normalizeCultureCategoriesContent(content?: CultureCategoriesContent) {
  if (!content) {
    return undefined;
  }

  const title = getFilledText(content.title);
  const description = getFilledText(content.description);

  if (!title || !description) {
    return undefined;
  }

  return { title, description };
}

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
  const [selectedVideo, setSelectedVideo] = useState<HomeVideoItem | null>(null);
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);
  const [storyContent, setStoryContent] = useState<StoryContent>();
  const [localWisdomContent, setLocalWisdomContent] = useState<LocalWisdomContent>();
  const [cultureCategoriesContent, setCultureCategoriesContent] =
    useState<CultureCategoriesContent>();
  const [cultureCategoryCards, setCultureCategoryCards] = useState<CultureCategoryCard[]>([]);
  const [videoItems, setVideoItems] = useState<HomeVideoItem[]>([]);
  const [homeAnalytics, setHomeAnalytics] = useState<HomeAnalyticsSummary>(DEFAULT_HOME_ANALYTICS);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeContent() {
      try {
        const response = await fetch('/api/home-content', { signal: controller.signal });
        const json = (await response.json()) as {
          data?: Record<string, unknown>;
        };
        const sections = json.data ?? {};
        const homeContent = sections[STORY_MEDIA_SECTION_KEY] as StoredHomeContent | undefined;
        const nextStoryContent = normalizeStoryContent(homeContent?.story);

        setStoryContent(nextStoryContent);

        if (Array.isArray(homeContent?.mediaItems)) {
          const nextVideoItems = homeContent.mediaItems
            .filter((item) => item.isActive !== false && item.title && item.url)
            .map((item) => ({
              title: item.title.trim(),
              src: item.url.trim(),
              cover: item.coverUrl?.trim() || item.url.trim(),
            }));

          setVideoItems(nextVideoItems);
        } else {
          setVideoItems([]);
        }

        const localWisdomDraft = sections[LOCAL_WISDOM_SECTION_KEY] as
          | LocalWisdomContent
          | undefined;

        setLocalWisdomContent(normalizeLocalWisdomContent(localWisdomDraft));

        const cultureCategoriesDraft = sections[CULTURE_CATEGORIES_SECTION_KEY] as
          | StoredCultureCategoriesContent
          | undefined;

        setCultureCategoriesContent(
          normalizeCultureCategoriesContent(cultureCategoriesDraft?.content)
        );

        if (Array.isArray(cultureCategoriesDraft?.items)) {
          const nextCultureCategoryCards = cultureCategoriesDraft.items
            .filter((item) => item.isActive !== false && item.title && item.imageUrl)
            .map((item) => ({
              categoryKey: getCultureCategoryKey(item.title.trim()),
              title: item.title.trim(),
              description: getFilledText(item.description),
              icon: item.icon,
              src: item.imageUrl.trim(),
              color: getFilledText(item.color) || HOME_BG_TOP,
            }));

          setCultureCategoryCards(nextCultureCategoryCards);
        } else {
          setCultureCategoryCards([]);
        }
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name !== 'AbortError') {
          console.warn('Unable to load home content', caughtError);
        }
      }
    }

    loadHomeContent();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeAnalytics() {
      try {
        const response = await fetch('/api/analytics/summary', { signal: controller.signal });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { data?: HomeAnalyticsSummary };

        if (json.data) {
          setHomeAnalytics(json.data);
        }
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name !== 'AbortError') {
          console.warn('Unable to load home analytics', caughtError);
        }
      }
    }

    loadHomeAnalytics();

    return () => controller.abort();
  }, []);

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setVideoPreviewKey((currentValue) => currentValue + 1);
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
                  fontSize: { xs: 16, md: 32 },
                  fontWeight: { xs: 400, md: 800 },
                  lineHeight: 1.35,
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                จากข้อมูลหลายแหล่ง สู่ภาพรวมวัฒนธรรมรายจังหวัด
              </Typography>

              <Typography
                sx={{
                  mt: 2,
                  color: '#ffffff',
                  fontSize: { xs: 24, md: 46 },
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                สำรวจพื้นที่ วัฒนธรรม และเรื่องเล่าท้องถิ่น
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: 'rgba(255,255,255,0.84)',
                  fontSize: { xs: 14, md: 24 },
                  fontWeight: { xs: 400, md: 700 },
                }}
              >
                แผนที่ • อำเภอ • หมวดหมู่ • แหล่งอ้างอิง • รายละเอียดสถานที่
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
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
          <Box
            sx={{
              p: { xs: 2.5, md: 4 },
              borderRadius: 1.5,
              color: HOME_TEXT,
              bgcolor: 'rgba(42,55,54,0.34)',
              border: '1px solid rgba(248,246,238,0.22)',
              boxShadow: '0 28px 70px rgba(31,40,38,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Box>
                <Typography
                  component="p"
                  sx={{
                    color: 'rgba(234,215,161,0.92)',
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  Live usage insights
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    mt: 1,
                    color: HOME_TEXT,
                    fontSize: { xs: 24, md: 48 },
                    fontWeight: 900,
                    lineHeight: 1.1,
                  }}
                >
                  สถิติการสำรวจวัฒนธรรมบนเว็บไซต์
                </Typography>
                <Typography sx={{ mt: 1.5, maxWidth: 620, color: 'rgba(248,246,238,0.76)' }}>
                  ภาพรวม {homeAnalytics.days} วันล่าสุดจากการเข้าชม คำค้นหา จังหวัด
                  และอำเภอที่ผู้ใช้สนใจ
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  display: 'grid',
                  gap: 1.5,
                  width: { xs: 1, md: '300px' },
                }}
              >
                <Box
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    borderRadius: 1,
                    bgcolor: 'rgba(248,246,238,0.12)',
                    border: '1px solid rgba(248,246,238,0.18)',
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ mt: 1, fontSize: { xs: 30, md: 42 }, fontWeight: 950 }}>
                    {fNumber(homeAnalytics.visitors)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {cultureCategoriesContent && cultureCategoryCards.length > 0 && (
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
              {cultureCategoriesContent.title}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ mt: 1.4, color: 'rgba(248,246,238,0.82)', textAlign: 'center' }}
            >
              {cultureCategoriesContent.description}
            </Typography>

            <Box
              sx={{
                mt: { xs: 4, md: 5 },
                display: 'grid',
                gap: { xs: 1.8, md: 2.2 },
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(7, minmax(0, 1fr))',
                },
              }}
            >
              {cultureCategoryCards.map((image, index) => (
                <Box
                  key={`${image?.title}-${index}`}
                  component={RouterLink}
                  href={paths.cultureCategory.details(image.categoryKey)}
                  aria-label={`ดูรายละเอียด ${image.title}`}
                  sx={{
                    px: 2.2,
                    py: 2.4,
                    m: 0,
                    width: 1,
                    minHeight: 180,
                    display: 'flex',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textAlign: 'left',
                    borderRadius: 1,
                    color: HOME_TEXT,
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    bgcolor: image.color,
                    position: 'relative',
                    boxShadow: '0 18px 34px rgba(38,34,24,0.22)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, filter 180ms ease',
                    backgroundImage: `
                    radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
                    radial-gradient(circle at 16% 74%, rgba(255,255,255,0.13) 0 1px, transparent 1.5px),
                    linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 44%)
                  `,
                    backgroundSize: '22px 22px, 28px 28px, 100% 100%',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.2,
                      background:
                        'repeating-linear-gradient(160deg, transparent 0 22px, rgba(255,255,255,0.5) 23px 24px, transparent 25px 48px)',
                    },
                    '&::after': {
                      content: '""',
                      right: -34,
                      bottom: -44,
                      width: 132,
                      height: 132,
                      borderRadius: '50%',
                      position: 'absolute',
                      border: '1px solid rgba(255,255,255,0.24)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${HOME_TEXT}`,
                      outlineOffset: 4,
                    },
                    '&:hover, &:focus-visible': {
                      transform: 'translateY(-4px)',
                      filter: 'saturate(1.06)',
                      boxShadow: '0 24px 48px rgba(38,34,24,0.3)',
                    },
                    '&:hover .culture-category-icon, &:focus-visible .culture-category-icon': {
                      transform: 'translateY(-4px) scale(1.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      top: 18,
                      right: 18,
                      zIndex: 1,
                      opacity: 0.72,
                      position: 'absolute',
                      color: 'rgba(255,255,255,0.92)',
                      transition: 'transform 220ms ease',
                    }}
                    className="culture-category-icon"
                  >
                    <Iconify icon={image.icon} width={50} />
                  </Box>

                  <Box
                    sx={{
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      maxWidth: '90%',
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'inherit',
                        fontSize: { xs: 16, md: 16 },
                        fontWeight: 900,
                        lineHeight: 1.2,
                        textShadow: '0 2px 10px rgba(37,30,20,0.18)',
                      }}
                    >
                      {image.title}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: 'rgba(255,255,255,0.84)',
                        fontSize: 12.5,
                        fontWeight: 700,
                        lineHeight: 1.5,
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
      )}

      {localWisdomContent && (
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
                  <ReactPlayer
                    src={localWisdomContent?.mediaUrl}
                    light={localWisdomContent?.coverUrl}
                    width="100%"
                    height="100%"
                    playIcon={<PlayButton small />}
                    previewAriaLabel={`ดูวิดีโอ ${localWisdomContent?.title}`}
                    onClickPreview={() =>
                      setSelectedVideo({
                        title: localWisdomContent?.title,
                        src: localWisdomContent?.mediaUrl,
                        cover: localWisdomContent?.coverUrl,
                      })
                    }
                  />
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
                {localWisdomContent.title}
              </Typography>

              <Typography
                sx={{
                  mt: 4,
                  maxWidth: 430,
                  color: 'rgba(248,246,238,0.82)',
                  lineHeight: 1.75,
                }}
              >
                {localWisdomContent.body}
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontStyle: 'italic',
                  mt: 3,
                }}
              >
                {localWisdomContent.quote}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontStyle: 'italic',
                  mt: 3,
                }}
              >
                {localWisdomContent.caption}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {storyContent && videoItems.length > 0 && (
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
                {storyContent?.title}
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4.5 }}>
                <PlayButton small />
                <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                  {storyContent?.actionLabel}
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
                {storyContent?.body}
              </Typography>
            </Box>

            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              {videoItems &&
                videoItems?.map((video, index) => (
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
                      <ReactPlayer
                        key={`${video.title}-${videoPreviewKey}`}
                        src={video.src}
                        light={video.cover}
                        width="100%"
                        height="100%"
                        playIcon={<PlayButton small />}
                        previewAriaLabel={`ดูวิดีโอ ${video.title}`}
                        onClickPreview={() => setSelectedVideo(video)}
                      />
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
      )}

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
            ระบบข้อมูลที่พร้อมขยายต่อ
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mt: 1.4, color: 'rgba(248,246,238,0.82)', textAlign: 'center' }}
          >
            หน้าแรกออกแบบให้เป็นจุดเริ่มต้นของการค้นหา แล้วส่งต่อไปยังหน้าจังหวัด ที่มีแผนที่
            รายการสถานที่ ตัวกรอง และรายละเอียดจากแหล่งข้อมูลจริง
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
            {DATA_FEATURES.map((item) => (
              <Box
                key={item.title}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  minHeight: 180,
                  textAlign: 'left',
                  borderRadius: 1.5,
                  color: HOME_DEEP,
                  bgcolor: 'rgba(250,244,232,0.94)',
                  border: '1px solid rgba(255,255,255,0.58)',
                  boxShadow: '0 18px 44px rgba(44,35,21,0.18)',
                }}
              >
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#4b3523' }}>
                  {item.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    color: 'rgba(75,53,35,0.78)',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.65,
                  }}
                >
                  {item.description}
                </Typography>
              </Box>
            ))}
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

      <HomePopupBanner />

      <Dialog
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
      </Dialog>
    </Box>
  );
}

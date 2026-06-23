'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import dynamic from 'next/dynamic';
import { useRef, useState, useEffect, useCallback } from 'react';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

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

type CreatorArticlePreview = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  categoryKey: string;
  categoryLabel: string;
  creatorName: string;
  publishedAt: string;
  updatedAt: string;
};

type CreatorArticleResponse = {
  data?: CreatorArticlePreview[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number;
};

const STORY_MEDIA_SECTION_KEY = 'story-media';
const LOCAL_WISDOM_SECTION_KEY = 'local-wisdom';
const CULTURE_CATEGORIES_SECTION_KEY = 'culture-categories';

const DATA_FEATURES = [
  {
    icon: 'solar:file-text-bold' as IconifyName,
    title: 'ข้อมูลมีโครงสร้าง',
    description:
      'จัดเก็บชื่อสถานที่ จังหวัด อำเภอ หมวดหมู่ พิกัด รูปภาพ และแหล่งอ้างอิงให้พร้อมใช้งานต่อ',
  },
  {
    icon: 'solar:add-folder-bold' as IconifyName,
    title: 'ต่อยอดได้หลายมุมมอง',
    description:
      'นำข้อมูลเดียวกันไปแสดงได้ทั้งหน้าจังหวัด หน้าหมวด แผนที่ รายการสถานที่ และบทความประกอบ',
  },
  {
    icon: 'solar:shield-check-bold' as IconifyName,
    title: 'ตรวจสอบและแก้ไขได้',
    description:
      'รองรับคำขอแก้ไขจากผู้ใช้และ Creator ก่อนให้ทีมงานตรวจสอบ เพื่อให้ข้อมูลค่อย ๆ แม่นยำขึ้น',
  },
  {
    icon: 'solar:calendar-date-bold' as IconifyName,
    title: 'พร้อมขยายในอนาคต',
    description:
      'เพิ่มชุดข้อมูลใหม่ หมวดใหม่ หรือแหล่งข้อมูลจากหน่วยงานอื่นได้ โดยไม่ต้องเปลี่ยนประสบการณ์หลัก',
  },
];

const DATA_FLOW_STEPS = [
  {
    label: 'รวบรวม',
    title: 'นำเข้าข้อมูลหลายแหล่ง',
    description: 'รวมข้อมูลจากฐานข้อมูลวัฒนธรรม แหล่งท่องเที่ยว และข้อมูลที่ทีมงานดูแล',
  },
  {
    label: 'จัดระเบียบ',
    title: 'ทำให้ค้นหาและเปรียบเทียบง่าย',
    description: 'ผูกข้อมูลกับจังหวัด อำเภอ หมวดหมู่ พิกัด และแหล่งอ้างอิง',
  },
  {
    label: 'ต่อยอด',
    title: 'เปิดให้ชุมชนช่วยพัฒนา',
    description: 'Creator และผู้ใช้ช่วยเสนอแก้ไขข้อมูล ก่อนนำไปใช้ในระบบหลัก',
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
const CREATOR_ARTICLES_LIMIT = 8;
const FEATURED_CULTURE_CATEGORY_LIMIT = 6;

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

function formatCreatorArticleDate(value: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
  }).format(new Date(value));
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
  const creatorLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const creatorArticlesLoadingRef = useRef(false);
  const [selectedVideo, setSelectedVideo] = useState<HomeVideoItem | null>(null);
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);
  const [storyContent, setStoryContent] = useState<StoryContent>();
  const [localWisdomContent, setLocalWisdomContent] = useState<LocalWisdomContent>();
  const [cultureCategoriesContent, setCultureCategoriesContent] =
    useState<CultureCategoriesContent>();
  const [cultureCategoryCards, setCultureCategoryCards] = useState<CultureCategoryCard[]>([]);
  const [videoItems, setVideoItems] = useState<HomeVideoItem[]>([]);
  const [homeAnalytics, setHomeAnalytics] = useState<HomeAnalyticsSummary>(DEFAULT_HOME_ANALYTICS);
  const [creatorArticles, setCreatorArticles] = useState<CreatorArticlePreview[]>([]);
  const [creatorArticlesTotal, setCreatorArticlesTotal] = useState(0);
  const [creatorArticlesOffset, setCreatorArticlesOffset] = useState(0);
  const [hasMoreCreatorArticles, setHasMoreCreatorArticles] = useState(false);
  const [isLoadingCreatorArticles, setIsLoadingCreatorArticles] = useState(false);
  const shouldShowCreatorArticles = creatorArticlesTotal > 1;
  const featuredCultureCategoryCards = cultureCategoryCards.slice(
    0,
    FEATURED_CULTURE_CATEGORY_LIMIT
  );
  const remainingCultureCategoryCount = Math.max(
    cultureCategoryCards.length - featuredCultureCategoryCards.length,
    0
  );

  const loadCreatorArticles = useCallback(async (offset = 0) => {
    if (creatorArticlesLoadingRef.current) {
      return;
    }

    creatorArticlesLoadingRef.current = true;
    setIsLoadingCreatorArticles(true);

    try {
      const params = new URLSearchParams({
        offset: `${offset}`,
        limit: `${CREATOR_ARTICLES_LIMIT}`,
      });
      const response = await fetch(`/api/creator/public-articles?${params.toString()}`);

      if (!response.ok) {
        return;
      }

      const json = (await response.json()) as CreatorArticleResponse;
      const nextItems = json.data ?? [];

      setCreatorArticles((currentItems) =>
        offset === 0 ? nextItems : [...currentItems, ...nextItems]
      );
      setCreatorArticlesTotal(json.total ?? nextItems.length);
      setHasMoreCreatorArticles(Boolean(json.hasMore));
      setCreatorArticlesOffset(json.nextOffset ?? offset + CREATOR_ARTICLES_LIMIT);
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        console.warn('Unable to load creator articles', caughtError);
      }
    } finally {
      creatorArticlesLoadingRef.current = false;
      setIsLoadingCreatorArticles(false);
    }
  }, []);

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
    loadCreatorArticles(0);
  }, [loadCreatorArticles]);

  useEffect(() => {
    const target = creatorLoadMoreRef.current;

    if (!target || !hasMoreCreatorArticles || !shouldShowCreatorArticles) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting) {
          loadCreatorArticles(creatorArticlesOffset);
        }
      },
      { rootMargin: '280px 0px' }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [
    creatorArticlesOffset,
    hasMoreCreatorArticles,
    loadCreatorArticles,
    shouldShowCreatorArticles,
  ]);

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
              {highlights.map((item) => (
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
          pb: { xs: 7, md: 10 },
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
            py: { xs: 6, md: 9 },
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
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2.5}
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
              justifyContent="space-between"
              sx={{ mb: { xs: 3.5, md: 4.5 } }}
            >
              <Box sx={{ maxWidth: 700 }}>
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
                  Culture categories
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
                  {cultureCategoriesContent.title}
                </Typography>
                <Typography sx={{ mt: 1.3, color: 'rgba(248,246,238,0.76)', lineHeight: 1.75 }}>
                  {cultureCategoriesContent.description}
                </Typography>
              </Box>

              <Button
                component={RouterLink}
                href="/culture-category"
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  color: HOME_TEXT,
                  borderColor: 'rgba(248,246,238,0.5)',
                  '&:hover': {
                    borderColor: HOME_TEXT,
                    bgcolor: 'rgba(248,246,238,0.08)',
                  },
                }}
              >
                ดูข้อมูลทั้งหมด
              </Button>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: { xs: 1.5, md: 2 },
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {featuredCultureCategoryCards.map((image, index) => (
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
                    minHeight: { xs: 142, md: 168 },
                    display: 'flex',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textAlign: 'left',
                    borderRadius: 1.5,
                    color: HOME_TEXT,
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(42,55,54,0.32)',
                    position: 'relative',
                    boxShadow: '0 18px 42px rgba(31,40,38,0.16)',
                    border: '1px solid rgba(248,246,238,0.2)',
                    backdropFilter: 'blur(7px)',
                    transition:
                      'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    '&::after': {
                      content: '""',
                      left: 0,
                      top: 0,
                      width: 5,
                      height: 1,
                      position: 'absolute',
                      bgcolor: image.color,
                    },
                    '& .culture-category-count': {
                      color: image.color,
                    },
                    '& .culture-category-icon-wrap': {
                      color: image.color,
                      bgcolor: 'rgba(248,246,238,0.9)',
                    },
                    '& .culture-category-arrow': {
                      opacity: 0,
                      transform: 'translateX(-4px)',
                      transition: 'opacity 180ms ease, transform 180ms ease',
                    },
                    '&::before': {
                      content: '""',
                      right: -24,
                      top: -30,
                      width: 110,
                      height: 110,
                      borderRadius: '50%',
                      position: 'absolute',
                      bgcolor: 'rgba(248,246,238,0.06)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${HOME_TEXT}`,
                      outlineOffset: 4,
                    },
                    '&:hover, &:focus-visible': {
                      transform: 'translateY(-3px)',
                      borderColor: 'rgba(248,246,238,0.36)',
                      boxShadow: '0 24px 54px rgba(31,40,38,0.22)',
                    },
                    '&:hover .culture-category-arrow, &:focus-visible .culture-category-arrow': {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      zIndex: 1,
                      width: 46,
                      height: 46,
                      borderRadius: 1.25,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    className="culture-category-icon-wrap"
                  >
                    <Iconify icon={image.icon} width={25} />
                  </Box>

                  <Box
                    sx={{
                      zIndex: 1,
                      width: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'inherit',
                        fontSize: { xs: 18, md: 20 },
                        fontWeight: 900,
                        lineHeight: 1.25,
                      }}
                    >
                      {image.title}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.2 }}>
                      <Typography
                        className="culture-category-count"
                        sx={{ fontSize: 13, fontWeight: 900 }}
                      >
                        ดูหมวดนี้
                      </Typography>
                      <Iconify
                        className="culture-category-arrow"
                        icon="eva:arrow-ios-forward-fill"
                        width={18}
                      />
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>

            {remainingCultureCategoryCount > 0 && (
              <Typography sx={{ mt: 2.5, color: 'rgba(248,246,238,0.68)', fontSize: 13 }}>
                ยังมีอีก {remainingCultureCategoryCount.toLocaleString('th-TH')}{' '}
                หมวดในหน้าข้อมูลทั้งหมด
              </Typography>
            )}
          </Box>
        </Box>
      )}

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
            {[
              {
                icon: 'solar:file-text-bold' as IconifyName,
                title: 'ค้นหาเร็วขึ้น',
                body: 'เริ่มจากจังหวัดแรกเพื่อลดเวลารอโหลด แล้วค่อยขยายเป็นทุกจังหวัดได้',
              },
              {
                icon: 'solar:add-folder-bold' as IconifyName,
                title: 'ดูรวมทุกหมวด',
                body: 'รวมสถานที่ ประเพณี อาหาร งานช่าง ภูมิปัญญา และแหล่งเรียนรู้ไว้ในหน้าเดียว',
              },
              {
                icon: 'solar:check-circle-bold' as IconifyName,
                title: 'ช่วยแก้ข้อมูล',
                body: 'เมื่อพบข้อมูลคลาดเคลื่อน สามารถเปิดสถานที่และส่งคำขอให้ทีมงานตรวจสอบ',
              },
            ].map((item) => (
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
                <Typography
                  sx={{ mt: 1, color: 'rgba(248,246,238,0.72)', fontSize: 13.5, lineHeight: 1.65 }}
                >
                  {item.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

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
          py: { xs: 7, md: 9 },
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
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            justifyContent="space-between"
            sx={{ mb: { xs: 3.5, md: 4.5 } }}
          >
            <Box sx={{ maxWidth: 720 }}>
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
                Scalable data system
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
                ระบบข้อมูลที่พร้อมขยายต่อ
              </Typography>
              <Typography sx={{ mt: 1.4, color: 'rgba(248,246,238,0.76)', lineHeight: 1.75 }}>
                ออกแบบให้ข้อมูลวัฒนธรรมไม่หยุดอยู่แค่รายการสถานที่ แต่ต่อยอดเป็นแผนที่ หน้าหมวด
                บทความ และระบบตรวจแก้ข้อมูลร่วมกับผู้ใช้ได้ในระยะยาว
              </Typography>
            </Box>

            <Button
              component={RouterLink}
              href="/culture-category"
              variant="outlined"
              sx={{
                flexShrink: 0,
                color: HOME_TEXT,
                borderColor: 'rgba(248,246,238,0.5)',
                '&:hover': {
                  borderColor: HOME_TEXT,
                  bgcolor: 'rgba(248,246,238,0.08)',
                },
              }}
            >
              ดูฐานข้อมูล
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, md: 2.5 },
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              mb: { xs: 2.5, md: 3 },
            }}
          >
            {DATA_FLOW_STEPS.map((step, index) => (
              <Box
                key={step.title}
                sx={{
                  p: { xs: 2.2, md: 2.6 },
                  minHeight: 190,
                  borderRadius: 1.5,
                  color: HOME_TEXT,
                  bgcolor: 'rgba(42,55,54,0.3)',
                  border: '1px solid rgba(248,246,238,0.2)',
                  backdropFilter: 'blur(7px)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 1,
                    height: 4,
                    bgcolor: 'rgba(234,215,161,0.72)',
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(234,215,161,0.92)',
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                  }}
                >
                  {String(index + 1).padStart(2, '0')} / {step.label}
                </Typography>
                <Typography sx={{ mt: 2, fontSize: { xs: 19, md: 21 }, fontWeight: 900 }}>
                  {step.title}
                </Typography>
                <Typography
                  sx={{ mt: 1, color: 'rgba(248,246,238,0.72)', fontSize: 13.5, lineHeight: 1.7 }}
                >
                  {step.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {shouldShowCreatorArticles && (
        <Box
          sx={{
            px: HOME_SECTION_PX,
            py: { xs: 7, md: 10 },
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
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
              spacing={2}
              sx={{ mb: { xs: 4, md: 5 } }}
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
                  Creator writing
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    mt: 2,
                    color: HOME_TEXT,
                    fontSize: { xs: 28, md: 46 },
                    fontWeight: 950,
                    lineHeight: 1.15,
                  }}
                >
                  งานเขียนจาก Creator
                </Typography>
                <Typography
                  sx={{
                    mt: 1.5,
                    maxWidth: 640,
                    color: 'rgba(248,246,238,0.78)',
                    lineHeight: 1.75,
                  }}
                >
                  เรื่องเล่าวัฒนธรรมที่ผ่านการตรวจสอบแล้วจากผู้ร่วมเขียนในชุมชน
                  กดอ่านรายละเอียดเพื่อดูบทความฉบับเต็มและมุมมองจากผู้เขียน
                </Typography>
              </Box>

              <Button
                component={RouterLink}
                href="/creator/register"
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  color: HOME_TEXT,
                  borderColor: 'rgba(248,246,238,0.5)',
                  '&:hover': {
                    borderColor: HOME_TEXT,
                    bgcolor: 'rgba(248,246,238,0.08)',
                  },
                }}
              >
                สมัครเป็น Creator
              </Button>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2, md: 2.5 },
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
              {creatorArticles.map((article) => (
                <Box
                  key={article.id}
                  component={RouterLink}
                  href={`/creator-stories/${encodeURIComponent(article.slug || article.id)}`}
                  sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    borderRadius: 1.5,
                    color: HOME_DEEP,
                    bgcolor: 'rgba(250,244,232,0.95)',
                    border: '1px solid rgba(255,255,255,0.58)',
                    boxShadow: '0 22px 54px rgba(44,35,21,0.2)',
                    textDecoration: 'none',
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                    '&:hover, &:focus-visible': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 28px 66px rgba(44,35,21,0.28)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 1,
                      aspectRatio: '4 / 3',
                      overflow: 'hidden',
                      bgcolor: 'rgba(42,55,54,0.16)',
                    }}
                  >
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt={article.title}
                        ratio="4/3"
                        visibleByDefault
                        disablePlaceholder
                        sx={{ width: 1, height: 1, '& img': { objectFit: 'cover' } }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 1,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundImage: `
                            radial-gradient(circle at 24% 18%, rgba(234,215,161,0.5), transparent 30%),
                            linear-gradient(135deg, rgba(96,141,140,0.42), rgba(143,124,92,0.36))
                          `,
                        }}
                      >
                        <Iconify icon="solar:notebook-bold-duotone" width={52} />
                      </Box>
                    )}
                  </Box>

                  <Stack spacing={1.25} sx={{ p: { xs: 2, md: 2.25 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Chip
                        size="small"
                        label={article.categoryLabel || 'บทความ'}
                        sx={{
                          height: 24,
                          maxWidth: 150,
                          color: '#4b3523',
                          bgcolor: 'rgba(234,215,161,0.58)',
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      />
                      <Typography sx={{ color: 'rgba(75,53,35,0.58)', fontSize: 12 }} noWrap>
                        {formatCreatorArticleDate(article.publishedAt || article.updatedAt)}
                      </Typography>
                    </Stack>

                    <Typography
                      sx={{
                        color: '#3b2f24',
                        minHeight: 56,
                        fontSize: 18,
                        fontWeight: 950,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {article.title}
                    </Typography>

                    <Typography
                      sx={{
                        color: 'rgba(75,53,35,0.74)',
                        minHeight: 64,
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.65,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {article.excerpt || 'เรื่องราววัฒนธรรมจาก creator ของ Thai Culture Hub'}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography sx={{ color: 'rgba(75,53,35,0.62)', fontSize: 12 }}>
                        โดย {article.creatorName || 'Creator'}
                      </Typography>
                      <Typography sx={{ color: '#7b5a31', fontSize: 13, fontWeight: 900 }}>
                        อ่านต่อ
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Box>

            <Box
              ref={creatorLoadMoreRef}
              sx={{
                mt: 4,
                minHeight: 48,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isLoadingCreatorArticles && <CircularProgress size={28} sx={{ color: HOME_TEXT }} />}
            </Box>
          </Box>
        </Box>
      )}

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

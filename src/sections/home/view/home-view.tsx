'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';
import type {
  StoryContent,
  HomeVideoItem,
  HomeEventItem,
  StoredHomeContent,
  LocalWisdomContent,
  CultureCategoryCard,
  HomeAnalyticsSummary,
  CreatorArticlePreview,
  CreatorArticleResponse,
  CultureCategoriesContent,
  StoredCultureCategoriesContent,
} from '../components/home-types';

import dynamic from 'next/dynamic';
import { useRef, useState, useEffect, useCallback } from 'react';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { HomePlayButton } from '../components/home-play-button';
import { HomeMapSection } from '../components/home-map-section';
import { HomePopupBanner } from '../components/home-popup-banner';
import { HomeHeroSection } from '../components/home-hero-section';
import { HomeVideoDialog } from '../components/home-video-dialog';
import { HomeAnalyticsSection } from '../components/home-analytics-section';
import {
  getFilledText,
  isUpcomingHomeEvent,
  formatHomeEventDate,
  getCultureCategoryKey,
  normalizeStoryContent,
  formatCreatorArticleDate,
  normalizeLocalWisdomContent,
  normalizeCultureCategoriesContent,
} from '../components/home-utils';
import {
  HOME_TEXT,
  HOME_DEEP,
  HOME_BG_TOP,
  HOME_BG_MIDDLE,
  DATA_FLOW_STEPS,
  HOME_SECTION_PX,
  HOME_POSTER_PATTERN,
  CREATOR_ARTICLES_LIMIT,
  HOME_SHARED_BACKGROUND,
  DEFAULT_HOME_ANALYTICS,
  HOME_SECTION_MAX_WIDTH,
  STORY_MEDIA_SECTION_KEY,
  LOCAL_WISDOM_SECTION_KEY,
  CULTURE_CATEGORIES_SECTION_KEY,
  FEATURED_CULTURE_CATEGORY_LIMIT,
} from '../components/home-constants';

// ----------------------------------------------------------------------

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

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
  const [homeEvents, setHomeEvents] = useState<HomeEventItem[]>([]);
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
    const controller = new AbortController();

    async function loadHomeEvents() {
      try {
        const response = await fetch('/api/events', { signal: controller.signal });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { data?: HomeEventItem[] };
        const nextEvents = (json.data ?? [])
          .filter(
            (item) =>
              item.title &&
              (item.isFeatured ||
                (item.startsAt &&
                  item.location &&
                  item.organizer &&
                  isUpcomingHomeEvent(item.startsAt)))
          )
          .sort((first, second) => {
            if (Boolean(first.isFeatured) !== Boolean(second.isFeatured)) {
              return first.isFeatured ? -1 : 1;
            }

            const firstTime = first.startsAt
              ? new Date(first.startsAt).getTime()
              : Number.MAX_SAFE_INTEGER;
            const secondTime = second.startsAt
              ? new Date(second.startsAt).getTime()
              : Number.MAX_SAFE_INTEGER;

            return firstTime - secondTime;
          })
          .slice(0, 2);

        setHomeEvents(nextEvents);
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name !== 'AbortError') {
          console.warn('Unable to load home events', caughtError);
        }
      }
    }

    loadHomeEvents();

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
      <HomeHeroSection />

      <HomeMapSection />

      <HomeAnalyticsSection summary={homeAnalytics} />

      {homeEvents.length > 0 && (
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
          <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2.5}
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
                  Upcoming events
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
                  กิจกรรมวัฒนธรรมที่ใกล้จะถึง
                </Typography>
                <Typography sx={{ mt: 1.3, color: 'rgba(248,246,238,0.76)', lineHeight: 1.75 }}>
                  รวมวัน เวลา สถานที่ และผู้จัดงาน เพื่อให้ติดตามกิจกรรมวัฒนธรรมล่าสุดได้จากหน้าแรก
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2, md: 2.5 },
                gridTemplateColumns: { xs: '1fr', lg: '1.35fr 0.65fr' },
                alignItems: 'stretch',
              }}
            >
              {homeEvents.map((eventItem, index) => {
                const isFeatured = index === 0;
                const mediaSource = eventItem.coverUrl || eventItem.mediaUrl;

                return (
                  <Box
                    key={eventItem.id || `${eventItem.title}-${index}`}
                    sx={{
                      minWidth: 0,
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      color: HOME_TEXT,
                      bgcolor: isFeatured ? 'rgba(42,55,54,0.36)' : 'rgba(42,55,54,0.26)',
                      border: isFeatured
                        ? '1px solid rgba(234,215,161,0.46)'
                        : '1px solid rgba(248,246,238,0.2)',
                      boxShadow: isFeatured
                        ? '0 30px 76px rgba(31,40,38,0.28)'
                        : '0 20px 48px rgba(31,40,38,0.18)',
                      backdropFilter: 'blur(7px)',
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: isFeatured ? '1.05fr 0.95fr' : '1fr',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        minHeight: isFeatured ? { xs: 240, md: 380 } : { xs: 210, md: 240 },
                        bgcolor: HOME_DEEP,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {eventItem.mediaType === 'video' && eventItem.mediaUrl ? (
                        <ReactPlayer
                          src={eventItem.mediaUrl}
                          light={eventItem.coverUrl || true}
                          width="100%"
                          height="100%"
                          playIcon={<HomePlayButton small={!isFeatured} />}
                          previewAriaLabel={`ดูวิดีโอ ${eventItem.title}`}
                          onClickPreview={() =>
                            setSelectedVideo({
                              title: eventItem.title,
                              src: eventItem.mediaUrl,
                              cover: eventItem.coverUrl,
                            })
                          }
                        />
                      ) : mediaSource ? (
                        <Image
                          src={mediaSource}
                          alt={eventItem.title}
                          ratio={isFeatured ? '4/3' : '16/9'}
                          visibleByDefault
                          disablePlaceholder
                          sx={{
                            width: 1,
                            height: 1,
                            '& img': { objectFit: 'cover' },
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 1,
                            display: 'grid',
                            placeItems: 'center',
                            backgroundImage: `
                              radial-gradient(circle at 24% 18%, rgba(234,215,161,0.35), transparent 32%),
                              linear-gradient(135deg, rgba(96,141,140,0.48), rgba(143,124,92,0.42))
                            `,
                          }}
                        >
                          <Iconify icon="solar:calendar-date-bold" width={isFeatured ? 72 : 54} />
                        </Box>
                      )}

                      <Box
                        sx={{
                          left: 16,
                          top: 16,
                          px: 1.2,
                          py: 0.7,
                          borderRadius: 1,
                          position: 'absolute',
                          color: HOME_DEEP,
                          bgcolor: 'rgba(234,215,161,0.92)',
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {eventItem.isFeatured ? 'สำคัญ' : isFeatured ? 'เร็ว ๆ นี้' : 'รายการถัดไป'}
                      </Box>
                    </Box>

                    <Stack spacing={isFeatured ? 2 : 1.4} sx={{ p: { xs: 2.2, md: 3 } }}>
                      <Typography
                        sx={{
                          color: 'rgba(234,215,161,0.95)',
                          fontSize: 13,
                          fontWeight: 900,
                          letterSpacing: 0.4,
                        }}
                      >
                        {formatHomeEventDate(eventItem.startsAt) || 'ติดตามวันเวลาเร็ว ๆ นี้'}
                      </Typography>

                      <Typography
                        sx={{
                          color: HOME_TEXT,
                          fontSize: isFeatured ? { xs: 25, md: 34 } : { xs: 21, md: 24 },
                          fontWeight: 950,
                          lineHeight: 1.18,
                        }}
                      >
                        {eventItem.title}
                      </Typography>

                      {eventItem.description && (
                        <Typography
                          sx={{
                            color: 'rgba(248,246,238,0.74)',
                            fontSize: isFeatured ? 14 : 13,
                            lineHeight: 1.7,
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitLineClamp: isFeatured ? 3 : 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {eventItem.description}
                        </Typography>
                      )}

                      <Stack spacing={1.1} sx={{ pt: 0.5 }}>
                        {[
                          {
                            icon: 'solar:clock-circle-bold',
                            label: eventItem.time || 'เวลาจะแจ้งให้ทราบ',
                          },
                          {
                            icon: 'solar:map-point-bold',
                            label:
                              [eventItem.provinceName, eventItem.location]
                                .filter(Boolean)
                                .join(' - ') || 'ยังไม่ระบุจังหวัด',
                          },
                          {
                            icon: 'solar:users-group-rounded-bold',
                            label: eventItem.organizer || 'ยังไม่ระบุผู้จัด',
                          },
                        ].map((detail) => (
                          <Stack key={detail.icon} direction="row" spacing={1} alignItems="center">
                            <Iconify icon={detail.icon as IconifyName} width={18} />
                            <Typography sx={{ color: 'rgba(248,246,238,0.78)', fontSize: 13 }}>
                              {detail.label}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      {eventItem.sourceUrl && (
                        <Button
                          component="a"
                          href={eventItem.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          variant="outlined"
                          endIcon={<Iconify icon="eva:external-link-fill" width={16} />}
                          sx={{
                            mt: 0.4,
                            width: 'fit-content',
                            color: HOME_TEXT,
                            borderColor: 'rgba(248,246,238,0.42)',
                            '&:hover': {
                              borderColor: 'rgba(234,215,161,0.78)',
                              bgcolor: 'rgba(234,215,161,0.08)',
                            },
                          }}
                        >
                          {eventItem.sourceLabel || 'ติดตามรายละเอียด'}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

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
                    playIcon={<HomePlayButton small />}
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
                <HomePlayButton small />
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
                        playIcon={<HomePlayButton small />}
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

      <HomeVideoDialog video={selectedVideo} onClose={handleCloseVideo} />
    </Box>
  );
}

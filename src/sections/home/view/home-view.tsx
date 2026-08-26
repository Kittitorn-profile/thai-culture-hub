'use client';

import type {
  StoryContent,
  HomeEventItem,
  HomeVideoItem,
  StoredHomeContent,
  LocalWisdomContent,
  CultureCategoryCard,
  HomeAnalyticsSummary,
  CreatorArticlePreview,
  CreatorArticleResponse,
  CultureCategoriesContent,
  PerformanceGroupsContent,
  StoredCultureCategoriesContent,
} from '../components/home-types';

import { useRef, useState, useEffect, useCallback } from 'react';

import { Box } from '@mui/material';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';

import { HomeMapSection } from '../components/home-map-section';
import { HomeHeroSection } from '../components/home-hero-section';
import { HomePopupBanner } from '../components/home-popup-banner';
import { HomeVideoDialog } from '../components/home-video-dialog';
import { HomeDataFlowSection } from '../components/home-data-flow-section';
import { HomeAnalyticsSection } from '../components/home-analytics-section';
import { HomeExploreAllSection } from '../components/home-explore-all-section';
import { HomeStoryVideoSection } from '../components/home-story-video-section';
import { HomeLocalWisdomSection } from '../components/home-local-wisdom-section';
import { HomeUpcomingEventsSection } from '../components/home-upcoming-events-section';
import { HomeCreatorArticlesSection } from '../components/home-creator-articles-section';
import { HomePerformanceGroupsSection } from '../components/home-performance-groups-section';
import { HomeCultureCategoriesSection } from '../components/home-culture-categories-section';
import {
  MOCK_PERFORMANCE_GROUPS,
  mergeWithMockPerformanceGroups,
} from '../components/home-mock-data';
import { HomePerformanceGroupsExpandedSection } from '../components/home-performance-groups-expanded-section';
import {
  getFilledText,
  isUpcomingHomeEvent,
  getCultureCategoryKey,
  normalizeStoryContent,
  normalizeLocalWisdomContent,
  normalizeCultureCategoriesContent,
  normalizePerformanceGroupsContent,
} from '../components/home-utils';
import {
  HOME_TEXT,
  HOME_BG_TOP,
  HOME_BG_MIDDLE,
  HOME_POSTER_PATTERN,
  CREATOR_ARTICLES_LIMIT,
  DEFAULT_HOME_ANALYTICS,
  HOME_SHARED_BACKGROUND,
  STORY_MEDIA_SECTION_KEY,
  LOCAL_WISDOM_SECTION_KEY,
  CULTURE_CATEGORIES_SECTION_KEY,
  PERFORMANCE_GROUPS_SECTION_KEY,
} from '../components/home-constants';

// ----------------------------------------------------------------------

export function HomeView() {
  const creatorArticlesLoadingRef = useRef(false);
  const [selectedVideo, setSelectedVideo] = useState<HomeVideoItem | null>(null);
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);
  const [storyContent, setStoryContent] = useState<StoryContent>();
  const [localWisdomContent, setLocalWisdomContent] = useState<LocalWisdomContent>();
  const [performanceGroupsContent, setPerformanceGroupsContent] =
    useState<PerformanceGroupsContent>(MOCK_PERFORMANCE_GROUPS);
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
  const shouldShowCreatorArticles = creatorArticlesTotal > 0;
  const shouldShowExpandedPerformanceGroups = false;

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

        const performanceGroupsDraft = sections[PERFORMANCE_GROUPS_SECTION_KEY] as
          | PerformanceGroupsContent
          | undefined;

        const normalizedPerformanceGroups =
          normalizePerformanceGroupsContent(performanceGroupsDraft);
        setPerformanceGroupsContent(mergeWithMockPerformanceGroups(normalizedPerformanceGroups));

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
                  isUpcomingHomeEvent(item.endsAt || item.startsAt)))
          )
          .sort((first, second) => {
            const firstIsPast = !isUpcomingHomeEvent(first.endsAt || first.startsAt);
            const secondIsPast = !isUpcomingHomeEvent(second.endsAt || second.startsAt);

            if (firstIsPast !== secondIsPast) {
              return firstIsPast ? 1 : -1;
            }

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
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        color: HOME_TEXT,
        overflowX: 'clip',
        overflowY: 'hidden',
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

      <HomeUpcomingEventsSection events={homeEvents} onPlayVideo={setSelectedVideo} />

      {cultureCategoriesContent && cultureCategoryCards.length > 0 && (
        <HomeCultureCategoriesSection
          content={cultureCategoriesContent}
          cards={cultureCategoryCards}
        />
      )}

      {performanceGroupsContent && (
        <HomePerformanceGroupsSection content={performanceGroupsContent} />
      )}

      <HomeExploreAllSection />

      {localWisdomContent && (
        <HomeLocalWisdomSection content={localWisdomContent} onPlayVideo={setSelectedVideo} />
      )}

      {shouldShowExpandedPerformanceGroups && performanceGroupsContent && (
        <HomePerformanceGroupsExpandedSection content={performanceGroupsContent} />
      )}

      {storyContent && videoItems.length > 0 && (
        <HomeStoryVideoSection
          story={storyContent}
          videoItems={videoItems}
          videoPreviewKey={videoPreviewKey}
          onPlayVideo={setSelectedVideo}
        />
      )}

      <HomeDataFlowSection />

      {shouldShowCreatorArticles && (
        <HomeCreatorArticlesSection
          articles={creatorArticles}
          hasMore={hasMoreCreatorArticles}
          isLoading={isLoadingCreatorArticles}
          offset={creatorArticlesOffset}
          onLoadMore={loadCreatorArticles}
        />
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

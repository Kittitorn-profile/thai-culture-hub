'use client';

import type {
  CreatorArticlePreview,
  CreatorArticleResponse,
} from 'src/sections/home/components/home-types';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import {
  getCultureCategoryHref,
  formatCreatorArticleDate,
} from 'src/sections/home/components/home-utils';

import { CreatorArticleEngagement } from './creator-article-engagement';

type CreatorPublicProfile = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  awards?: Array<{
    key: string;
    title: string;
    subtitle: string;
    imageUrl: string;
  }>;
};

type CreatorPublicArticlesViewProps = {
  creator: CreatorPublicProfile;
  initialArticles: CreatorArticlePreview[];
  initialTotal: number;
  initialHasMore: boolean;
  initialNextOffset: number;
};

const PAGE_TEXT = '#f8f6ee';
const PAGE_DEEP = '#2a3736';
const PAGE_BG = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.28) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
`;
const PAGE_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px)
`;
const PAGE_SIZE = 8;

function getStoryHref(article: CreatorArticlePreview) {
  return `/creator-stories/${encodeURIComponent(article.slug || article.id)}`;
}

export function CreatorPublicArticlesView({
  creator,
  initialArticles,
  initialTotal,
  initialHasMore,
  initialNextOffset,
}: CreatorPublicArticlesViewProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoading, setIsLoading] = useState(false);
  const primaryAward = creator.awards?.[0];

  useEffect(() => {
    let isActive = true;

    async function hydrateInitialArticles() {
      const params = new URLSearchParams({
        creatorId: creator.id,
        offset: '0',
        limit: `${PAGE_SIZE}`,
      });
      const response = await fetch(`/api/creator/public-articles?${params.toString()}`);

      if (!response.ok || !isActive) {
        return;
      }

      const json = (await response.json()) as CreatorArticleResponse;
      const nextItems = json.data ?? [];

      setArticles(nextItems);
      setTotal(json.total ?? initialTotal);
      setHasMore(Boolean(json.hasMore));
      setNextOffset(json.nextOffset ?? nextItems.length);
    }

    hydrateInitialArticles().catch(() => {});

    return () => {
      isActive = false;
    };
  }, [creator.id, initialTotal]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        creatorId: creator.id,
        offset: `${nextOffset}`,
        limit: `${PAGE_SIZE}`,
      });
      const response = await fetch(`/api/creator/public-articles?${params.toString()}`);

      if (!response.ok) {
        return;
      }

      const json = (await response.json()) as CreatorArticleResponse;
      const nextItems = json.data ?? [];

      setArticles((currentArticles) => [...currentArticles, ...nextItems]);
      setTotal(json.total ?? total);
      setHasMore(Boolean(json.hasMore));
      setNextOffset(json.nextOffset ?? nextOffset + nextItems.length);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [creator.id, hasMore, nextOffset, total]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '320px 0px' }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <Box
      component="main"
      sx={{
        px: { xs: 2.5, sm: 4, md: 6, lg: 8 },
        py: { xs: 9, md: 12 },
        minHeight: '100vh',
        color: PAGE_TEXT,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#7b8476',
        backgroundImage: PAGE_BG,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          opacity: 0.18,
          pointerEvents: 'none',
          backgroundImage: PAGE_PATTERN,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Stack spacing={4} sx={{ mx: 'auto', maxWidth: 1180, position: 'relative', zIndex: 1 }}>
        <Button
          href="/"
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ alignSelf: 'flex-start' }}
        >
          กลับหน้าแรก
        </Button>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 2,
            bgcolor: 'rgba(250,244,232,0.14)',
            border: '1px solid rgba(248,246,238,0.22)',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={creator.avatarUrl || undefined}
                alt={creator.displayName}
                sx={{
                  width: { xs: 76, md: 96 },
                  height: { xs: 76, md: 96 },
                  bgcolor: 'rgba(234,215,161,0.9)',
                  color: PAGE_DEEP,
                  fontSize: 34,
                  fontWeight: 950,
                  border: '3px solid rgba(248,246,238,0.76)',
                }}
              />
              {primaryAward && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: { xs: -6, md: 0 },
                    bottom: { xs: -6, md: 0 },
                    width: { xs: 34, md: 32 },
                    height: { xs: 34, md: 32 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                    color: '#6f552d',
                  }}
                >
                  {primaryAward.imageUrl ? (
                    <Box
                      component="img"
                      src={primaryAward.imageUrl}
                      alt={primaryAward.title}
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Iconify icon="solar:cup-star-bold" width={22} />
                  )}
                </Box>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Chip
                label="Creator"
                sx={{
                  color: PAGE_DEEP,
                  fontWeight: 900,
                  bgcolor: 'rgba(234,215,161,0.9)',
                }}
              />
              <Typography
                component="h1"
                sx={{
                  mt: 1,
                  color: PAGE_TEXT,
                  fontSize: { xs: 34, md: 54 },
                  fontWeight: 950,
                  lineHeight: 1.08,
                }}
              >
                {creator.displayName}
              </Typography>
              {!!creator.bio && (
                <Typography sx={{ mt: 1, maxWidth: 620, color: 'rgba(248,246,238,0.76)' }}>
                  {creator.bio}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row">
            <Box mr={2}>
              {creator.awards?.length ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {creator.awards.map((award) => (
                    <Stack
                      textAlign="center"
                      key={award.key}
                      direction="column"
                      spacing={1.1}
                      alignItems="center"
                      sx={{
                        minWidth: 0,
                        p: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {award.imageUrl ? (
                          <Box
                            component="img"
                            src={award.imageUrl}
                            alt={award.title}
                            sx={{ width: 1, height: 1, objectFit: 'cover' }}
                          />
                        ) : (
                          <Iconify icon="solar:cup-star-bold" width={26} />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 950, lineHeight: 1.2 }}>
                          {award.title}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.25,

                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: 1.35,
                          }}
                        >
                          {award.subtitle}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ mt: 0.75, color: 'rgba(42,55,54,0.52)', fontSize: 12 }}>
                  ยังไม่มี badge ที่แสดง
                </Typography>
              )}
            </Box>

            <Stack
              spacing={1.5}
              sx={{
                px: 2.4,
                py: 1.8,
                borderRadius: 1.5,
                color: PAGE_DEEP,
                bgcolor: 'rgba(250,244,232,0.92)',
                width: { xs: 1, md: 320 },
                flexShrink: 0,
              }}
            >
              <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'rgba(42,55,54,0.62)' }}>
                  จำนวนเนื้อหาที่เขียน
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 36, fontWeight: 950, lineHeight: 1 }}>
                  {total.toLocaleString('th-TH')}
                </Typography>
              </Box>
            </Stack>
          </Stack>
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
          {articles.map((article) => (
            <Box
              key={article.id}
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                borderRadius: 1.5,
                color: PAGE_DEEP,
                bgcolor: 'rgba(250,244,232,0.95)',
                border: '1px solid rgba(255,255,255,0.58)',
                boxShadow: '0 22px 54px rgba(44,35,21,0.2)',
              }}
            >
              <Box
                sx={{
                  width: 1,
                  aspectRatio: '4 / 3',
                  overflow: 'hidden',
                  display: 'block',
                  position: 'relative',
                  bgcolor: 'rgba(42,55,54,0.16)',
                }}
              >
                <Box
                  component={RouterLink}
                  href={getStoryHref(article)}
                  sx={{ position: 'absolute', inset: 0, display: 'block' }}
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

                <CreatorArticleEngagement
                  compact
                  overlay
                  articleId={article.id}
                  shareTitle={article.title}
                  shareUrl={getStoryHref(article)}
                  initialStats={{
                    liked: article.liked ?? false,
                    likeCount: article.likeCount ?? 0,
                    viewCount: article.viewCount ?? 0,
                  }}
                />
              </Box>

              <Stack spacing={1.25} sx={{ p: { xs: 2, md: 2.25 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Chip
                    size="small"
                    component={RouterLink}
                    href={getCultureCategoryHref(article.categoryKey, article.categoryLabel)}
                    clickable
                    label={article.categoryLabel || 'บทความ'}
                    sx={{
                      height: 24,
                      maxWidth: 150,
                      color: '#4b3523',
                      bgcolor: 'rgba(234,215,161,0.58)',
                      fontWeight: 800,
                      textDecoration: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(234,215,161,0.78)',
                      },
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
                  component={RouterLink}
                  href={getStoryHref(article)}
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
                    textDecoration: 'none',
                    '&:hover': { color: '#7b5a31' },
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

                <Button
                  size="small"
                  component={RouterLink}
                  href={getStoryHref(article)}
                  sx={{ alignSelf: 'flex-start', color: '#7b5a31', fontSize: 13, fontWeight: 900 }}
                >
                  อ่านต่อ
                </Button>
              </Stack>
            </Box>
          ))}
        </Box>

        <Box
          ref={loadMoreRef}
          sx={{
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading && <CircularProgress size={30} sx={{ color: PAGE_TEXT }} />}
        </Box>
      </Stack>
    </Box>
  );
}

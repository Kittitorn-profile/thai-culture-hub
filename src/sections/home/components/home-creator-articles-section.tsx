'use client';

import type { CreatorArticlePreview } from './home-types';

import { useRef, useEffect } from 'react';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { CreatorArticleEngagement } from 'src/sections/creator/components/creator-article-engagement';

import { getCultureCategoryHref, formatCreatorArticleDate } from './home-utils';
import { HOME_DEEP, HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

type Props = {
  articles: CreatorArticlePreview[];
  hasMore: boolean;
  isLoading: boolean;
  offset: number;
  onLoadMore: (offset: number) => void;
};

export function HomeCreatorArticlesSection({ articles, hasMore, isLoading, offset, onLoadMore }: Props) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting) {
          onLoadMore(offset);
        }
      },
      { rootMargin: '280px 0px' }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, offset, onLoadMore]);

  return (
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
          {articles.map((article) => (
            <Box
              key={article.id}
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
                  display: 'block',
                  position: 'relative',
                  bgcolor: 'rgba(42,55,54,0.16)',
                }}
              >
                <CreatorArticleEngagement
                  compact
                  overlay
                  articleId={article.id}
                  shareTitle={article.title}
                  shareUrl={`/creator-stories/${encodeURIComponent(article.slug || article.id)}`}
                  initialStats={{
                    liked: article.liked ?? false,
                    likeCount: article.likeCount ?? 0,
                    viewCount: article.viewCount ?? 0,
                  }}
                />

                <Box
                  component={RouterLink}
                  href={`/creator-stories/${encodeURIComponent(article.slug || article.id)}`}
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
                  href={`/creator-stories/${encodeURIComponent(article.slug || article.id)}`}
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
                    '&:hover': {
                      color: '#7b5a31',
                    },
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

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack
                    component={RouterLink}
                    href={`/creator-stories/creator/${encodeURIComponent(article.creatorId)}`}
                    direction="row"
                    spacing={0.85}
                    alignItems="center"
                    sx={{
                      minWidth: 0,
                      color: 'inherit',
                      textDecoration: 'none',
                      '&:hover .creator-name': {
                        color: '#7b5a31',
                      },
                    }}
                  >
                    <Avatar
                      src={article.creatorAvatarUrl || undefined}
                      alt={article.creatorName || 'Creator'}
                      sx={{ width: 28, height: 28, bgcolor: '#7b8476', fontSize: 12 }}
                    />
                    <Typography
                      className="creator-name"
                      sx={{ color: 'rgba(75,53,35,0.62)', fontSize: 12 }}
                      noWrap
                    >
                      {article.creatorName || 'Creator'}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    component={RouterLink}
                    href={`/creator-stories/${encodeURIComponent(article.slug || article.id)}`}
                    sx={{ color: '#7b5a31', fontSize: 13, fontWeight: 900 }}
                  >
                    อ่านต่อ
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>

        <Box
          ref={loadMoreRef}
          sx={{
            mt: 4,
            minHeight: 48,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoading && <CircularProgress size={28} sx={{ color: HOME_TEXT }} />}
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import { FacebookIcon, FacebookShareButton } from 'react-share';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

export type CreatorArticleStats = {
  liked: boolean;
  likeCount: number;
  viewCount: number;
};

type CreatorArticleEngagementProps = {
  articleId: string;
  shareUrl: string;
  shareTitle: string;
  initialStats?: Partial<CreatorArticleStats>;
  recordView?: boolean;
  compact?: boolean;
  overlay?: boolean;
};

type StatsResponse = {
  data?: {
    articleId?: string;
    liked?: boolean;
    likeCount?: number;
    viewCount?: number;
  };
  message?: string;
};

function getShareUrl(shareUrl: string) {
  if (/^https?:\/\//i.test(shareUrl)) {
    return shareUrl;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`}`;
  }

  return shareUrl;
}

function getCountLabel(value: number) {
  return value ? value.toLocaleString('th-TH') : '0';
}

export function CreatorArticleEngagement({
  articleId,
  shareUrl,
  shareTitle,
  initialStats,
  recordView = false,
  compact = false,
  overlay = false,
}: CreatorArticleEngagementProps) {
  const [stats, setStats] = useState<CreatorArticleStats>({
    liked: initialStats?.liked ?? false,
    likeCount: initialStats?.likeCount ?? 0,
    viewCount: initialStats?.viewCount ?? 0,
  });
  const [isLiking, setIsLiking] = useState(false);
  const absoluteShareUrl = useMemo(() => getShareUrl(shareUrl), [shareUrl]);

  const syncStats = useCallback((data?: StatsResponse['data']) => {
    if (!data) {
      return;
    }

    setStats({
      liked: Boolean(data.liked),
      likeCount: data.likeCount ?? 0,
      viewCount: data.viewCount ?? 0,
    });
  }, []);

  useEffect(() => {
    if (!recordView || !articleId) {
      return;
    }

    fetch('/api/creator/articles/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, action: 'view' }),
    })
      .then((response) => response.json())
      .then((json: StatsResponse) => syncStats(json.data))
      .catch(() => {});
  }, [articleId, recordView, syncStats]);

  const handleLike = async () => {
    if (!articleId || isLiking) {
      return;
    }

    const previousStats = stats;
    const nextLiked = !stats.liked;

    setIsLiking(true);
    setStats({
      ...stats,
      liked: nextLiked,
      likeCount: Math.max(0, stats.likeCount + (nextLiked ? 1 : -1)),
    });

    try {
      const response = await fetch('/api/creator/articles/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, action: 'like' }),
      });
      const json = (await response.json().catch(() => ({}))) as StatsResponse;

      if (!response.ok || !json.data) {
        throw new Error(json.message ?? 'Unable to update article like');
      }

      syncStats(json.data);
    } catch {
      setStats(previousStats);
    } finally {
      setIsLiking(false);
    }
  };

  if (overlay) {
    return (
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{
          left: 0,
          right: 0,
          top: 0,
          zIndex: 3,
          p: { xs: 1.1, sm: 1.25 },
          position: 'absolute',
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(180deg, rgba(42,55,54,0.58) 0%, rgba(42,55,54,0) 100%)',
        }}
      >
        <Stack
          direction="row"
          spacing={0.65}
          alignItems="center"
          sx={{
            px: 1,
            py: 0.65,
            minWidth: 54,
            color: '#fff',
            borderRadius: 999,
            fontWeight: 950,
            pointerEvents: 'auto',
            bgcolor: 'rgba(42,55,54,0.7)',
            border: '1px solid rgba(255,255,255,0.26)',
            boxShadow: '0 10px 24px rgba(18,24,24,0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Iconify icon="solar:eye-bold" width={compact ? 17 : 19} />
          <Typography sx={{ color: 'inherit', fontSize: compact ? 12 : 14, fontWeight: 950 }}>
            {getCountLabel(stats.viewCount)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center">
          <Button
            size={compact ? 'small' : 'medium'}
            disabled={isLiking}
            onClick={handleLike}
            startIcon={<Iconify icon={stats.liked ? 'solar:heart-bold' : 'solar:heart-outline'} />}
            sx={{
              m: 0,
              px: compact ? 1.05 : 1.25,
              py: compact ? 0.72 : 0.85,
              minWidth: 0,
              color: '#fff',
              borderRadius: 999,
              fontWeight: 950,
              pointerEvents: 'auto',
              bgcolor: stats.liked ? '#ff4f33' : 'rgba(42,55,54,0.68)',
              border: `1px solid ${stats.liked ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.24)'}`,
              boxShadow: '0 10px 24px rgba(18,24,24,0.24)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                bgcolor: stats.liked ? '#ec4027' : 'rgba(42,55,54,0.82)',
              },
              '& .MuiButton-startIcon': {
                mr: 0.65,
              },
            }}
          >
            {getCountLabel(stats.likeCount)}
          </Button>

          <FacebookShareButton
            url={absoluteShareUrl}
            hashtag="#ThailandCulturalHub"
            title={shareTitle}
            style={{ pointerEvents: 'auto' }}
          >
            <Stack
              direction="row"
              spacing={0.55}
              alignItems="center"
              sx={{
                px: compact ? 0.85 : 1,
                py: compact ? 0.62 : 0.72,
                color: '#fff',
                borderRadius: 999,
                fontSize: compact ? 12 : 13,
                fontWeight: 950,
                bgcolor: 'rgba(237,241,244,0.9)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 10px 24px rgba(18,24,24,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <FacebookIcon size={compact ? 20 : 22} round />
              <span style={{ color: '#7c7f83' }}>แชร์</span>
            </Stack>
          </FacebookShareButton>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={compact ? 0.75 : 1}
      alignItems="center"
      sx={{ flexWrap: 'wrap', rowGap: 1 }}
    >
      <Stack direction="row" spacing={0.6} alignItems="center">
        <Iconify icon="solar:eye-bold" width={compact ? 17 : 19} />
        <Typography sx={{ fontSize: compact ? 12 : 14, fontWeight: 900 }}>
          {getCountLabel(stats.viewCount)}
        </Typography>
      </Stack>

      <Button
        size={compact ? 'small' : 'medium'}
        variant={stats.liked ? 'contained' : 'outlined'}
        color={stats.liked ? 'error' : 'inherit'}
        disabled={isLiking}
        onClick={handleLike}
        startIcon={<Iconify icon={stats.liked ? 'solar:heart-bold' : 'solar:heart-outline'} />}
        sx={{
          fontWeight: 900,
          borderRadius: 20,
          ml: 2,
          px: compact ? 0.8 : 1,
          py: 1,
        }}
      >
        {getCountLabel(stats.likeCount)}
      </Button>

      <FacebookShareButton
        url={absoluteShareUrl}
        hashtag="#ThailandCulturalHub"
        title={shareTitle}
        style={{ color: '#ffffff' }}
      >
        <Stack
          direction="row"
          spacing={0.6}
          alignItems="center"
          sx={{
            px: compact ? 0.8 : 1,
            py: compact ? 0.45 : 0.65,
            borderRadius: 999,
            color: '#ffffff',
            bgcolor: 'rgba(24,119,242,0.08)',
            fontSize: compact ? 12 : 13,
            fontWeight: 900,
          }}
        >
          <FacebookIcon size={compact ? 18 : 20} round />
          <span>แชร์</span>
        </Stack>
      </FacebookShareButton>
    </Stack>
  );
}

'use client';

import type { MouseEvent } from 'react';
import type { PerformanceGroupsContent } from './home-types';

import { useRef, useState, useEffect } from 'react';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { HOME_DEEP, HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const PERFORMANCE_GROUP_BATCH_SIZE = 6;

type Props = {
  content: PerformanceGroupsContent;
};

export function HomePerformanceGroupsSection({ content }: Props) {
  const performanceGroupsLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [visibleCount, setVisibleCount] = useState(PERFORMANCE_GROUP_BATCH_SIZE);
  const [shareMenu, setShareMenu] = useState<{ anchorEl: HTMLElement; groupId: string } | null>(
    null
  );
  const [counts, setCounts] = useState<Record<string, { views: number; shares: number }>>({});

  const publishedGroups = (content?.groups ?? [])
    .filter((group) => group.isPublished !== false)
    .slice()
    .sort((first, second) => Number(second.isFeatured) - Number(first.isFeatured));
  const categories = Array.from(
    new Set(
      publishedGroups
        .map((group) => group.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  );
  const filteredGroups =
    selectedCategory === 'ทั้งหมด'
      ? publishedGroups
      : publishedGroups.filter((group) => group.category?.trim() === selectedCategory);
  const visibleGroups = filteredGroups.slice(0, visibleCount);
  const hasMoreGroups = visibleCount < filteredGroups.length;

  useEffect(() => {
    setVisibleCount(PERFORMANCE_GROUP_BATCH_SIZE);
  }, [content, selectedCategory]);

  useEffect(() => {
    const categoryStillExists = (content?.groups ?? []).some(
      (group) => group.isPublished !== false && group.category?.trim() === selectedCategory
    );

    if (selectedCategory !== 'ทั้งหมด' && !categoryStillExists) {
      setSelectedCategory('ทั้งหมด');
    }
  }, [content, selectedCategory]);

  useEffect(() => {
    const target = performanceGroupsLoadMoreRef.current;

    if (!target || !hasMoreGroups) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.unobserve(entry.target);
          setVisibleCount((currentCount) =>
            Math.min(currentCount + PERFORMANCE_GROUP_BATCH_SIZE, filteredGroups.length)
          );
        }
      },
      { rootMargin: '160px 0px' }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [filteredGroups.length, hasMoreGroups, visibleCount]);

  useEffect(() => {
    const groupIds = (content?.groups ?? [])
      .filter((group) => group.isPublished !== false)
      .map((group) => group.id || group.name);

    if (groupIds.length === 0) {
      return undefined;
    }

    const controller = new AbortController();

    fetch(`/api/performance-groups/counts?groupIds=${encodeURIComponent(groupIds.join(','))}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { data?: Record<string, { views: number; shares: number }> } | null) => {
        if (json?.data) {
          setCounts(json.data);
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Unable to load performance group counts', error);
        }
      });

    return () => controller.abort();
  }, [content]);

  const handleShare = (platform: 'facebook' | 'line', groupId: string) => {
    trackAnalyticsEvent('performance_group_share', groupId, { platform, groupId });
    setCounts((currentCounts) => ({
      ...currentCounts,
      [groupId]: {
        views: currentCounts[groupId]?.views ?? 0,
        shares: (currentCounts[groupId]?.shares ?? 0) + 1,
      },
    }));

    const detailUrl = new URL(paths.performanceGroup.details(groupId), window.location.origin);
    const encodedUrl = encodeURIComponent(detailUrl.toString());
    const shareUrl =
      platform === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        : `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;

    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  const handleOpenShareMenu = (event: MouseEvent<HTMLElement>, groupId: string) => {
    setShareMenu({ anchorEl: event.currentTarget, groupId });
  };

  const handleSelectShare = (platform: 'facebook' | 'line') => {
    if (!shareMenu) return;
    handleShare(platform, shareMenu.groupId);
    setShareMenu(null);
  };

  if (!content) return null;

  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 8, md: 12 },
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'clip',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(42,55,54,0.06)',
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          width: '100%',
          minWidth: 0,
          maxWidth: HOME_SECTION_MAX_WIDTH,
        }}
      >
        <Typography variant="overline" sx={{ display: 'block', letterSpacing: 2, fontWeight: 900 }}>
          ศิลปิน วงดนตรี และคณะการแสดง
        </Typography>
        <Typography component="h2" sx={{ mt: 1, mb: 2, fontSize: { xs: 28, md: 40 }, fontWeight: 900 }}>
          {content.title}
        </Typography>
        {content.description && (
          <Typography sx={{ mb: 4, maxWidth: 760, lineHeight: 1.75 }}>
            {content.description}
          </Typography>
        )}

        {categories.length > 1 && (
          <Box sx={{ mb: { xs: 3, md: 4 }, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1.25, color: 'rgba(248,246,238,0.72)', fontWeight: 800 }}
            >
              เลือกหมวดหมู่วง
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="กรองวงตามหมวดหมู่">
              {['ทั้งหมด', ...categories].map((category) => {
                const isSelected = selectedCategory === category;
                const categoryCount =
                  category === 'ทั้งหมด'
                    ? publishedGroups.length
                    : publishedGroups.filter((group) => group.category?.trim() === category).length;

                return (
                  <Chip
                    key={category}
                    clickable
                    label={`${category} ${categoryCount}`}
                    onClick={() => setSelectedCategory(category)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      height: 38,
                      color: isSelected ? '#35413d' : HOME_TEXT,
                      fontWeight: 850,
                      bgcolor: isSelected ? 'rgba(234,215,161,0.94)' : 'rgba(42,55,54,0.18)',
                      borderColor: isSelected
                        ? 'rgba(255,239,187,0.94)'
                        : 'rgba(248,246,238,0.42)',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(242,224,171,1)' : 'rgba(248,246,238,0.12)',
                      },
                      '& .MuiChip-label': { px: 1.5 },
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            gap: 3,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {visibleGroups.map((group) => {
            const groupId = group.id || group.name;
            const yearlyThumbnail = group.yearlyData.find(
              (record) => record.performanceImages?.length
            )?.performanceImages?.[0];
            const thumbnailUrl = group.coverImageUrl || yearlyThumbnail || group.logoUrl;
            const usesLogoAsThumbnail = !group.coverImageUrl && !yearlyThumbnail;

            return (
              <Box
                key={groupId}
                sx={{
                  p: { xs: 2, md: 3 },
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  position: 'relative',
                  color: HOME_TEXT,
                  bgcolor: 'rgba(69,80,72,0.94)',
                  border: '1px solid rgba(248,246,238,0.2)',
                  borderTop: `4px solid ${group.primaryColor || HOME_DEEP}`,
                  boxShadow: '0 16px 36px rgba(31,40,38,0.18)',
                  isolation: 'isolate',
                  transition: 'transform 180ms ease, box-shadow 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'rgba(248,246,238,0.4)',
                    boxShadow: '0 24px 54px rgba(31,40,38,0.24)',
                  },
                }}
              >
                <Box
                  component={RouterLink}
                  href={paths.performanceGroup.details(groupId)}
                  aria-label={`ดูรายละเอียด ${group.name}`}
                  sx={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: 'inherit' }}
                />

                {thumbnailUrl ? (
                  <Box
                    component="img"
                    src={thumbnailUrl}
                    alt={`ภาพตัวอย่าง ${group.name}`}
                    sx={{
                      width: '100%',
                      maxWidth: '100%',
                      mb: 2.5,
                      display: 'block',
                      aspectRatio: '16 / 9',
                      objectFit: usesLogoAsThumbnail ? 'contain' : 'cover',
                      p: usesLogoAsThumbnail ? { xs: 4, md: 5 } : 0,
                      borderRadius: 2,
                      bgcolor: usesLogoAsThumbnail
                        ? `${group.primaryColor || HOME_DEEP}26`
                        : 'transparent',
                      backgroundImage: usesLogoAsThumbnail
                        ? `radial-gradient(circle, rgba(248,246,238,0.2), ${group.primaryColor || HOME_DEEP}20)`
                        : 'none',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 1,
                      mb: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      aspectRatio: '16 / 9',
                      borderRadius: 2,
                      color: 'rgba(248,246,238,0.72)',
                      background: `linear-gradient(135deg, ${group.primaryColor || HOME_DEEP}88, rgba(42,55,54,0.72))`,
                    }}
                  >
                    <Iconify icon="solar:video-frame-play-horizontal-bold" width={52} />
                  </Box>
                )}

                <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    {group.logoUrl && (
                      <Avatar
                        variant="circular"
                        src={group.logoUrl}
                        alt={`โลโก้ ${group.name}`}
                        sx={{ width: 56, height: 56, flexShrink: 0 }}
                      />
                    )}
                    <Typography
                      variant="h5"
                      sx={{
                        minWidth: 0,
                        fontWeight: 900,
                        color: HOME_DEEP,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {group.name}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                  {group.provinceName && (
                    <Chip
                      label={`จังหวัด${group.provinceName}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        color: HOME_TEXT,
                        fontWeight: 700,
                        bgcolor: 'rgba(248,246,238,0.08)',
                        borderColor: 'rgba(248,246,238,0.48)',
                      }}
                    />
                  )}
                  {group.isFeatured && (
                    <Chip
                      label="วงแนะนำ"
                      size="small"
                      sx={{
                        color: '#4b402d',
                        fontWeight: 800,
                        bgcolor: 'rgba(234,215,161,0.82)',
                        border: '1px solid rgba(234,215,161,0.95)',
                      }}
                    />
                  )}
                  {group.acceptsBookings && (
                    <Chip
                      label="เปิดรับงาน"
                      size="small"
                      variant="outlined"
                      sx={{
                        color: '#b9f6ca',
                        fontWeight: 800,
                        bgcolor: 'rgba(46,125,50,0.16)',
                        borderColor: 'rgba(105,240,174,0.72)',
                      }}
                    />
                  )}
                </Stack>

                {group.description && (
                  <Typography
                    sx={{
                      mt: 2,
                      color: 'rgba(248,246,238,0.76)',
                      lineHeight: 1.7,
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {group.description}
                  </Typography>
                )}

                <Box
                  sx={{
                    pt: 1,
                    mt: 1,
                    position: 'relative',
                    zIndex: 1,
                    borderTop: '1px solid rgba(248,246,238,0.16)',
                  }}
                >
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Button
                      component={RouterLink}
                      href={paths.performanceGroup.details(groupId)}
                      variant="contained"
                      size="small"
                      endIcon={<Iconify icon="eva:diagonal-arrow-right-up-fill" width={17} />}
                      sx={{ minHeight: 36, px: 1.75, fontSize: 13, fontWeight: 900 }}
                    >
                      ดูรายละเอียด
                    </Button>
                    {group.contactPhone && (
                      <Button
                        component="a"
                        href={`tel:${group.contactPhone}`}
                        variant="outlined"
                        size="small"
                        sx={{
                          minHeight: 36,
                          px: 1.5,
                          color: HOME_TEXT,
                          fontSize: 13,
                          borderColor: 'rgba(248,246,238,0.32)',
                        }}
                      >
                        โทรติดต่อ
                      </Button>
                    )}
                    {group.facebookUrl && (
                      <Button
                        component="a"
                        href={group.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{
                          minWidth: 0,
                          px: 0.75,
                          color: 'rgba(248,246,238,0.72)',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Facebook
                      </Button>
                    )}
                    {group.youtubeUrl && (
                      <Button
                        component="a"
                        href={group.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{
                          minWidth: 0,
                          px: 0.75,
                          color: 'rgba(248,246,238,0.72)',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        YouTube
                      </Button>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mt: 2 }}>
                    <Stack
                      direction="row"
                      spacing={0.55}
                      alignItems="center"
                      sx={{ color: 'rgba(248,246,238,0.68)' }}
                    >
                      <Iconify icon="solar:eye-bold" width={18} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        {counts[groupId]?.views ?? 0} ครั้ง
                      </Typography>
                    </Stack>
                    <Button
                      type="button"
                      size="small"
                      aria-label={`แชร์ ${group.name}`}
                      aria-haspopup="menu"
                      aria-expanded={shareMenu?.groupId === groupId ? 'true' : undefined}
                      startIcon={<Iconify icon="solar:share-bold" width={18} />}
                      onClick={(event) => handleOpenShareMenu(event, groupId)}
                      sx={{
                        minWidth: 0,
                        px: 0.75,
                        color: 'rgba(248,246,238,0.78)',
                        fontSize: 12,
                        fontWeight: 800,
                        '&:hover': { bgcolor: 'rgba(248,246,238,0.1)' },
                      }}
                    >
                      {counts[groupId]?.shares ?? 0} แชร์
                    </Button>
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Popover
          open={Boolean(shareMenu)}
          anchorEl={shareMenu?.anchorEl}
          onClose={() => setShareMenu(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                p: 2,
                width: 230,
                borderRadius: 2,
                bgcolor: '#f8f6ee',
                boxShadow: '0 18px 44px rgba(31,40,38,0.28)',
              },
            },
          }}
        >
          <Typography sx={{ mb: 1.25, color: '#26312f', fontWeight: 900 }}>แชร์วงนี้</Typography>
          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Iconify icon="solar:share-bold" width={20} />}
              onClick={() => handleSelectShare('facebook')}
              sx={{ justifyContent: 'flex-start', bgcolor: '#1877f2' }}
            >
              Facebook
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Iconify icon="solar:share-bold" width={20} />}
              onClick={() => handleSelectShare('line')}
              sx={{ justifyContent: 'flex-start', bgcolor: '#06c755' }}
            >
              LINE
            </Button>
          </Stack>
        </Popover>
        {hasMoreGroups && (
          <Stack
            ref={performanceGroupsLoadMoreRef}
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 80, mt: 2, color: 'rgba(248,246,238,0.76)' }}
          >
            <CircularProgress size={22} color="inherit" />
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              กำลังโหลดวงเพิ่มเติม
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

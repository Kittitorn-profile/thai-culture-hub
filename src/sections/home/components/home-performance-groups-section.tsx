'use client';

import type { MouseEvent } from 'react';
import type { PerformanceGroupsContent } from './home-types';

import { useState, useEffect } from 'react';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const PERFORMANCE_GROUP_BATCH_SIZE = 9;

type Props = {
  content: PerformanceGroupsContent;
  showAll?: boolean;
};

export function HomePerformanceGroupsSection({ content, showAll = false }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [failedImages, setFailedImages] = useState<Record<string, string>>({});
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
  const visibleGroups = showAll
    ? filteredGroups
    : filteredGroups.slice(0, PERFORMANCE_GROUP_BATCH_SIZE);

  useEffect(() => {
    const categoryStillExists = (content?.groups ?? []).some(
      (group) => group.isPublished !== false && group.category?.trim() === selectedCategory
    );

    if (selectedCategory !== 'ทั้งหมด' && !categoryStillExists) {
      setSelectedCategory('ทั้งหมด');
    }
  }, [content, selectedCategory]);

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
      component="section"
      aria-labelledby="performance-groups-heading"
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 5, md: 7 },
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'clip',
        position: 'relative',
        zIndex: 1,
        background: 'transparent',
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
            gap: { xs: 1.5, md: 6 },
            alignItems: 'end',
            mb: { xs: 3, md: 4 },
          }}
        >
          <Box>
            <Typography sx={{ mb: 1, color: '#727b7f', fontSize: 12, fontWeight: 500 }}>
              ศิลปินและคณะการแสดง
            </Typography>
            <Typography
              id="performance-groups-heading"
              component="h2"
              sx={{
                fontSize: { xs: 28, md: 36 },
                fontWeight: 600,
                lineHeight: 1.4,
                color: HOME_TEXT,
              }}
            >
              {content.title}
            </Typography>
          </Box>
          {content.description && (
            <Typography
              sx={{
                maxWidth: 480,
                color: '#626a6e',
                fontSize: 15,
                lineHeight: 1.8,
                justifySelf: { md: 'end' },
              }}
            >
              {content.description}
            </Typography>
          )}
        </Box>

        {categories.length > 1 && (
          <Box
            sx={{
              mb: 3,
              py: 2,
              minWidth: 0,
              borderTop: '1px solid #e0e4e0',
              borderBottom: '1px solid #e0e4e0',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ color: '#727b7f', fontSize: 13, fontWeight: 500 }}>
              หมวดหมู่
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              aria-label="กรองวงตามหมวดหมู่"
            >
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
                    aria-pressed={isSelected}
                    label={`${category} ${categoryCount}`}
                    onClick={() => setSelectedCategory(category)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      height: 34,
                      borderRadius: 1.25,
                      fontSize: 13,
                      color: isSelected ? '#fff' : HOME_TEXT,
                      fontWeight: 500,
                      bgcolor: isSelected ? '#252d31' : '#fff',
                      borderColor: isSelected ? '#252d31' : '#dde1dd',
                      '&:hover': {
                        bgcolor: isSelected ? '#3b464c' : '#f0f2ef',
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
          role="region"
          aria-label={
            showAll
              ? 'วงศิลปินและวงดนตรีทั้งหมด'
              : 'วงศิลปินและวงดนตรี เลื่อนซ้ายขวาเพื่อดูเพิ่มเติม'
          }
          tabIndex={showAll ? undefined : 0}
          sx={{
            width: showAll
              ? '100%'
              : { xs: 'calc(100% + 32px)', sm: 'calc(100% + 64px)', md: '100%' },
            minWidth: 0,
            mx: showAll ? 0 : { xs: -2, sm: -4, md: 0 },
            px: showAll ? 0 : { xs: 2, sm: 4, md: 0 },
            pb: { xs: 1, md: 0 },
            overflowX: showAll ? 'visible' : { xs: 'auto', md: 'visible' },
            scrollSnapType: showAll ? 'none' : { xs: 'x mandatory', md: 'none' },
            scrollPaddingInline: { xs: '16px', sm: '32px', md: 0 },
            overscrollBehaviorX: 'contain',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            gap: { xs: 2, md: 3 },
            display: showAll ? 'grid' : { xs: 'flex', md: 'grid' },
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {visibleGroups.map((group) => {
            const groupId = group.id || group.name;
            const yearlyThumbnail = group.yearlyData.find(
              (record) => record.performanceImages?.length
            )?.performanceImages?.[0];
            const thumbnailUrl =
              group.coverImageUrl?.trim() || yearlyThumbnail?.trim() || group.logoUrl?.trim();
            const hasImage = Boolean(thumbnailUrl && failedImages[groupId] !== thumbnailUrl);
            const usesLogoAsThumbnail = !group.coverImageUrl && !yearlyThumbnail;

            return (
              <Box
                key={groupId}
                sx={{
                  flex: showAll ? undefined : { xs: '0 0 88%', md: 'initial' },
                  scrollSnapAlign: 'start',
                  minWidth: 0,
                  height: { xs: 340, md: 370 },
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2.5,
                  bgcolor: hasImage ? '#30393d' : '#e8ece8',
                  ...(!hasImage && {
                    border: '1px solid #dde3dd',
                    '& .MuiTypography-root': { color: '#303c37', textShadow: 'none' },
                    '& .MuiButton-root': { color: '#303c37', bgcolor: '#ffffffb3' },
                  }),
                  isolation: 'isolate',
                  color: '#fff',
                  '&:hover .group-cover': { transform: 'scale(1.04)' },
                  '&:focus-within': { outline: '2px solid #505b63', outlineOffset: 4 },
                  '@media (prefers-reduced-motion: reduce)': {
                    '& .group-cover': { transition: 'none' },
                  },
                }}
              >
                {hasImage && (
                  <Box
                    component="img"
                    className="group-cover"
                    src={thumbnailUrl}
                    alt={`ภาพการแสดง ${group.name}`}
                    onError={() =>
                      setFailedImages((current) => ({ ...current, [groupId]: thumbnailUrl! }))
                    }
                    loading="lazy"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: 1,
                      height: 1,
                      objectFit: usesLogoAsThumbnail ? 'contain' : 'cover',
                      p: usesLogoAsThumbnail ? 5 : 0,
                      transition: 'transform 350ms ease',
                    }}
                  />
                )}
                {!hasImage && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: '50px 0 140px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                      color: '#92a399',
                      pointerEvents: 'none',
                    }}
                  >
                    <Box
                      component="img"
                      src="/logo/logo-full.svg"
                      alt="Thailand Cultural Hub"
                      sx={{ width: 140, maxWidth: '60%', maxHeight: 80, objectFit: 'contain' }}
                    />
                  </Box>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: hasImage
                      ? 'linear-gradient(180deg, transparent 35%, rgba(10,16,20,.08) 50%, rgba(10,16,20,.38) 72%, rgba(10,16,20,.78) 100%)'
                      : 'none',
                    pointerEvents: 'none',
                  }}
                />
                <Box
                  component={RouterLink}
                  href={paths.performanceGroup.details(groupId)}
                  aria-label={`ดูรายละเอียด ${group.name}`}
                  sx={{ position: 'absolute', inset: 0, zIndex: 1 }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ position: 'absolute', top: 16, left: 16, right: 16, pointerEvents: 'none' }}
                >
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      bgcolor: '#fffffff0',
                      color: '#30393d',
                      borderRadius: 99,
                      fontSize: 11,
                    }}
                  >
                    {group.category || 'ศิลปะการแสดง'}
                  </Box>
                  {group.isFeatured && (
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        bgcolor: '#242d32cc',
                        color: '#fff',
                        borderRadius: 99,
                        fontSize: 11,
                      }}
                    >
                      วงแนะนำ
                    </Box>
                  )}
                </Stack>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2.5,
                    pointerEvents: 'none',
                  }}
                >
                  {group.provinceName && (
                    <Typography sx={{ fontSize: 12, color: '#ffffffbd', mb: 0.75 }}>
                      {group.provinceName}
                    </Typography>
                  )}
                  <Stack alignItems="flex-start" spacing={1.25} sx={{ mb: 1 }}>
                    {group.logoUrl && (
                      <Avatar
                        src={group.logoUrl}
                        alt={`โลโก้ ${group.name}`}
                        sx={{
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          bgcolor: '#fff',
                          border: '2px solid #ffffffcc',
                          '& img': { objectFit: 'contain' },
                        }}
                      />
                    )}
                    <Typography
                      component="h3"
                      sx={{
                        fontSize: { xs: 23, md: 25 },
                        textShadow: '0 1px 6px rgba(0,0,0,.5)',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minWidth: 0,
                      }}
                    >
                      {group.name}
                    </Typography>
                  </Stack>
                  {group.description && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: '#ffffffe0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      {group.description}
                    </Typography>
                  )}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ position: 'relative', zIndex: 2, pointerEvents: 'auto' }}
                  >
                    <Button
                      component={RouterLink}
                      href={paths.performanceGroup.details(groupId)}
                      size="small"
                      endIcon={<Iconify icon="eva:diagonal-arrow-right-up-fill" width={15} />}
                      sx={{
                        bgcolor: '#fff',
                        color: '#252d31',
                        borderRadius: 99,
                        px: 2,
                        py: 0.8,
                        fontSize: 12,
                        fontWeight: 500,
                        '&:hover': { bgcolor: '#e6eae6' },
                      }}
                    >
                      รู้จักวงนี้
                    </Button>
                    <Stack direction="row" spacing={0.5}>
                      {group.facebookUrl && (
                        <Button
                          component="a"
                          href={group.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ color: '#fff', minWidth: 0, px: 1, fontSize: 11 }}
                        >
                          Facebook
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="small"
                        aria-label={`แชร์ ${group.name}`}
                        title={`${counts[groupId]?.views ?? 0} ครั้ง · ${counts[groupId]?.shares ?? 0} แชร์`}
                        aria-haspopup="menu"
                        aria-expanded={shareMenu?.groupId === groupId}
                        onClick={(event) => handleOpenShareMenu(event, groupId)}
                        sx={{
                          minWidth: 32,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          color: '#fff',
                          bgcolor: '#ffffff18',
                          '&:hover': { bgcolor: '#ffffff30' },
                        }}
                      >
                        <Iconify icon="solar:share-bold" width={16} />
                      </Button>
                    </Stack>
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
          <Typography sx={{ mb: 1.25, color: '#26312f', fontWeight: 600 }}>แชร์วงนี้</Typography>
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
        <Stack alignItems="center" spacing={1.5} sx={{ mt: 3 }}>
          <Typography role="status" sx={{ color: '#727b7f', fontSize: 12 }}>
            แสดง {visibleGroups.length} จาก {filteredGroups.length} รายการ
          </Typography>
          {!showAll && (
            <Button
              component={RouterLink}
              href="/performance-groups/"
              variant="outlined"
              endIcon={<Iconify icon="eva:external-link-fill" width={18} />}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 1.5,
                color: '#303b40',
                borderColor: '#d8deda',
                '&:hover': { bgcolor: '#ecefeb', borderColor: '#aab5ae' },
              }}
            >
              ดูทั้งหมด
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

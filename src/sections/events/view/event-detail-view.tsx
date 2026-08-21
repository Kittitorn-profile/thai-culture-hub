'use client';

import type {
  HomeEventItem,
  PerformanceGroupEntry,
  PerformanceGroupsContent,
} from 'src/sections/home/components/home-types';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { HomeFooter } from 'src/layouts/main/footer';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { trackAnalyticsEvent } from 'src/components/analytics';
import { Lightbox, useLightbox } from 'src/components/lightbox';

import {
  formatHomeEventDate,
  normalizePerformanceGroupsContent,
} from 'src/sections/home/components/home-utils';
import {
  HOME_DEEP,
  HOME_TEXT,
  HOME_SECTION_PX,
  HOME_SHARED_BACKGROUND,
  PERFORMANCE_GROUPS_SECTION_KEY,
} from 'src/sections/home/components/home-constants';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
const DEFAULT_EVENT_BACKGROUND = '#6f8790';
const SYSTEM_HASHTAG = '#ThailandCulturalHub';

const RESULT_STYLES: Record<string, { color: string; background: string; icon: string }> = {
  winner: { color: '#5b3a00', background: '#f4cf69', icon: 'solar:cup-star-bold' },
  'first-runner-up': {
    color: '#38434b',
    background: '#d8e0e5',
    icon: 'solar:medal-ribbons-star-bold',
  },
  'second-runner-up': {
    color: '#56311f',
    background: '#d7a079',
    icon: 'solar:medal-ribbons-star-bold',
  },
  qualified: { color: '#075b34', background: '#9ee2bd', icon: 'solar:check-circle-bold' },
  'not-qualified': { color: '#842029', background: '#f1b0b7', icon: 'solar:close-circle-bold' },
  'honorable-mention': { color: '#614600', background: '#eedb9a', icon: 'solar:medal-star-bold' },
  'best-male-singer': { color: '#164c78', background: '#add7f3', icon: 'solar:microphone-3-bold' },
  'best-female-singer': {
    color: '#74325e',
    background: '#efb9dd',
    icon: 'solar:microphone-3-bold',
  },
  'royal-honor': { color: '#633c00', background: '#efd18a', icon: 'solar:star-bold' },
};

function getEventBackground(backgroundColor?: string) {
  const color = backgroundColor || DEFAULT_EVENT_BACKGROUND;

  if (color.toLowerCase() === DEFAULT_EVENT_BACKGROUND) return HOME_SHARED_BACKGROUND;

  return `
    radial-gradient(circle at 50% 18%, rgba(255,255,255,0.22) 0%, transparent 52%),
    linear-gradient(180deg, ${color} 0%, ${color} 100%)
  `;
}

export function EventDetailView({ eventId }: { eventId: string }) {
  const [eventItem, setEventItem] = useState<HomeEventItem | null>();
  const [participatingGroups, setParticipatingGroups] = useState<PerformanceGroupEntry[]>([]);
  const [counts, setCounts] = useState({ views: 0, shares: 0 });
  const gallerySlides = useMemo(
    () => (eventItem?.imageUrls ?? []).map((src) => ({ src })),
    [eventItem?.imageUrls]
  );
  const galleryLightbox = useLightbox(gallerySlides);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/events/counts?eventIds=${encodeURIComponent(eventId)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { data?: Record<string, { views: number; shares: number }> } | null) => {
        if (json?.data?.[eventId]) setCounts(json.data[eventId]);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [eventId]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/events?id=${encodeURIComponent(eventId)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json: { data?: HomeEventItem | null }) => setEventItem(json.data ?? null))
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setEventItem(null);
      });

    return () => controller.abort();
  }, [eventId]);

  const handleShare = (platform: 'facebook' | 'line') => {
    trackAnalyticsEvent('event_share', eventId, { platform, eventId, hashtag: SYSTEM_HASHTAG });
    setCounts((current) => ({ ...current, shares: current.shares + 1 }));

    const trackedUrl = new URL(window.location.href);
    trackedUrl.searchParams.set('utm_source', platform);
    trackedUrl.searchParams.set('utm_medium', 'social');
    trackedUrl.searchParams.set('utm_campaign', 'event_share');
    const shareUrl = encodeURIComponent(trackedUrl.toString());
    const shareText = encodeURIComponent(
      `${eventItem?.title ?? 'กิจกรรมวัฒนธรรม'} ${SYSTEM_HASHTAG}`
    );
    const targetUrl =
      platform === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&hashtag=${encodeURIComponent(SYSTEM_HASHTAG)}`
        : `https://social-plugins.line.me/lineit/share?url=${shareUrl}&text=${shareText}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  useEffect(() => {
    fetch('/api/home-content')
      .then((response) => response.json())
      .then((json: { data?: Record<string, unknown> }) => {
        const content = normalizePerformanceGroupsContent(
          json.data?.[PERFORMANCE_GROUPS_SECTION_KEY] as PerformanceGroupsContent | undefined
        );
        setParticipatingGroups(
          (content?.groups ?? []).filter((group) =>
            group.yearlyData.some((record) => record.contestEventIds?.includes(eventId))
          )
        );
      })
      .catch(() => undefined);
  }, [eventId]);

  if (eventItem === undefined) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: HOME_SHARED_BACKGROUND,
        }}
      >
        <CircularProgress sx={{ color: HOME_TEXT }} />
      </Box>
    );
  }

  if (!eventItem) {
    return (
      <Box sx={{ minHeight: '100vh', py: 12, background: HOME_SHARED_BACKGROUND }}>
        <Container maxWidth="md">
          <Alert severity="info" sx={{ mb: 3 }}>
            ไม่พบกิจกรรมนี้ หรือกิจกรรมถูกปิดการเผยแพร่
          </Alert>
          <Button component={RouterLink} href={paths.about} variant="contained">
            กลับหน้าหลัก
          </Button>
        </Container>
      </Box>
    );
  }

  const mediaSource = eventItem.coverUrl || eventItem.mediaUrl;
  const eventBackground = getEventBackground(eventItem.backgroundColor);
  const details = [
    { icon: 'solar:calendar-date-bold', label: formatHomeEventDate(eventItem.startsAt) },
    { icon: 'solar:clock-circle-bold', label: eventItem.time },
    {
      icon: 'solar:map-point-bold',
      label: [eventItem.provinceName, eventItem.location].filter(Boolean).join(' - '),
    },
    { icon: 'solar:users-group-rounded-bold', label: eventItem.organizer },
  ].filter((item) => item.label);
  const displayGroups = participatingGroups;
  const displayCategories = eventItem.contestCategories ?? [];
  const resolveGroupCategoryId = (group: PerformanceGroupEntry) => {
    const participatingRecord = group.yearlyData.find((record) =>
      record.contestEventIds?.includes(eventId)
    );
    const storedCategory = participatingRecord?.contestCategoryIds?.[eventId]?.trim();

    if (storedCategory) {
      const matchedCategory = displayCategories.find(
        (category) =>
          category.id === storedCategory ||
          category.name.trim().toLocaleLowerCase('th') === storedCategory.toLocaleLowerCase('th')
      );

      if (matchedCategory) return matchedCategory.id;
    }

    return displayCategories.length === 1 ? displayCategories[0].id : '';
  };
  const participatingGroupsByCategory = displayCategories.map((category) => ({
    ...category,
    groups: displayGroups.filter((group) => resolveGroupCategoryId(group) === category.id),
  }));
  const categorizedGroupIds = new Set(
    participatingGroupsByCategory.flatMap((category) =>
      category.groups.map((group) => group.id || group.name)
    )
  );
  const participationSections = participatingGroupsByCategory.length
    ? [
        ...participatingGroupsByCategory,
        {
          id: 'uncategorized',
          name: 'ยังไม่ระบุประเภท',
          groups: displayGroups.filter((group) => !categorizedGroupIds.has(group.id || group.name)),
        },
      ].filter((category) => category.id !== 'uncategorized' || category.groups.length > 0)
    : [{ id: 'all', name: '', groups: displayGroups }];

  return (
    <Box sx={{ minHeight: '100vh', color: HOME_TEXT, background: eventBackground }}>
      <Box
        sx={{
          px: { xs: 0, sm: HOME_SECTION_PX.sm, md: HOME_SECTION_PX.md },
          pt: {
            xs: 'calc(var(--layout-header-mobile-height) + 20px)',
            md: 'calc(var(--layout-header-desktop-height) + 28px)',
          },
          pb: { xs: 3, md: 5 },
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 }, my: 3 }}>
          <Button
            component={RouterLink}
            href="/"
            color="inherit"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{
              mb: 3,
              px: 1.5,
              bgcolor: 'rgba(42,55,54,0.28)',
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: 'rgba(42,55,54,0.42)' },
            }}
          >
            กลับหน้าหลัก
          </Button>

          <Box
            sx={{
              overflow: 'hidden',
              borderRadius: 3,
              bgcolor: 'rgba(42,55,54,0.48)',
              border: '1px solid rgba(248,246,238,0.22)',
              boxShadow: '0 28px 80px rgba(31,40,38,0.28)',
            }}
          >
            <Box sx={{ width: 1, aspectRatio: '16 / 9', bgcolor: HOME_DEEP }}>
              {eventItem.mediaType === 'video' && eventItem.mediaUrl ? (
                <ReactPlayer src={eventItem.mediaUrl} controls width="100%" height="100%" />
              ) : mediaSource ? (
                <Image
                  src={mediaSource}
                  alt={eventItem.title}
                  ratio="16/9"
                  visibleByDefault
                  disablePlaceholder
                  sx={{ width: 1, height: 1, '& img': { objectFit: 'cover' } }}
                />
              ) : null}
            </Box>

            <Stack spacing={{ xs: 2.5, md: 3 }} sx={{ p: { xs: 2, sm: 3, md: 5 } }}>
              <Typography
                variant="overline"
                sx={{ color: 'rgba(234,215,161,0.95)', fontWeight: 900 }}
              >
                รายละเอียดกิจกรรมวัฒนธรรม
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2.5}
                alignItems={{ sm: 'center' }}
              >
                {eventItem.logoUrl && (
                  <Box
                    component="img"
                    src={eventItem.logoUrl}
                    alt={`โลโก้ ${eventItem.title}`}
                    sx={{
                      width: { xs: 88, md: 112 },
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      borderRadius: 2.5,
                      bgcolor: 'common.white',
                      border: '3px solid rgba(255,255,255,0.72)',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
                    }}
                  />
                )}
                <Typography
                  component="h3"
                  sx={{
                    fontSize: { xs: 26, sm: 32 },
                    lineHeight: 1.25,
                    fontWeight: 950,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {eventItem.title}
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                {details.map((detail) => (
                  <Stack
                    key={detail.icon}
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(248,246,238,0.07)' }}
                  >
                    <Iconify icon={detail.icon as never} width={22} />
                    <Typography>{detail.label}</Typography>
                  </Stack>
                ))}
              </Box>

              {(eventItem.descriptionHtml || eventItem.description) && (
                <Markdown
                  sx={{
                    maxWidth: 920,
                    color: 'rgba(248,246,238,0.82)',
                    fontSize: { xs: 16, md: 19 },
                    lineHeight: 1.9,
                    '& p': { mb: 1.5 },
                    '& h1, & h2, & h3, & h4': { color: HOME_TEXT, mt: 3, mb: 1.5 },
                    '& a': { color: 'rgba(234,215,161,1)' },
                    '& ul, & ol': { pl: 3 },
                  }}
                >
                  {eventItem.descriptionHtml || eventItem.description}
                </Markdown>
              )}

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{
                  p: { xs: 2, md: 2.25 },
                  borderRadius: 2.5,
                  bgcolor: 'rgba(22,31,30,0.24)',
                  border: '1px solid rgba(248,246,238,0.18)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.68, fontWeight: 900 }}>
                      แชร์กิจกรรมนี้
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ ml: 1, color: 'rgba(234,215,161,1)', fontWeight: 800 }}
                    >
                      {SYSTEM_HASHTAG}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon={'logos:facebook' as never} />}
                      onClick={() => handleShare('facebook')}
                      sx={{ bgcolor: '#1877f2', '&:hover': { bgcolor: '#1265d5' } }}
                    >
                      Facebook
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon={'simple-icons:line' as never} />}
                      onClick={() => handleShare('line')}
                      sx={{ bgcolor: '#06c755', '&:hover': { bgcolor: '#05ae4a' } }}
                    >
                      LINE
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Iconify icon="solar:eye-bold" width={21} />
                    <Typography variant="body2" fontWeight={800}>
                      {counts.views.toLocaleString('th-TH')} ครั้ง
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Iconify icon="solar:share-bold" width={21} />
                    <Typography variant="body2" fontWeight={800}>
                      กดแชร์ {counts.shares.toLocaleString('th-TH')} ครั้ง
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              {eventItem.imageUrls?.length ? (
                <Box
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 2.5,
                    bgcolor: 'rgba(248,246,238,0.07)',
                    border: '1px solid rgba(248,246,238,0.14)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        ภาพบรรยากาศกิจกรรม/รายละเอียด
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25, opacity: 0.62 }}>
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          คลิกที่ภาพเพื่อดูภาพขนาดใหญ่
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                          เลื่อนเพื่อดูภาพอื่น · แตะเพื่อขยาย
                        </Box>
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.68 }}>
                      {gallerySlides.length.toLocaleString('th-TH')} ภาพ
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      pb: { xs: 1, sm: 0 },
                      maxWidth: gallerySlides.length === 1 ? 620 : 'none',
                      overflowX: { xs: 'auto', sm: 'visible' },
                      scrollSnapType: { xs: 'x mandatory', sm: 'none' },
                      gridAutoFlow: { xs: 'column', sm: 'row' },
                      gridAutoColumns: { xs: '84%', sm: 'auto' },
                      gridTemplateColumns:
                        gallerySlides.length === 1
                          ? '1fr'
                          : { sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(248,246,238,0.35) transparent',
                      '&::-webkit-scrollbar': { height: 6 },
                      '&::-webkit-scrollbar-thumb': {
                        borderRadius: 999,
                        bgcolor: 'rgba(248,246,238,0.35)',
                      },
                    }}
                  >
                    {eventItem.imageUrls.map((imageUrl, index) => (
                      <Box
                        key={`${imageUrl}-${index}`}
                        component="button"
                        type="button"
                        aria-label={`ดูภาพกิจกรรม ${index + 1} ขนาดใหญ่`}
                        onClick={() => galleryLightbox.onOpen(imageUrl)}
                        sx={{
                          p: 0,
                          width: 1,
                          border: 0,
                          cursor: 'zoom-in',
                          overflow: 'hidden',
                          position: 'relative',
                          scrollSnapAlign: 'start',
                          aspectRatio: gallerySlides.length === 1 ? '16 / 10' : '4 / 3',
                          borderRadius: 2,
                          bgcolor: 'rgba(18,24,23,0.3)',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
                          '&:hover img': { transform: 'scale(1.04)' },
                          '&:focus-visible': {
                            outline: '3px solid rgba(234,215,161,0.9)',
                            outlineOffset: 3,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={`ภาพกิจกรรม ${eventItem.title} ${index + 1}`}
                          sx={{
                            width: 1,
                            height: 1,
                            display: 'block',
                            objectFit: gallerySlides.length === 1 ? 'contain' : 'cover',
                            transition: 'transform 180ms ease',
                          }}
                        />
                        <Box
                          sx={{
                            right: 10,
                            bottom: 10,
                            width: 34,
                            height: 34,
                            display: 'grid',
                            placeItems: 'center',
                            position: 'absolute',
                            borderRadius: '50%',
                            color: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          <Iconify icon="carbon:zoom-in" width={20} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : null}

              {displayGroups.length > 0 && (
                <Box>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={0.5}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      วงที่เข้าร่วม{eventItem.isContest ? 'การประกวด' : 'กิจกรรม'}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ opacity: 0.7 }}>
                        {displayGroups.length.toLocaleString('th-TH')} วง
                      </Typography>
                    </Stack>
                  </Stack>

                  {displayGroups.length > 0 || participatingGroupsByCategory.length > 0 ? (
                    <Stack spacing={2.5}>
                      {participationSections.map((section) => (
                        <Box key={section.id}>
                          {section.name && (
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              alignItems={{ sm: 'center' }}
                              spacing={1}
                              sx={{ mb: 1.5 }}
                            >
                              <Box>
                                <Typography
                                  variant="overline"
                                  sx={{ opacity: 0.58, fontWeight: 900, lineHeight: 1 }}
                                >
                                  {section.id === 'uncategorized'
                                    ? 'ข้อมูลรอจัดประเภท'
                                    : 'ประเภทการแข่งขัน'}
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 900 }}>
                                  {section.name}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 0.75,
                                  flexShrink: 0,
                                  borderRadius: 10,
                                  bgcolor: 'rgba(234,215,161,0.14)',
                                  border: '1px solid rgba(234,215,161,0.28)',
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                  {section.groups.length.toLocaleString('th-TH')}
                                  {' / '}
                                  {'maxParticipants' in section && section.maxParticipants
                                    ? section.maxParticipants.toLocaleString('th-TH')
                                    : 'ไม่จำกัด'}{' '}
                                  วง
                                </Typography>
                              </Box>
                            </Stack>
                          )}
                          <Box
                            sx={{
                              display: 'grid',
                              gap: 1.25,
                              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            }}
                          >
                            {section.groups.map((group) => {
                              const joinedYears = group.yearlyData
                                .filter((record) => record.contestEventIds?.includes(eventId))
                                .map((record) => record.year)
                                .filter(Boolean)
                                .join(', ');
                              const resultIds = Array.from(
                                new Set(
                                  group.yearlyData.flatMap(
                                    (record) => record.contestResultIds?.[eventId] ?? []
                                  )
                                )
                              );
                              const highlightedResultId = [
                                'winner',
                                'first-runner-up',
                                'second-runner-up',
                              ].find((resultId) => resultIds.includes(resultId));
                              const highlightedStyle = highlightedResultId
                                ? RESULT_STYLES[highlightedResultId]
                                : undefined;
                              const singerIds = group.yearlyData.flatMap(
                                (record) => record.contestSingerIds?.[eventId] ?? []
                              );
                              const leadPerformerIds = group.yearlyData.flatMap(
                                (record) => record.contestLeadPerformerIds?.[eventId] ?? []
                              );
                              const castLabels = [
                                {
                                  label: 'นักร้องนำ',
                                  names: group.personnel
                                    .filter((person) => singerIds.includes(person.id))
                                    .map((person) => person.fullName),
                                },
                                {
                                  label: 'นักแสดงนำ',
                                  names: group.personnel
                                    .filter((person) => leadPerformerIds.includes(person.id))
                                    .map((person) => person.fullName),
                                },
                              ].filter((castGroup) => castGroup.names.length > 0);

                              return (
                                <Box
                                  key={group.id || group.name}
                                  component={RouterLink}
                                  href={paths.performanceGroup.details(group.id || group.name)}
                                  sx={{
                                    p: { xs: 1.5, md: 1.75 },
                                    gap: 1.5,
                                    display: 'flex',
                                    color: 'inherit',
                                    minHeight: 108,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    borderRadius: 2.5,
                                    alignItems: 'center',
                                    textDecoration: 'none',
                                    bgcolor: highlightedStyle
                                      ? `${highlightedStyle.background}1f`
                                      : 'rgba(248,246,238,0.08)',
                                    backgroundImage:
                                      highlightedResultId === 'winner'
                                        ? 'linear-gradient(135deg, rgba(244,207,105,0.18), rgba(244,207,105,0.03))'
                                        : 'none',
                                    border: highlightedStyle
                                      ? `1px solid ${highlightedStyle.background}99`
                                      : '1px solid rgba(248,246,238,0.14)',
                                    boxShadow:
                                      highlightedResultId === 'winner'
                                        ? '0 10px 30px rgba(244,207,105,0.14)'
                                        : 'none',
                                    transition:
                                      'transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease',
                                    '&::before': highlightedStyle
                                      ? {
                                          content: '""',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: 4,
                                          position: 'absolute',
                                          bgcolor: highlightedStyle.background,
                                        }
                                      : undefined,
                                    '&:hover': {
                                      transform: 'translateY(-4px)',
                                      boxShadow: highlightedStyle
                                        ? `0 14px 32px ${highlightedStyle.background}25`
                                        : '0 14px 30px rgba(0,0,0,0.16)',
                                    },
                                  }}
                                >
                                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                    <Avatar
                                      variant="circular"
                                      src={group.logoUrl || undefined}
                                      alt={group.name}
                                      sx={{
                                        width: { xs: 58, md: 80 },
                                        height: { xs: 58, md: 80 },
                                        fontSize: 23,
                                        fontWeight: 900,
                                        color: HOME_TEXT,
                                        bgcolor: group.primaryColor || HOME_DEEP,
                                        border: highlightedStyle
                                          ? `3px solid ${highlightedStyle.background}`
                                          : '2px solid rgba(248,246,238,0.24)',
                                      }}
                                    >
                                      {group.name.slice(0, 1)}
                                    </Avatar>
                                    {highlightedStyle && (
                                      <Box
                                        sx={{
                                          right: -6,
                                          bottom: -6,
                                          width: 27,
                                          height: 27,
                                          display: 'grid',
                                          placeItems: 'center',
                                          position: 'absolute',
                                          borderRadius: '50%',
                                          color: highlightedStyle.color,
                                          bgcolor: highlightedStyle.background,
                                          boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                                        }}
                                      >
                                        <Iconify icon={highlightedStyle.icon as never} width={18} />
                                      </Box>
                                    )}
                                  </Box>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography
                                      sx={{
                                        pr: 1,
                                        fontSize: { xs: 17, md: 18 },
                                        lineHeight: 1.3,
                                        fontWeight: 950,
                                        display: '-webkit-box',
                                        overflow: 'hidden',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                    >
                                      {group.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.25, opacity: 0.68 }}>
                                      {[
                                        group.category,
                                        group.provinceName,
                                        joinedYears && `ปี ${joinedYears}`,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </Typography>
                                    {resultIds.length > 0 && (
                                      <Stack
                                        direction="row"
                                        spacing={0.75}
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{ mt: 0.75 }}
                                      >
                                        {resultIds.map((resultId) => {
                                          const resultStyle = RESULT_STYLES[resultId];
                                          const resultLabel =
                                            eventItem.contestResultOptions?.find(
                                              (option) => option.id === resultId
                                            )?.name ?? resultId;
                                          return (
                                            <Chip
                                              key={resultId}
                                              size="small"
                                              icon={
                                                resultStyle ? (
                                                  <Iconify
                                                    icon={resultStyle.icon as never}
                                                    width={15}
                                                  />
                                                ) : undefined
                                              }
                                              label={resultLabel}
                                              sx={{
                                                height: 26,
                                                maxWidth: 1,
                                                fontWeight: 850,
                                                color: resultStyle?.color ?? HOME_TEXT,
                                                bgcolor:
                                                  resultStyle?.background ??
                                                  'rgba(234,215,161,0.2)',
                                                border: resultStyle
                                                  ? 'none'
                                                  : '1px solid rgba(234,215,161,0.36)',
                                                '& .MuiChip-label': {
                                                  px: 1.1,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                },
                                                '& .MuiChip-icon': {
                                                  color: resultStyle?.color ?? HOME_TEXT,
                                                },
                                              }}
                                            />
                                          );
                                        })}
                                      </Stack>
                                    )}
                                    {castLabels.length > 0 && (
                                      <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                                        {castLabels.map((castGroup) => (
                                          <Typography
                                            key={castGroup.label}
                                            variant="caption"
                                            sx={{ opacity: 0.78 }}
                                          >
                                            <Box component="span" sx={{ fontWeight: 900 }}>
                                              {castGroup.label}:{' '}
                                            </Box>
                                            {castGroup.names.join(', ')}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    )}
                                  </Box>
                                  <Box
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      display: 'grid',
                                      flexShrink: 0,
                                      placeItems: 'center',
                                      borderRadius: '50%',
                                      bgcolor: 'rgba(248,246,238,0.09)',
                                    }}
                                  >
                                    <Iconify icon="eva:arrow-ios-forward-fill" width={21} />
                                  </Box>
                                </Box>
                              );
                            })}
                            {!section.groups.length && (
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1.5,
                                  bgcolor: 'rgba(255,255,255,0.04)',
                                }}
                              >
                                <Iconify icon="solar:users-group-rounded-bold" width={20} />
                                <Typography variant="body2" sx={{ opacity: 0.62 }}>
                                  ยังไม่มีวงในประเภทนี้
                                </Typography>
                              </Stack>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Stack alignItems="center" spacing={1} sx={{ py: { xs: 2, md: 3 } }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '50%',
                          bgcolor: 'rgba(248,246,238,0.09)',
                        }}
                      >
                        <Iconify icon="solar:users-group-rounded-bold" width={25} />
                      </Box>
                      <Typography sx={{ fontWeight: 800 }}>ยังไม่มีวงที่เข้าร่วม</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.62 }}>
                        รายชื่อวงจะแสดงเมื่อมีการเลือกกิจกรรมนี้ในข้อมูลรายปีของวง
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}

              {(eventItem.sourceLabel || eventItem.sourceUrl || eventItem.note) && (
                <Box sx={{ pt: 2.5, borderTop: '1px solid rgba(248,246,238,0.18)' }}>
                  {(eventItem.sourceLabel || eventItem.sourceUrl) && (
                    <Stack spacing={1} alignItems="flex-start">
                      <Typography variant="overline" sx={{ opacity: 0.68, fontWeight: 900 }}>
                        ที่มาของข้อมูล
                      </Typography>
                      {eventItem.sourceUrl ? (
                        <Button
                          component="a"
                          href={eventItem.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          endIcon={<Iconify icon="eva:external-link-fill" />}
                        >
                          {eventItem.sourceLabel || 'ดูข้อมูลจากแหล่งต้นทาง'}
                        </Button>
                      ) : (
                        <Typography>{eventItem.sourceLabel}</Typography>
                      )}
                    </Stack>
                  )}
                  {eventItem.note && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(248,246,238,0.08)',
                        borderLeft: '4px solid rgba(234,215,161,0.9)',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mb: 0.5, opacity: 0.68, fontWeight: 900 }}
                      >
                        หมายเหตุ
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line', color: 'rgba(248,246,238,0.82)' }}>
                        {eventItem.note}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>
      <HomeFooter />
      <Lightbox
        open={galleryLightbox.open}
        close={galleryLightbox.onClose}
        index={galleryLightbox.selected}
        slides={gallerySlides}
        onGetCurrentIndex={galleryLightbox.setSelected}
      />
    </Box>
  );
}

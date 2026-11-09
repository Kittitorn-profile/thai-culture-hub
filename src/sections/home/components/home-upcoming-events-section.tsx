'use client';

import type { HomeEventItem, HomeVideoItem } from './home-types';
import type { IconifyName } from 'src/components/iconify/register-icons';

import dynamic from 'next/dynamic';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { HomePlayButton } from './home-play-button';
import { isUpcomingHomeEvent, formatHomeEventDateRange } from './home-utils';
import { HOME_DEEP, HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  events: HomeEventItem[];
  onPlayVideo: (video: HomeVideoItem) => void;
};

export function HomeUpcomingEventsSection({ events, onPlayVideo }: Props) {
  const router = useRouter();

  if (events.length === 0) return null;

  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        pt: { xs: 3, md: 4 },
        pb: { xs: 5, md: 7 },
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
                bgcolor: '#efefec',
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
                fontWeight: 600,
                lineHeight: 1.15,
              }}
            >
              กิจกรรมวัฒนธรรมที่ใกล้จะถึง
            </Typography>
            <Typography sx={{ mt: 1.3, color: 'rgba(32,33,36,0.76)', lineHeight: 1.75 }}>
              รวมวัน เวลา สถานที่ และผู้จัดงาน เพื่อให้ติดตามกิจกรรมวัฒนธรรมล่าสุดได้จากหน้าแรก
            </Typography>
          </Box>
        </Stack>

        <Box
          role="region"
          aria-label="กิจกรรมวัฒนธรรม เลื่อนซ้ายขวาเพื่อดูกิจกรรม"
          tabIndex={0}
          sx={{
            display: { xs: 'flex', md: 'grid' },
            mx: { xs: -2, sm: -4, md: 0 },
            px: { xs: 2, sm: 4, md: 0 },
            scrollPaddingInline: { xs: '16px', sm: '32px', md: 0 },
            overflowX: { xs: 'auto', md: 'visible' },
            scrollSnapType: { xs: 'x mandatory', md: 'none' },
            overscrollBehaviorX: 'contain',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            pb: { xs: 1, md: 0 },
            gap: { xs: 2, md: 2.5 },
            gridTemplateColumns: { xs: '1fr', md: '1.6fr 0.8fr' },
            alignItems: 'stretch',
          }}
        >
          {events.map((eventItem, index) => {
            const isFeatured = index === 0;
            const mediaSource = eventItem.coverUrl || eventItem.mediaUrl;
            const eventEndDate = eventItem.endsAt || eventItem.startsAt;
            const isPast = Boolean(eventEndDate) && !isUpcomingHomeEvent(eventEndDate);

            return (
              <Box
                key={eventItem.id || `${eventItem.title}-${index}`}
                role="link"
                tabIndex={0}
                aria-label={`ดูรายละเอียดกิจกรรม ${eventItem.title}`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a, button')) return;
                  router.push(paths.event.details(eventItem));
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                  }
                  event.preventDefault();
                  router.push(paths.event.details(eventItem));
                }}
                sx={{
                  flex: { xs: '0 0 88%', md: 'initial' },
                  scrollSnapAlign: 'start',
                  minWidth: 0,
                  overflow: 'hidden',
                  borderRadius: 2.5,
                  color: HOME_TEXT,
                  bgcolor: '#fff',
                  border: '1px solid #e3e5e2',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 180ms ease, box-shadow 180ms ease',
                  '&:hover': {
                    borderColor: '#aeb5b5',
                    boxShadow: '0 8px 24px rgba(25,35,40,0.06)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #505b63',
                    outlineOffset: 4,
                  },
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    lg: isFeatured && !isPast ? '0.9fr 1.1fr' : '1fr',
                  },
                  gridTemplateRows: {
                    xs: 'auto 1fr',
                    lg: isFeatured && !isPast ? '1fr' : 'auto 1fr',
                  },
                }}
              >
                <Box
                  onClick={(event) => {
                    if (eventItem.mediaType === 'video') event.stopPropagation();
                  }}
                  sx={{
                    height: isPast
                      ? { xs: 180, md: 180 }
                      : { xs: 200, sm: 280, md: 380, lg: '100%' },
                    minHeight: isFeatured && !isPast ? { lg: 510 } : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    bgcolor: '#f0f1ee',
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
                        onPlayVideo({
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
                      ratio="1/1"
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
                      color: isPast ? '#fff' : '#252b2e',
                      bgcolor: isPast ? '#30383be6' : '#fffffff2',
                      border: isPast ? '1px solid rgba(248,246,238,0.3)' : 'none',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {isPast
                      ? 'ผ่านมาแล้ว'
                      : eventItem.isFeatured
                        ? 'สำคัญ'
                        : isFeatured
                          ? 'เร็ว ๆ นี้'
                          : 'รายการถัดไป'}
                  </Box>
                </Box>

                <Stack
                  spacing={{ xs: 1, md: isPast ? 1.25 : 1.75 }}
                  sx={{ p: { xs: 1.75, md: isPast ? 2 : 3 }, flex: 1, minWidth: 0 }}
                >
                  <Typography
                    sx={{
                      color: '#757d80',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                    }}
                  >
                    {formatHomeEventDateRange(eventItem.startsAt, eventItem.endsAt) ||
                      'ติดตามวันเวลาเร็ว ๆ นี้'}
                  </Typography>

                  <Typography
                    sx={{
                      color: HOME_TEXT,
                      fontSize: { xs: 18, sm: 20, md: isPast ? 20 : 25 },
                      display: '-webkit-box',
                      WebkitLineClamp: { xs: 2, md: isFeatured && !isPast ? 5 : 3 },
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {eventItem.title}
                  </Typography>

                  {eventItem.description && (
                    <Typography
                      sx={{
                        color: 'rgba(32,33,36,0.74)',
                        fontSize: { xs: 12, md: isPast ? 13 : 14 },
                        lineHeight: 1.7,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {eventItem.description}
                    </Typography>
                  )}

                  <Stack spacing={{ xs: 0.5, md: isPast ? 0.75 : 1.1 }} sx={{ pt: 0.5, pb: 1 }}>
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
                      <Stack key={detail.icon} direction="row" spacing={1} alignItems="flex-start">
                        <Iconify
                          icon={detail.icon as IconifyName}
                          width={18}
                          sx={{ flexShrink: 0, mt: 0.25 }}
                        />
                        <Typography
                          sx={{
                            color: '#626a6e',
                            fontSize: 13,
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: { xs: 1, md: isPast ? 1 : 2 },
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {detail.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack
                    direction="row"
                    useFlexGap
                    spacing={1}
                    sx={{
                      flexWrap: 'wrap',
                      mt: 'auto !important',
                      pt: { xs: 1, md: isPast ? 1.5 : 2 },
                      borderTop: '1px solid #eceeeb',
                      '& .MuiButton-root': {
                        minHeight: 44,
                        fontSize: { xs: 12, md: 13 },
                        borderRadius: 1.25,
                        px: 1.5,
                        py: 0.8,
                        fontWeight: 500,
                      },
                    }}
                  >
                    <Button
                      component="a"
                      href={paths.event.details(eventItem)}
                      size="small"
                      variant="contained"
                      endIcon={<Iconify icon="eva:external-link-fill" width={16} />}
                      sx={{
                        mt: 0.4,
                        width: 'fit-content',
                        color: '#fff',
                        bgcolor: '#252d31',
                        boxShadow: 'none',
                        borderColor: '#252d31',
                        '&:hover': {
                          borderColor: '#8f999d',
                          bgcolor: '#3c474d',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      ดูรายละเอียด
                    </Button>
                    {eventItem.sourceUrl && (
                      <Button
                        component="a"
                        href={eventItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="text"
                        endIcon={<Iconify icon="eva:external-link-fill" width={16} />}
                        sx={{
                          mt: 0.4,
                          width: 'fit-content',
                          color: HOME_TEXT,
                          borderColor: '#dce0dd',
                          '&:hover': {
                            borderColor: '#8f999d',
                            bgcolor: '#f2f4f1',
                          },
                        }}
                      >
                        <Box
                          component="span"
                          title={eventItem.sourceLabel || 'ติดตามรายละเอียด'}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: isPast ? 140 : 200,
                          }}
                        >
                          {eventItem.sourceLabel || 'ติดตามรายละเอียด'}
                        </Box>
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

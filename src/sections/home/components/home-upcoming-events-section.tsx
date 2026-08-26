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

import { formatHomeEventDate } from './home-utils';
import { HomePlayButton } from './home-play-button';
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
          {events.map((eventItem, index) => {
            const isFeatured = index === 0;
            const mediaSource = eventItem.coverUrl || eventItem.mediaUrl;

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
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                  }
                  event.preventDefault();
                  router.push(paths.event.details(eventItem));
                }}
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
                    ? '0 30px 36px rgba(31,40,38,0.28)'
                    : '0 20px 28px rgba(31,40,38,0.18)',
                  backdropFilter: 'blur(7px)',
                  cursor: 'pointer',
                  transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'rgba(234,215,161,0.78)',
                    boxShadow: '0 34px 52px rgba(31,40,38,0.34)',
                  },
                  '&:focus-visible': {
                    outline: '3px solid rgba(234,215,161,0.88)',
                    outlineOffset: 4,
                  },
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: isFeatured ? '1.05fr 0.95fr' : '1fr',
                  },
                }}
              >
                <Box
                  onClick={(event) => {
                    if (eventItem.mediaType === 'video') event.stopPropagation();
                  }}
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
                          [eventItem.provinceName, eventItem.location].filter(Boolean).join(' - ') ||
                          'ยังไม่ระบุจังหวัด',
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
                  <Button
                    component="a"
                    onClick={() => router.push(paths.event.details(eventItem))}
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
                    ดูรายละเอียด
                  </Button>
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
  );
}

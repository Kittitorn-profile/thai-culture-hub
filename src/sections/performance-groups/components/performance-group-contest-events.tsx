'use client';

import type { PerformanceGroupYearlyRecord } from './performance-group-types';
import type { HomeEventItem, PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

type Props = {
  group: PerformanceGroupEntry;
  record: PerformanceGroupYearlyRecord;
  contestEvents: HomeEventItem[];
};

export function PerformanceGroupContestEvents({ group, record, contestEvents }: Props) {
  if (!record.contestEventIds?.length) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 900 }}>
        การประกวดที่เข้าร่วม
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {record.contestEventIds.map((eventId) => {
          const eventItem = contestEvents.find((item) => item.id === eventId);
          const resultLabels = (record.contestResultIds?.[eventId] ?? []).map(
            (resultId) =>
              eventItem?.contestResultOptions?.find((option) => option.id === resultId)?.name ??
              resultId
          );
          const eventCast = [
            {
              label: 'นักร้องนำ',
              ids: record.contestSingerIds?.[eventId] ?? [],
              color: '#a85f38',
            },
            {
              label: 'นักแสดงนำ',
              ids: record.contestLeadPerformerIds?.[eventId] ?? [],
              color: '#4e7560',
            },
          ];

          return (
            <Box
              key={eventId}
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
                border: '1px solid',
                borderColor: 'divider',
                width: { xs: 1 },
              }}
            >
              <Button
                component={RouterLink}
                href={paths.event.details(eventId)}
                variant="outlined"
                aria-label={`ดูรายละเอียด ${eventItem?.title || 'การประกวด'}`}
                sx={{
                  position: 'relative',
                  width: 1,
                  minHeight: { xs: 148, md: 100 },
                  px: 2,
                  py: 2,
                  gap: 1,
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: { xs: 'center', md: 'flex-start' },
                  borderRadius: 1.5,
                }}
              >
                {eventItem?.logoUrl ? (
                  <Avatar
                    variant="rounded"
                    src={eventItem.logoUrl}
                    alt={eventItem.title}
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: 'common.white',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'primary.lighter' }}>
                    <Iconify icon="solar:cup-star-bold" width={30} />
                  </Avatar>
                )}
                <Box>
                  <Typography sx={{ fontWeight: 950 }}>{record.organizerName}</Typography>

                  <Typography
                    component="span"
                    variant="subtitle2"
                    sx={{
                      maxWidth: 1,
                      color: 'text.primary',
                      fontWeight: 400,
                      lineHeight: 1.45,
                      mr: { xs: 0, md: 2 },
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                    }}
                  >
                    {eventItem?.title || 'ดูรายละเอียดการประกวด'}
                  </Typography>
                </Box>
                <Iconify
                  icon="eva:arrow-ios-forward-fill"
                  width={22}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    right: 12,
                    transform: 'translateY(-50%)',
                  }}
                />
              </Button>
              {resultLabels.length > 0 && (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {resultLabels.map((resultLabel) => (
                    <Chip
                      key={resultLabel}
                      size="small"
                      icon={<Iconify icon={'solar:medal-ribbons-star-bold' as never} />}
                      label={resultLabel}
                      sx={{ color: '#6b4700', bgcolor: '#f3dda0', fontWeight: 850 }}
                    />
                  ))}
                </Stack>
              )}
              {eventCast.some((castGroup) => castGroup.ids.length > 0) && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 950 }}>
                    บุคลากรหลักของรายการนี้
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {eventCast.map((castGroup) => {
                      const people = group.personnel.filter((person) =>
                        castGroup.ids.includes(person.id)
                      );
                      if (!people.length) return null;

                      return (
                        <Box
                          key={castGroup.label}
                          sx={{
                            gap: 1,
                            display: 'grid',
                            alignItems: 'start',
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: '100px minmax(0, 1fr)',
                            },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ pt: { sm: 1.25 }, color: castGroup.color, fontWeight: 950 }}
                          >
                            {castGroup.label}
                          </Typography>
                          <Box
                            sx={{
                              gap: 1,
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'minmax(0, 1fr)',
                                md: 'repeat(2, minmax(0, 1fr))',
                                lg: 'repeat(3, minmax(0, 1fr))',
                              },
                            }}
                          >
                            {people.map((person) => (
                              <Stack
                                key={person.id}
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                                sx={{
                                  p: 1,
                                  minWidth: 0,
                                  borderRadius: 1.5,
                                  bgcolor: 'background.neutral',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                <Avatar
                                  src={person.imageUrl || undefined}
                                  alt={person.fullName}
                                  sx={{ width: 48, height: 48, flexShrink: 0 }}
                                >
                                  {person.fullName.slice(0, 1)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography noWrap sx={{ fontSize: 15, fontWeight: 900 }}>
                                    {person.fullName}
                                  </Typography>
                                  <Typography noWrap variant="caption" color="text.secondary">
                                    {person.nickname ? `ชื่อเล่น ${person.nickname}` : person.role}
                                  </Typography>
                                </Box>
                              </Stack>
                            ))}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

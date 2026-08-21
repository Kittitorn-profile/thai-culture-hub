'use client';

import type { PerformanceGroupYearlyRecord } from './performance-group-types';
import type { HomeEventItem, PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

type Props = {
  group: PerformanceGroupEntry;
  record: PerformanceGroupYearlyRecord;
  contestEvents: HomeEventItem[];
};

export function PerformanceGroupContestEvents({ group, record, contestEvents }: Props) {
  const [previewPerson, setPreviewPerson] = useState<
    PerformanceGroupEntry['personnel'][number] | null
  >(null);

  if (!record.contestEventIds?.length) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 900 }}>
        การประกวดที่เข้าร่วม
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {record.contestEventIds.map((eventId) => {
          const eventItem = contestEvents.find((item) => item.id === eventId);
          const categoryLabels = (record.contestCategoryIds?.[eventId] ?? []).map(
            (categoryId) =>
              eventItem?.contestCategories?.find((category) => category.id === categoryId)?.name ??
              categoryId
          );
          const categoryIds = record.contestCategoryIds?.[eventId] ?? [];
          const categoryCast = categoryIds.flatMap((categoryId) => {
            const categoryLabel =
              eventItem?.contestCategories?.find((category) => category.id === categoryId)?.name ??
              categoryId;
            return [
              {
                label: `นักร้องนำ · ${categoryLabel}`,
                ids: record.contestCategorySingerIds?.[eventId]?.[categoryId] ?? [],
                color: '#a85f38',
              },
              {
                label: `นักแสดงนำ · ${categoryLabel}`,
                ids: record.contestCategoryLeadPerformerIds?.[eventId]?.[categoryId] ?? [],
                color: '#4e7560',
              },
            ];
          });
          const legacyEventCast = [
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
          const eventCast = categoryCast.some((castGroup) => castGroup.ids.length > 0)
            ? categoryCast
            : legacyEventCast;

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
                  <Avatar
                    variant="rounded"
                    sx={{ width: 64, height: 64, bgcolor: 'primary.lighter' }}
                  >
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
              {categoryLabels.length > 0 && (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ mr: 0.25, fontWeight: 800 }}>
                    ประเภทที่ส่งประกวด
                  </Typography>
                </Stack>
              )}
              {(record.contestCategoryIds?.[eventId] ?? []).map((categoryId) => {
                const categoryName =
                  eventItem?.contestCategories?.find((category) => category.id === categoryId)
                    ?.name ?? categoryId;
                const categoryDetails =
                  record.contestCategoryDetails?.[eventId]?.[categoryId] ?? '';
                const categoryResultLabels = (
                  record.contestCategoryResultIds?.[eventId]?.[categoryId] ?? []
                ).map(
                  (resultId) =>
                    eventItem?.contestResultOptions?.find((option) => option.id === resultId)
                      ?.name ?? resultId
                );
                if (!categoryDetails && categoryResultLabels.length === 0) return null;

                return (
                  <Box
                    key={`details-${categoryId}`}
                    sx={{
                      mt: 1,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                      {categoryName}
                    </Typography>
                    {categoryDetails && (
                      <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: 'pre-line' }}>
                        {categoryDetails}
                      </Typography>
                    )}
                    {categoryResultLabels.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ mt: 1 }}
                      >
                        {categoryResultLabels.map((resultLabel) => (
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
                  </Box>
                );
              })}
              {(record.contestCategoryIds?.[eventId] ?? []).some(
                (categoryId) => record.contestCategoryBookletUrls?.[eventId]?.[categoryId]
              ) && (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {(record.contestCategoryIds?.[eventId] ?? []).map((categoryId) => {
                    const bookletUrl = record.contestCategoryBookletUrls?.[eventId]?.[categoryId];
                    if (!bookletUrl) return null;
                    const categoryName =
                      eventItem?.contestCategories?.find((category) => category.id === categoryId)
                        ?.name ?? categoryId;
                    return (
                      <Button
                        key={categoryId}
                        component="a"
                        href={bookletUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        startIcon={<Iconify icon={'solar:notebook-bookmark-bold' as never} />}
                      >
                        สูจิบัตร {categoryName}
                      </Button>
                    );
                  })}
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
                                component="button"
                                type="button"
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                                onClick={() => setPreviewPerson(person)}
                                aria-label={`ดูข้อมูล ${person.fullName}`}
                                sx={{
                                  p: 1,
                                  width: 1,
                                  minWidth: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  font: 'inherit',
                                  color: 'inherit',
                                  borderRadius: 1.5,
                                  bgcolor: 'background.neutral',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 20px rgba(31,40,38,0.12)',
                                  },
                                }}
                              >
                                <Avatar
                                  variant="rounded"
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

      <Dialog
        open={Boolean(previewPerson)}
        onClose={() => setPreviewPerson(null)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
      >
        {previewPerson && (
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ position: 'relative', bgcolor: 'background.neutral' }}>
              <IconButton
                aria-label="ปิด"
                onClick={() => setPreviewPerson(null)}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 1,
                  color: 'common.white',
                  bgcolor: 'rgba(20,28,28,0.62)',
                  '&:hover': { bgcolor: 'rgba(20,28,28,0.78)' },
                }}
              >
                <Iconify icon="mingcute:close-line" />
              </IconButton>
              {previewPerson.imageUrl ? (
                <Box
                  component="img"
                  src={previewPerson.imageUrl}
                  alt={previewPerson.fullName}
                  sx={{ width: 1, maxHeight: 520, display: 'block', objectFit: 'contain' }}
                />
              ) : (
                <Box sx={{ py: 9, display: 'grid', placeItems: 'center' }}>
                  <Avatar sx={{ width: 112, height: 112, fontSize: 42 }}>
                    {previewPerson.fullName.slice(0, 1)}
                  </Avatar>
                </Box>
              )}
            </Box>
            <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Typography variant="h4" sx={{ fontWeight: 950 }}>
                {previewPerson.nickname} {previewPerson.fullName}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip label={previewPerson.role} color="primary" />
              </Stack>
              {previewPerson.education && (
                <Typography sx={{ mt: 2 }}>
                  <strong>การศึกษา:</strong> {previewPerson.education}
                </Typography>
              )}
              {previewPerson.otherDetails && (
                <Typography sx={{ mt: 1.25, whiteSpace: 'pre-line' }}>
                  {previewPerson.otherDetails}
                </Typography>
              )}
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}

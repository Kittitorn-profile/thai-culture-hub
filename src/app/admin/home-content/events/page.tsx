'use client';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { TablePaginationCustom } from 'src/components/table';
import {
  Form,
  RHFUpload,
  RHFEditor,
  RHFSelect,
  RHFTextField,
  RHFDatePicker,
} from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type HomeEventItem = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  time: string;
  provinceCode: string;
  provinceName: string;
  location: string;
  organizer: string;
  mediaUrl: string;
  coverUrl: string;
  mediaType: 'image' | 'video';
  sourceLabel: string;
  sourceUrl: string;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  source?: string;
  sourceEventId?: string;
  syncedAt?: string;
};

type EditingEventItem = HomeEventItem & {
  isNew?: boolean;
};

type EventsResponse = {
  data?: HomeEventItem[];
  message?: string;
};

type EventResponse = {
  data?: HomeEventItem;
  message?: string;
};

type TatSyncResponse = {
  upserted?: number;
  skipped?: string[];
  message?: string;
};

type UploadResponse = {
  data?: {
    url?: string;
    path?: string;
  };
  message?: string;
};

type SourceFilter = 'all' | 'manual' | 'tat';

const EVENTS_QUERY_KEY = 'admin-events';
const MAX_EVENT_IMAGE_SIZE = 2 * 1024 * 1024;

const EventFormSchema = zod
  .object({
    id: zod.string(),
    title: zod.string().trim().min(1, { message: 'กรุณากรอกชื่อกิจกรรม' }),
    description: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    time: zod.string(),
    provinceCode: zod.string(),
    location: zod.string(),
    organizer: zod.string(),
    mediaUrl: zod.string(),
    coverUrl: zod.string(),
    sourceLabel: zod.string(),
    sourceUrl: zod.string(),
    imageFile: zod
      .any()
      .nullable()
      .refine((value) => !value || value instanceof File, {
        message: 'กรุณาเลือกรูปภาพ',
      })
      .refine((value) => !value || value.size <= MAX_EVENT_IMAGE_SIZE, {
        message: 'รูปภาพต้องมีขนาดไม่เกิน 2 MB',
      }),
    mediaType: zod.enum(['image', 'video']),
    isFeatured: zod.boolean(),
    sortOrder: zod.number(),
    isActive: zod.boolean(),
    source: zod.string(),
    sourceEventId: zod.string(),
    syncedAt: zod.string(),
  })
  .refine(
    (values) =>
      !values.startsAt ||
      !values.endsAt ||
      !dayjs(values.endsAt).isBefore(dayjs(values.startsAt), 'day'),
    {
      path: ['endsAt'],
      message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม',
    }
  )
  .refine((values) => values.isFeatured || values.startsAt.trim(), {
    path: ['startsAt'],
    message: 'กรุณาเลือกวันที่จัดกิจกรรม',
  })
  .refine((values) => values.isFeatured || values.provinceCode.trim(), {
    path: ['provinceCode'],
    message: 'กรุณาเลือกจังหวัด',
  });

type EventFormValues = zod.infer<typeof EventFormSchema>;

const EMPTY_EVENT_ITEM: EditingEventItem = {
  id: '',
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  time: '',
  provinceCode: '',
  provinceName: '',
  location: '',
  organizer: '',
  mediaUrl: '',
  coverUrl: '',
  mediaType: 'image',
  sourceLabel: '',
  sourceUrl: '',
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
  source: 'manual',
  sourceEventId: '',
  syncedAt: '',
  isNew: true,
};

const EMPTY_EVENT_FORM_VALUES: EventFormValues = {
  id: '',
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  time: '',
  provinceCode: '',
  location: '',
  organizer: '',
  mediaUrl: '',
  coverUrl: '',
  imageFile: null,
  mediaType: 'image',
  sourceLabel: '',
  sourceUrl: '',
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
  source: 'manual',
  sourceEventId: '',
  syncedAt: '',
};

function toEventFormValues(eventItem?: EditingEventItem | null): EventFormValues {
  if (!eventItem) {
    return EMPTY_EVENT_FORM_VALUES;
  }

  return {
    id: eventItem.id,
    title: eventItem.title,
    description: eventItem.description,
    startsAt: getDateInputValue(eventItem.startsAt),
    endsAt: getDateInputValue(eventItem.endsAt),
    time: eventItem.time,
    provinceCode: eventItem.provinceCode,
    location: eventItem.location,
    organizer: eventItem.organizer,
    mediaUrl: eventItem.mediaUrl,
    coverUrl: eventItem.coverUrl,
    imageFile: null,
    mediaType: eventItem.mediaType,
    sourceLabel: eventItem.sourceLabel ?? '',
    sourceUrl: eventItem.sourceUrl ?? '',
    isFeatured: eventItem.isFeatured ?? false,
    sortOrder: eventItem.sortOrder,
    isActive: eventItem.isActive,
    source: eventItem.source ?? 'manual',
    sourceEventId: eventItem.sourceEventId ?? '',
    syncedAt: eventItem.syncedAt ?? '',
  };
}

function getDateInputValue(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export default function HomeEventsAdminPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const eventFormMethods = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: EMPTY_EVENT_FORM_VALUES,
  });
  const {
    reset: resetEventForm,
    setValue: setEventFormValue,
    watch: watchEventForm,
  } = eventFormMethods;
  const [eventItems, setEventItems] = useState<HomeEventItem[]>([]);
  const [editingEvent, setEditingEvent] = useState<EditingEventItem | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const watchedMediaType = watchEventForm('mediaType');
  const watchedStartsAt = watchEventForm('startsAt');
  const watchedCoverUrl = watchEventForm('coverUrl');
  const watchedMediaUrl = watchEventForm('mediaUrl');
  const watchedTitle = watchEventForm('title');
  const watchedImageFile = watchEventForm('imageFile');
  const watchedIsFeatured = watchEventForm('isFeatured');

  const eventsQuery = useQuery({
    queryKey: [EVENTS_QUERY_KEY, accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<EventsResponse>('/api/admin/events', {
        accessToken,
      }),
  });

  useEffect(() => {
    if (Array.isArray(eventsQuery.data?.data)) {
      setEventItems(eventsQuery.data.data);
    }
  }, [eventsQuery.data]);

  useEffect(() => {
    if (eventsQuery.error instanceof AdminApiError && eventsQuery.error.status === 401) {
      checkUserSession?.();
    }
  }, [checkUserSession, eventsQuery.error]);

  useEffect(() => {
    if (!editingEvent) {
      resetEventForm(EMPTY_EVENT_FORM_VALUES);
      return;
    }

    resetEventForm(toEventFormValues(editingEvent));
  }, [editingEvent, resetEventForm]);

  useEffect(() => {
    if (watchedImageFile instanceof File) {
      setEventFormValue('mediaType', 'image', { shouldValidate: true });
      setError('');
    }
  }, [setEventFormValue, watchedImageFile]);

  const saveEventsMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<EventsResponse>('/api/admin/events', {
        method: 'PUT',
        accessToken,
        body: {
          items: eventItems.map((eventItem, index) => ({
            ...eventItem,
            sortOrder: index,
            startsAt: getDateInputValue(eventItem.startsAt),
            endsAt: getDateInputValue(eventItem.endsAt),
          })),
        },
      }),
    onSuccess: async () => {
      setMessage('บันทึกกิจกรรมลง database แล้ว');
      await queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกกิจกรรมไม่สำเร็จ');
    },
  });

  const saveEventMutation = useMutation({
    mutationFn: (eventItem: HomeEventItem) =>
      adminApiRequest<EventResponse>('/api/admin/events', {
        method: 'POST',
        accessToken,
        body: {
          ...eventItem,
          startsAt: getDateInputValue(eventItem.startsAt),
          endsAt: getDateInputValue(eventItem.endsAt),
        },
      }),
    onSuccess: async (data) => {
      if (data.data) {
        setEventItems((currentItems) => {
          const currentIndex = currentItems.findIndex(
            (eventItem) => eventItem.id === data.data?.id
          );

          if (currentIndex === -1) {
            return [data.data as HomeEventItem, ...currentItems];
          }

          return currentItems.map((eventItem) =>
            eventItem.id === data.data?.id ? (data.data as HomeEventItem) : eventItem
          );
        });
      }

      setEditingEvent(null);
      setSourceFilter(data.data?.source === 'tat' ? 'tat' : 'manual');
      setPage(0);
      setError('');
      setMessage('บันทึกกิจกรรมลง database แล้ว');
      await queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกกิจกรรมไม่สำเร็จ');
    },
  });

  const uploadEventImageMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return adminApiRequest<UploadResponse>('/api/admin/events/upload', {
        method: 'POST',
        accessToken,
        body: formData,
      });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'อัปโหลดรูปไม่สำเร็จ');
    },
  });

  const syncTatEventsMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<TatSyncResponse>('/api/admin/events/tat-sync', {
        method: 'POST',
        accessToken,
        body: { limit: 20, page: 1 },
      }),
    onSuccess: async (data) => {
      setMessage(
        data.message ??
          `Sync TAT events แล้ว ${Number(data.upserted ?? 0).toLocaleString('th-TH')} รายการ`
      );
      await queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'Sync TAT events ไม่สำเร็จ');
    },
  });

  const toggleEventMutation = useMutation({
    mutationFn: (eventItem: HomeEventItem) =>
      adminApiRequest<EventResponse>('/api/admin/events', {
        method: 'PATCH',
        accessToken,
        body: {
          id: eventItem.id,
          isActive: !eventItem.isActive,
        },
      }),
    onSuccess: async (data) => {
      if (data.data) {
        setEventItems((currentItems) =>
          currentItems.map((eventItem) => (eventItem.id === data.data?.id ? data.data : eventItem))
        );
      }

      setMessage('อัปเดตสถานะการแสดงผลแล้ว');
      await queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'อัปเดตสถานะไม่สำเร็จ');
    },
  });

  const stats = useMemo(
    () => ({
      total: eventItems.length,
      active: eventItems.filter((eventItem) => eventItem.isActive).length,
      hidden: eventItems.filter((eventItem) => !eventItem.isActive).length,
      manual: eventItems.filter((eventItem) => eventItem.source !== 'tat').length,
      tat: eventItems.filter((eventItem) => eventItem.source === 'tat').length,
    }),
    [eventItems]
  );
  const filteredEventItems = useMemo(
    () =>
      eventItems.filter((eventItem) => {
        if (sourceFilter === 'tat') {
          return eventItem.source === 'tat';
        }

        if (sourceFilter === 'manual') {
          return eventItem.source !== 'tat';
        }

        return true;
      }),
    [eventItems, sourceFilter]
  );
  const paginatedEventItems = useMemo(
    () => filteredEventItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredEventItems, page, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredEventItems.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredEventItems.length, page, rowsPerPage]);

  const handleSaveDraft = async () => {
    setError('');
    setMessage('');
    await saveEventsMutation.mutateAsync().catch(() => undefined);
  };

  const startAddEvent = () => {
    setEditingEvent({
      ...EMPTY_EVENT_ITEM,
      id: '',
      sortOrder: eventItems.length,
    });
    setSourceFilter('manual');
    setPage(0);
  };

  const saveEventItem = async (values: EventFormValues) => {
    const selectedProvince = provinces.find((province) => province.code === values.provinceCode);

    if (!values.isFeatured && !selectedProvince) {
      setError('กรุณาเลือกจังหวัด');
      return;
    }

    let uploadedImageUrl = '';

    if (values.imageFile instanceof File) {
      const uploadResult = await uploadEventImageMutation
        .mutateAsync(values.imageFile)
        .catch(() => null);
      uploadedImageUrl = uploadResult?.data?.url ?? '';

      if (!uploadedImageUrl) {
        return;
      }
    }

    const nextMediaUrl = uploadedImageUrl || values.mediaUrl.trim();
    const nextCoverUrl = uploadedImageUrl || values.coverUrl.trim();

    const nextItem: HomeEventItem = {
      id: values.id,
      title: values.title.trim(),
      description: values.description.trim(),
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      time: values.time.trim(),
      provinceCode: selectedProvince?.code ?? '',
      provinceName: selectedProvince?.name ?? '',
      location: values.location.trim(),
      organizer: values.organizer.trim(),
      mediaUrl: nextMediaUrl,
      coverUrl: nextCoverUrl,
      mediaType: values.mediaType,
      sourceLabel: values.sourceLabel.trim(),
      sourceUrl: values.sourceUrl.trim(),
      isFeatured: values.isFeatured,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      source: values.source ?? 'manual',
      sourceEventId: values.sourceEventId ?? '',
      syncedAt: values.syncedAt ?? '',
    };

    setError('');
    setMessage('');
    await saveEventMutation.mutateAsync(nextItem).catch(() => undefined);
  };

  const deleteEventItem = (itemId: string) => {
    setEventItems((currentItems) => currentItems.filter((eventItem) => eventItem.id !== itemId));
    setMessage('ลบกิจกรรมแล้ว อย่าลืมกดบันทึก draft');
    setError('');
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              กิจกรรมที่จะจัดขึ้น
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการ event ที่แสดงบนหน้า home-view ผ่าน database table events
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href="/admin/home-content" color="inherit" variant="outlined">
              กลับ Home Content
            </Button>
            <LoadingButton
              color="info"
              variant="outlined"
              loading={syncTatEventsMutation.isPending}
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => {
                setError('');
                setMessage('');
                syncTatEventsMutation.mutate();
              }}
            >
              Sync TAT
            </LoadingButton>
            <LoadingButton
              variant="contained"
              loading={saveEventsMutation.isPending}
              onClick={handleSaveDraft}
            >
              บันทึก draft
            </LoadingButton>
          </Stack>
        </Stack>

        {(error || eventsQuery.error) && (
          <Alert severity="error">
            {error ||
              (eventsQuery.error instanceof Error
                ? eventsQuery.error.message
                : 'โหลดข้อมูลไม่สำเร็จ')}
          </Alert>
        )}
        {message && <Alert severity="success">{message}</Alert>}
        {eventsQuery.isLoading && <Alert severity="info">กำลังโหลดกิจกรรมจาก database...</Alert>}

        <Alert severity="info">หน้านี้อ่านและบันทึกข้อมูลผ่าน database table events</Alert>
        <Alert severity="warning">
          รายการที่ sync จาก TAT จะถูกบันทึกเป็นสถานะซ่อนก่อน ต้องกดเปิดใช้งานเอง user
          จึงจะเห็นบนหน้าเว็บ
        </Alert>

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          {[
            { label: 'ทั้งหมด', value: stats.total },
            { label: 'เผยแพร่', value: stats.active },
            { label: 'ซ่อนอยู่', value: stats.hidden },
          ].map((item) => (
            <Card key={item.label} sx={{ p: 2.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.label}</Typography>
              <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 900 }}>
                {item.value}
              </Typography>
            </Card>
          ))}
        </Box>

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                รายการกิจกรรม
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                หน้า home-view จะแสดง 2 รายการที่ใกล้จะถึง โดยรายการแรกเด่นกว่ารายการถัดไป
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={startAddEvent}
            >
              เพิ่มกิจกรรม
            </Button>
          </Stack>
        </Card>

        <Card>
          <Box sx={{ px: 2.5, pt: 1 }}>
            <Tabs
              value={sourceFilter}
              onChange={(_, value: SourceFilter) => {
                setSourceFilter(value);
                setPage(0);
              }}
            >
              <Tab value="all" label={`ทั้งหมด (${stats.total.toLocaleString('th-TH')})`} />
              <Tab value="manual" label={`เว็บ (${stats.manual.toLocaleString('th-TH')})`} />
              <Tab value="tat" label={`ททท. (${stats.tat.toLocaleString('th-TH')})`} />
            </Tabs>
          </Box>
          <Divider sx={{ mt: 1 }} />

          <Box
            sx={{
              p: 2.5,
              gap: 2,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            {paginatedEventItems.map((eventItem, index) => (
              <Card
                key={eventItem.id || `draft-${index}`}
                variant="outlined"
                sx={{ overflow: 'hidden' }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }}>
                  <Box sx={{ width: { xs: 1, sm: 220 }, flexShrink: 0, position: 'relative' }}>
                    <Image
                      alt={eventItem.title}
                      src={eventItem.coverUrl || eventItem.mediaUrl || '/assets/th-hub/bg-1.png'}
                      ratio="4/3"
                      sx={{ bgcolor: 'background.neutral' }}
                    />

                    <Box
                      sx={{
                        top: 12,
                        left: 12,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        position: 'absolute',
                        color: 'common.white',
                        bgcolor: eventItem.mediaType === 'video' ? 'error.main' : 'success.main',
                        typography: 'caption',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {eventItem.mediaType}
                    </Box>
                  </Box>

                  <Stack spacing={1.2} sx={{ p: 2, minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 900 }}>
                      {eventItem.title}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {eventItem.startsAt || 'ยังไม่ระบุวัน'} ·{' '}
                      {eventItem.isActive ? 'เผยแพร่' : 'ซ่อนอยู่'}
                      {eventItem.isFeatured ? ' · สำคัญ' : ' · ทั่วไป'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                      แหล่งข้อมูล {eventItem.source === 'tat' ? 'TAT' : 'Manual'}
                      {eventItem.sourceEventId ? ` · ${eventItem.sourceEventId}` : ''}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      จังหวัด {eventItem.provinceName || '-'} · เวลา {eventItem.time || '-'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      สถานที่ {eventItem.location || '-'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      ผู้จัด {eventItem.organizer || '-'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      แหล่งที่มา {eventItem.sourceLabel || '-'}
                      {eventItem.sourceUrl ? ` · ${eventItem.sourceUrl}` : ''}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ pt: 0.5, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        color={eventItem.isActive ? 'warning' : 'success'}
                        variant="contained"
                        disabled={
                          !eventItem.id ||
                          (toggleEventMutation.isPending &&
                            toggleEventMutation.variables?.id === eventItem.id)
                        }
                        onClick={() => toggleEventMutation.mutate(eventItem)}
                      >
                        {eventItem.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={`/admin/home-content/events/${eventItem.id}`}
                        disabled={!eventItem.id}
                      >
                        รายละเอียด
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setEditingEvent({
                            ...eventItem,
                            startsAt: getDateInputValue(eventItem.startsAt),
                            endsAt: getDateInputValue(eventItem.endsAt),
                          })
                        }
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => deleteEventItem(eventItem.id)}
                      >
                        ลบ
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            ))}

            {!filteredEventItems.length && (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                ยังไม่มีกิจกรรมใน tab นี้
              </Box>
            )}
          </Box>

          <TablePaginationCustom
            page={page}
            count={filteredEventItems.length}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[6, 12, 24, 48]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
          />
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        slotProps={{
          paper: {
            sx: { width: { xs: 1, sm: 560 } },
          },
        }}
      >
        {editingEvent && (
          <Form methods={eventFormMethods} onSubmit={eventFormMethods.handleSubmit(saveEventItem)}>
            <Stack sx={{ height: 1 }}>
              <Stack spacing={0.5} sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {editingEvent.isNew ? 'เพิ่มกิจกรรมใหม่' : 'แก้ไขกิจกรรม'}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  Event • {editingEvent.id || 'รอสร้าง id จาก database'}
                </Typography>
              </Stack>

              <Divider />

              <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
                {error && <Alert severity="error">{error}</Alert>}

                <RHFTextField name="title" label="ชื่อกิจกรรม" required />

                <RHFEditor
                  name="description"
                  placeholder="คำอธิบายกิจกรรม"
                  helperText="ใส่รายละเอียดกิจกรรม รูปแบบข้อความจะถูกบันทึกเป็น HTML"
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <RHFDatePicker
                    name="startsAt"
                    label="วันที่เริ่ม"
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: !watchedIsFeatured,
                        helperText: watchedIsFeatured ? 'รายการสำคัญไม่บังคับกรอก' : undefined,
                      },
                    }}
                  />
                  <RHFDatePicker
                    name="endsAt"
                    label="วันที่สิ้นสุด"
                    format="DD/MM/YYYY"
                    minDate={watchedStartsAt ? dayjs(watchedStartsAt) : undefined}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: 'ไม่บังคับกรอก',
                      },
                    }}
                  />
                </Stack>

                <RHFTextField name="time" label="เวลา" placeholder="เช่น 10:00 - 20:00 น." />

                <RHFSelect
                  name="provinceCode"
                  label="จังหวัด"
                  required={!watchedIsFeatured}
                  helperText={watchedIsFeatured ? 'รายการสำคัญไม่บังคับกรอก' : undefined}
                >
                  <MenuItem value="">เลือกจังหวัด</MenuItem>
                  {provinces.map((province) => (
                    <MenuItem key={province.code} value={province.code}>
                      {province.name}
                    </MenuItem>
                  ))}
                </RHFSelect>

                <RHFTextField name="location" label="สถานที่" helperText="ไม่บังคับกรอก" />

                <RHFTextField name="organizer" label="ผู้จัด" helperText="ไม่บังคับกรอก" />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <RHFTextField
                    name="sourceLabel"
                    label="ชื่อแหล่งที่มา"
                    placeholder="เช่น เพจผ้าไทยใส่ให้สนุก"
                  />
                  <RHFTextField
                    name="sourceUrl"
                    label="ลิงก์ติดตาม"
                    placeholder="https://facebook.com/..."
                  />
                </Stack>

                <RHFSelect name="mediaType" label="ประเภทสื่อ">
                  <MenuItem value="image">ภาพ</MenuItem>
                  <MenuItem value="video">วิดีโอ</MenuItem>
                </RHFSelect>

                <RHFSelect name="isFeatured" label="ความสำคัญ">
                  <MenuItem value={true as any}>สำคัญ</MenuItem>
                  <MenuItem value={false as any}>ทั่วไป</MenuItem>
                </RHFSelect>

                <RHFTextField
                  name="mediaUrl"
                  label={watchedMediaType === 'video' ? 'Video URL' : 'Image URL'}
                />

                <RHFTextField name="coverUrl" label="Cover URL" />

                <Stack spacing={1.25}>
                  <RHFUpload
                    name="imageFile"
                    maxSize={MAX_EVENT_IMAGE_SIZE}
                    helperText="รองรับไฟล์รูปภาพไม่เกิน 2 MB และจะแสดง preview ก่อนอัปโหลด"
                    onDelete={() => {
                      setEventFormValue('imageFile', null, { shouldValidate: true });
                    }}
                    slotProps={{
                      wrapper: {
                        sx: {
                          '& .upload__default': {
                            minHeight: 180,
                          },
                        },
                      },
                    }}
                  />
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    รูปจะถูกอัปโหลดหลังจากกดบันทึกกิจกรรมเท่านั้น
                  </Typography>
                </Stack>

                {!watchedImageFile && (watchedCoverUrl || watchedMediaUrl) && (
                  <Box
                    component="img"
                    src={watchedCoverUrl || watchedMediaUrl}
                    alt={watchedTitle || 'Event preview'}
                    sx={{
                      width: 1,
                      height: 200,
                      borderRadius: 1,
                      objectFit: 'cover',
                      bgcolor: 'background.neutral',
                    }}
                  />
                )}

                <RHFSelect name="isActive" label="สถานะ">
                  <MenuItem value={true as any}>เผยแพร่</MenuItem>
                  <MenuItem value={false as any}>ซ่อน</MenuItem>
                </RHFSelect>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={1.5} sx={{ p: 2.5 }}>
                <LoadingButton
                  fullWidth
                  type="submit"
                  variant="contained"
                  loading={saveEventMutation.isPending || uploadEventImageMutation.isPending}
                >
                  บันทึกกิจกรรม
                </LoadingButton>
                <Button fullWidth color="inherit" onClick={() => setEditingEvent(null)}>
                  ยกเลิก
                </Button>
              </Stack>
            </Stack>
          </Form>
        )}
      </Drawer>
    </DashboardContent>
  );
}

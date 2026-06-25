'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { formatThaiCalendarDate } from 'src/utils/calendar-date';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Image } from 'src/components/image';

import { useAuthContext } from 'src/auth/hooks';

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
  sourcePayload?: Record<string, unknown>;
  detailPayload?: Record<string, unknown>;
  tatEventId?: string;
  tatName?: string;
  tatSlug?: string;
  tatStatus?: string;
  tatStartDate?: string;
  tatEndDate?: string;
  tatStartTime?: string;
  tatEndTime?: string;
  tatLocationName?: string;
  tatAddress?: string;
  tatProvinceName?: string;
  tatLat?: number | null;
  tatLng?: number | null;
  tatThumbnailUrl?: string;
  tatImageUrls?: string[];
  tatContact?: Record<string, unknown>;
  tatUrl?: string;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EventResponse = {
  data?: HomeEventItem | null;
  message?: string;
};

const EVENTS_QUERY_KEY = 'admin-events';

function formatDate(value?: string) {
  return formatThaiCalendarDate(value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) || '-';
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{value || '-'}</Typography>
    </Stack>
  );
}

export default function HomeEventDetailAdminPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const eventQuery = useQuery({
    queryKey: [EVENTS_QUERY_KEY, eventId, accessToken],
    enabled: !!eventId && !!accessToken,
    queryFn: () =>
      adminApiRequest<EventResponse>(`/api/admin/events?id=${encodeURIComponent(eventId)}`, {
        accessToken,
      }),
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }
    },
  });

  const eventItem = eventQuery.data?.data ?? null;
  const payload = eventItem?.detailPayload ?? eventItem?.sourcePayload ?? {};

  return (
    <DashboardContent maxWidth="lg">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              รายละเอียดกิจกรรม
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตรวจข้อมูลจาก database และ payload ต้นทางจาก TAT
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href="/admin/home-content/events" color="inherit" variant="outlined">
              กลับรายการ
            </Button>
            {eventItem && (
              <Button
                color={eventItem.isActive ? 'warning' : 'success'}
                variant="contained"
                disabled={toggleEventMutation.isPending}
                onClick={() => toggleEventMutation.mutate(eventItem)}
              >
                {eventItem.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              </Button>
            )}
          </Stack>
        </Stack>

        {eventQuery.isLoading && <Alert severity="info">กำลังโหลดรายละเอียดกิจกรรม...</Alert>}
        {eventQuery.error && (
          <Alert severity="error">
            {eventQuery.error instanceof Error ? eventQuery.error.message : 'โหลดข้อมูลไม่สำเร็จ'}
          </Alert>
        )}
        {!eventQuery.isLoading && !eventItem && <Alert severity="warning">ไม่พบกิจกรรมนี้</Alert>}

        {eventItem && (
          <>
            <Card sx={{ overflow: 'hidden' }}>
              <Image
                alt={eventItem.title}
                src={eventItem.coverUrl || eventItem.mediaUrl || '/assets/th-hub/bg-1.png'}
                ratio="21/9"
                sx={{ bgcolor: 'background.neutral' }}
              />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {eventItem.title}
                    </Typography>
                    <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
                      {eventItem.description || '-'}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      px: 1.2,
                      py: 0.6,
                      height: 32,
                      borderRadius: 1,
                      color: eventItem.isActive ? 'success.dark' : 'text.secondary',
                      bgcolor: eventItem.isActive ? 'success.lighter' : 'background.neutral',
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {eventItem.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </Typography>
                  <Typography
                    sx={{
                      px: 1.2,
                      py: 0.6,
                      height: 32,
                      borderRadius: 1,
                      color: eventItem.isFeatured ? 'warning.dark' : 'text.secondary',
                      bgcolor: eventItem.isFeatured ? 'warning.lighter' : 'background.neutral',
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {eventItem.isFeatured ? 'สำคัญ' : 'ทั่วไป'}
                  </Typography>
                </Stack>

                <Divider />

                <Box
                  sx={{
                    gap: 2.5,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <DetailRow label="วันที่เริ่ม" value={formatDate(eventItem.startsAt)} />
                  <DetailRow label="วันที่สิ้นสุด" value={formatDate(eventItem.endsAt)} />
                  <DetailRow label="เวลา" value={eventItem.time} />
                  <DetailRow label="จังหวัด" value={eventItem.provinceName} />
                  <DetailRow label="สถานที่" value={eventItem.location} />
                  <DetailRow label="ผู้จัด" value={eventItem.organizer} />
                  <DetailRow label="ชื่อแหล่งที่มา" value={eventItem.sourceLabel} />
                  <DetailRow label="ลิงก์ติดตาม" value={eventItem.sourceUrl} />
                  <DetailRow label="แหล่งข้อมูล" value={eventItem.source === 'tat' ? 'TAT' : 'Manual'} />
                  <DetailRow label="TAT Event ID" value={eventItem.sourceEventId} />
                  <DetailRow label="Sync ล่าสุด" value={formatDateTime(eventItem.syncedAt)} />
                  <DetailRow label="อัปเดตล่าสุด" value={formatDateTime(eventItem.updatedAt)} />
                </Box>
                {eventItem.sourceUrl && (
                  <Button
                    component="a"
                    href={eventItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    sx={{ width: 'fit-content' }}
                  >
                    ไปยังแหล่งที่มา
                  </Button>
                )}
              </Stack>
            </Card>

            {eventItem.source === 'tat' && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Field จาก TAT
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    gap: 2.5,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <DetailRow label="tat_event_id" value={eventItem.tatEventId} />
                  <DetailRow label="tat_name" value={eventItem.tatName} />
                  <DetailRow label="tat_status" value={eventItem.tatStatus} />
                  <DetailRow label="tat_slug" value={eventItem.tatSlug} />
                  <DetailRow label="tat_start_date" value={eventItem.tatStartDate} />
                  <DetailRow label="tat_end_date" value={eventItem.tatEndDate} />
                  <DetailRow label="tat_start_time" value={eventItem.tatStartTime} />
                  <DetailRow label="tat_end_time" value={eventItem.tatEndTime} />
                  <DetailRow label="tat_location_name" value={eventItem.tatLocationName} />
                  <DetailRow label="tat_address" value={eventItem.tatAddress} />
                  <DetailRow label="tat_province_name" value={eventItem.tatProvinceName} />
                  <DetailRow
                    label="tat_lat/lng"
                    value={
                      eventItem.tatLat || eventItem.tatLng
                        ? `${eventItem.tatLat ?? '-'}, ${eventItem.tatLng ?? '-'}`
                        : '-'
                    }
                  />
                  <DetailRow label="tat_thumbnail_url" value={eventItem.tatThumbnailUrl} />
                  <DetailRow label="tat_url" value={eventItem.tatUrl} />
                </Box>
              </Card>
            )}

            <Card sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Payload จาก TAT
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  maxHeight: 520,
                  overflow: 'auto',
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(payload, null, 2)}
              </Box>
            </Card>
          </>
        )}
      </Stack>
    </DashboardContent>
  );
}

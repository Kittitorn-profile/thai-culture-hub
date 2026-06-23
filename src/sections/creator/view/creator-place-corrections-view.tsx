'use client';

import type { CreatorPlaceCorrection } from '../types';
import type { IconifyName } from 'src/components/iconify';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

import { getCreatorPlaceCorrections } from '../creator-api';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อสถานที่',
  district: 'อำเภอ',
  lat: 'Latitude',
  lng: 'Longitude',
  mapUrl: 'Map URL',
  imageUrl: 'Image URL',
  description: 'คำอธิบาย',
  detail: 'รายละเอียด',
};

function getStatusColor(status: CreatorPlaceCorrection['status']) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

type StatusMeta = {
  icon: IconifyName;
  title: string;
  description: string;
  color: 'success' | 'error' | 'warning';
  tone: string;
  bg: string;
};

function getStatusMeta(status: CreatorPlaceCorrection['status']): StatusMeta {
  if (status === 'approved') {
    return {
      icon: 'solar:check-circle-bold',
      title: 'ผ่านแล้ว',
      description: 'Admin ตรวจสอบและนำข้อมูลไปใช้งานแล้ว',
      color: 'success' as const,
      tone: '#1b7f4c',
      bg: 'rgba(42, 157, 106, 0.1)',
    };
  }

  if (status === 'rejected') {
    return {
      icon: 'solar:close-circle-bold',
      title: 'ไม่ผ่าน',
      description: 'มีข้อเสนอแนะจาก Admin ให้ปรับข้อมูล',
      color: 'error' as const,
      tone: '#b42318',
      bg: 'rgba(220, 68, 55, 0.1)',
    };
  }

  return {
    icon: 'solar:clock-circle-bold',
    title: 'รอตรวจ',
    description: 'คำขออยู่ในคิวตรวจสอบ',
    color: 'warning' as const,
    tone: '#9a5b12',
    bg: 'rgba(224, 144, 44, 0.13)',
  };
}

function getStatusLabel(status: CreatorPlaceCorrection['status']) {
  if (status === 'approved') return 'ผ่านแล้ว';
  if (status === 'rejected') return 'ไม่ผ่าน';
  return 'รอตรวจ';
}

function getPayloadEntries(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      value: `${value ?? ''}`.trim(),
    }))
    .filter((item) => item.value);
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ mt: 0.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconifyName;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.88)',
        boxShadow: '0 18px 50px rgba(32,42,43,0.14)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            display: 'grid',
            color: tone,
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.86)',
            border: '1px solid rgba(32,42,43,0.08)',
          }}
        >
          <Iconify icon={icon} width={24} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{label}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 2,
        textAlign: 'center',
        bgcolor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 22px 70px rgba(32,42,43,0.16)',
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          mb: 2,
          width: 72,
          height: 72,
          borderRadius: 2,
          display: 'grid',
          color: creatorTone.deep,
          placeItems: 'center',
          bgcolor: 'rgba(139,150,134,0.14)',
        }}
      >
        <Iconify icon="solar:file-text-bold" width={38} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 900, color: creatorTone.deep }}>
        ยังไม่มีคำขอแก้ไขข้อมูล
      </Typography>
      <Typography sx={{ mt: 1, mx: 'auto', maxWidth: 540, color: 'text.secondary' }}>
        เมื่อคุณพบข้อมูลสถานที่ที่ควรปรับปรุง ให้เปิดหน้าสถานที่นั้นแล้วส่งคำขอแก้ไข
        รายการและผลตรวจสอบจะมาแสดงที่นี่
      </Typography>
      <Button
        component={RouterLink}
        href="/culture-category"
        variant="contained"
        startIcon={<Iconify icon="solar:add-folder-bold" />}
        sx={{ mt: 3 }}
      >
        ค้นหาสถานที่
      </Button>
    </Card>
  );
}

function CorrectionCard({
  item,
  onOpen,
}: {
  item: CreatorPlaceCorrection;
  onOpen: () => void;
}) {
  const statusMeta = getStatusMeta(item.status);
  const suggestedCount = getPayloadEntries(item.suggestedPayload).length;

  return (
    <Card
      onClick={onOpen}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(32,42,43,0.08)',
        boxShadow: '0 18px 55px rgba(32,42,43,0.14)',
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'rgba(32,42,43,0.22)',
          boxShadow: '0 24px 68px rgba(32,42,43,0.2)',
        },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                mt: 0.25,
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 1.5,
                display: 'grid',
                color: statusMeta.tone,
                placeItems: 'center',
                bgcolor: statusMeta.bg,
              }}
            >
              <Iconify icon={statusMeta.icon} width={24} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: creatorTone.deep,
                  wordBreak: 'break-word',
                }}
              >
                {item.placeName || 'ไม่ระบุชื่อสถานที่'}
              </Typography>
              <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
                ส่งเมื่อ {fDateTime(item.createdAt)}
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            label={statusMeta.title}
            color={statusMeta.color}
            sx={{ flexShrink: 0, fontWeight: 800 }}
          />
        </Stack>

        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          {statusMeta.description}
        </Typography>

        {item.reviewNote && (
          <Alert severity={item.status === 'rejected' ? 'error' : 'success'} sx={{ py: 0.5 }}>
            {item.reviewNote}
          </Alert>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ color: 'text.secondary', fontSize: 13 }}
        >
          <Chip
            size="small"
            variant="outlined"
            icon={<Iconify icon="solar:file-text-bold" />}
            label={`${suggestedCount} รายการที่เสนอแก้`}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
          <Chip
            size="small"
            variant="outlined"
            icon={<Iconify icon="solar:calendar-date-bold" />}
            label={item.provinceCode || item.placeId}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, maxWidth: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            ดูรายละเอียด
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

export function CreatorPlaceCorrectionsView() {
  const router = useRouter();
  const { user, loading, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<CreatorPlaceCorrection[]>([]);
  const [selected, setSelected] = useState<CreatorPlaceCorrection | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      approved: items.filter((item) => item.status === 'approved').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
    }),
    [items]
  );

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getCreatorPlaceCorrections(accessToken);

      setItems(result.data ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดคำขอแก้ไขไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace('/creator/sign-in');
      return;
    }

    if (!loading && accessToken && !isCreatorUser(user)) {
      router.replace(getRoleHomePath(user));
      return;
    }

    loadItems();
  }, [accessToken, loadItems, loading, router, user]);

  const renderCorrectionDetails = (item: CreatorPlaceCorrection) => {
    const suggestedEntries = getPayloadEntries(item.suggestedPayload);
    const originalEntries = getPayloadEntries(item.originalSnapshot);

    return (
      <Stack spacing={2.5} sx={{ p: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {item.placeName || 'คำขอแก้ไขสถานที่'}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>{item.placeId}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            ส่งเมื่อ {fDateTime(item.createdAt)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip label={getStatusLabel(item.status)} color={getStatusColor(item.status) as any} />
          {item.provinceCode && <Chip label={item.provinceCode} variant="outlined" />}
        </Stack>

        {item.reason && <Alert severity="info">{item.reason}</Alert>}
        {item.reviewNote && (
          <Alert severity={item.status === 'rejected' ? 'error' : 'success'}>
            หมายเหตุจาก Admin: {item.reviewNote}
          </Alert>
        )}

        <Divider />

        <Box>
          <Typography sx={{ mb: 1.25, fontWeight: 900 }}>ข้อมูลที่เสนอแก้</Typography>
          <Stack spacing={1.25}>
            {suggestedEntries.map((entry) => (
              <DetailBlock key={entry.key} label={entry.label} value={entry.value} />
            ))}
            {!suggestedEntries.length && <Alert severity="info">ไม่มีรายละเอียดที่เสนอแก้</Alert>}
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ mb: 1.25, fontWeight: 900 }}>ข้อมูลเดิมตอนส่งคำขอ</Typography>
          <Stack spacing={1.25}>
            {originalEntries.map((entry) => (
              <DetailBlock key={entry.key} label={entry.label} value={entry.value} />
            ))}
            {!originalEntries.length && <Alert severity="info">ไม่มี snapshot ข้อมูลเดิม</Alert>}
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            component={RouterLink}
            href={`/culture-place/${encodeURIComponent(item.placeId)}`}
            variant="outlined"
          >
            ดูหน้าสถานที่
          </Button>
          <Button variant="contained" onClick={() => setSelected(null)}>
            ปิด
          </Button>
        </Stack>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 10, md: 12 },
        minHeight: '100vh',
        color: creatorTone.text,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: creatorTone.middle,
        backgroundImage: creatorPageBackground,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: creatorPosterPattern,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 1180, position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              คำขอแก้ไขข้อมูล
            </Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 680 }}>
              ติดตามข้อมูลสถานที่ที่คุณเสนอแก้ไข ดูสถานะการตรวจสอบ และอ่านข้อความตอบกลับจากทีมงาน
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            href="/culture-category"
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            sx={{ flexShrink: 0 }}
          >
            ส่งคำขอใหม่
          </Button>
        </Stack>

        {isLoading && <Alert severity="info">กำลังโหลดคำขอแก้ไข...</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon="solar:add-folder-bold" label="ทั้งหมด" value={stats.total} tone="#52615d" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon="solar:clock-circle-bold" label="รอตรวจ" value={stats.pending} tone="#9a5b12" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon="solar:check-circle-bold" label="ผ่านแล้ว" value={stats.approved} tone="#1b7f4c" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon="solar:close-circle-bold" label="ไม่ผ่าน" value={stats.rejected} tone="#b42318" />
          </Grid>
        </Grid>

        {!items.length && !isLoading ? (
          <EmptyState />
        ) : (
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                <CorrectionCard item={item} onOpen={() => setSelected(item)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: 1, md: 620 } } }}
      >
        {selected && renderCorrectionDetails(selected)}
      </Drawer>
    </Box>
  );
}

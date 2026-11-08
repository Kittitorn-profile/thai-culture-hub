'use client';

import type { IconifyName } from 'src/components/iconify';
import type { DataCorrectionRow, ContributionCorrection } from 'src/lib/contribution-corrections';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { adminApiRequest } from 'src/lib/admin-api';
import { craftImageSchema } from 'src/lib/craft-corrections';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';
import {
  getContributionLabel,
  getCorrectionFieldLabels,
  mergeContributionCorrections,
} from 'src/lib/contribution-corrections';

import { Iconify } from 'src/components/iconify';
import { CraftImageGallery } from 'src/components/craft-images/craft-image-gallery';

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
  imageUrl: 'ภาพปก',
  description: 'คำอธิบาย',
  detail: 'รายละเอียด',
};

function getStatusColor(status: ContributionCorrection['status']) {
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

function getStatusMeta(status: ContributionCorrection['status']): StatusMeta {
  if (status === 'approved') {
    return {
      icon: 'solar:check-circle-bold',
      title: 'ผ่านแล้ว',
      description: 'ผู้ดูแลระบบตรวจสอบและนำข้อมูลไปใช้งานแล้ว',
      color: 'success' as const,
      tone: '#1b7f4c',
      bg: 'rgba(42, 157, 106, 0.1)',
    };
  }

  if (status === 'rejected') {
    return {
      icon: 'solar:close-circle-bold',
      title: 'ไม่ผ่าน',
      description: 'ทีมงานแจ้งเหตุผลและข้อเสนอแนะไว้ในคำขอ',
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

function getStatusLabel(status: ContributionCorrection['status']) {
  if (status === 'approved') return 'ผ่านแล้ว';
  if (status === 'rejected') return 'ไม่ผ่าน';
  return 'รอตรวจ';
}

function getPayloadEntries(payload: Record<string, unknown>, recordId = '') {
  const labels: Record<string, string> = { ...FIELD_LABELS, ...getCorrectionFieldLabels(recordId) };
  return Object.entries(payload)
    .filter(([key]) => key !== 'images')
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
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
  active,
  onClick,
}: {
  icon: IconifyName;
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      component="button"
      type="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        width: 1,
        textAlign: 'left',
        font: 'inherit',
        cursor: 'pointer',
        border: '1px solid',
        borderColor: active ? '#8da18c' : '#e2e5de',
        '&:focus-visible': { outline: '2px solid #496653', outlineOffset: 3 },
        p: 1.75,
        height: '100%',
        borderRadius: 2,
        bgcolor: active ? '#f1f4ed' : '#fff',
        boxShadow: 'none',
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
          <Typography sx={{ fontSize: 26, fontWeight: 600, lineHeight: 1.3 }}>{value}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 2,
        textAlign: 'center',
        bgcolor: 'rgba(255,255,255,0.9)',
        boxShadow: 'none',
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
      <Typography variant="h5" sx={{ fontWeight: 600, color: creatorTone.deep }}>
        ยังไม่มีคำขอแก้ไขข้อมูล
      </Typography>
      <Typography sx={{ mt: 1, mx: 'auto', maxWidth: 540, color: 'text.secondary' }}>
        เลือกข้อมูลจากทั้ง 6 ประเภท เปิดรายละเอียดแล้วเสนอแก้ไขหรือเพิ่มภาพประกอบ
        รายการและผลตรวจสอบจะมาแสดงที่นี่
      </Typography>
      <Button
        onClick={onNew}
        variant="contained"
        startIcon={<Iconify icon="solar:add-folder-bold" />}
        sx={{ mt: 3 }}
      >
        เลือกประเภทข้อมูล
      </Button>
    </Card>
  );
}

function CorrectionCard({ item, onOpen }: { item: ContributionCorrection; onOpen: () => void }) {
  const statusMeta = getStatusMeta(item.status);
  const suggestedCount =
    getPayloadEntries(item.suggestedPayload, item.placeId).length +
    ('images' in item.suggestedPayload ? 1 : 0);

  return (
    <Card
      component="article"
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        bgcolor: '#fff',
        border: '1px solid rgba(32,42,43,0.08)',
        boxShadow: 'none',
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'rgba(32,42,43,0.22)',
          boxShadow: 'none',
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
                  fontWeight: 600,
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
            sx={{ flexShrink: 0, fontWeight: 500 }}
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

        <Stack direction="row" spacing={1} justifyContent="space-between">
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
              label={getContributionLabel(item.kind)}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, maxWidth: 1 }}
            />
          </Stack>

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
  const [items, setItems] = useState<ContributionCorrection[]>([]);
  const [selected, setSelected] = useState<ContributionCorrection | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const typeItems = useMemo(
    () => items.filter((item) => kindFilter === 'all' || item.kind === kindFilter),
    [items, kindFilter]
  );
  const filteredItems = typeItems.filter(
    (item) =>
      (statusFilter === 'all' || item.status === statusFilter) &&
      (!search.trim() ||
        [item.placeName, item.reason, item.reviewNote].some((value) =>
          value?.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th'))
        ))
  );

  const stats = useMemo(
    () => ({
      total: typeItems.length,
      pending: typeItems.filter((item) => item.status === 'pending').length,
      approved: typeItems.filter((item) => item.status === 'approved').length,
      rejected: typeItems.filter((item) => item.status === 'rejected').length,
    }),
    [typeItems]
  );

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        getCreatorPlaceCorrections(accessToken),
        adminApiRequest<{ requests: DataCorrectionRow[] }>('/api/creator/craft-corrections/', {
          accessToken,
        }),
      ]);
      const places = results[0];
      const records = results[1];
      setItems(
        mergeContributionCorrections(
          places.status === 'fulfilled' ? (places.value.data ?? []) : [],
          records.status === 'fulfilled' ? records.value.requests : []
        )
      );
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length) setError('โหลดคำขอบางประเภทไม่สำเร็จ กรุณาลองอีกครั้ง');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดคำขอแก้ไขไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace('/creator/sign-in?returnTo=%2Fcreator%2Fcontributions%2F');
      return;
    }

    if (!loading && accessToken && !isCreatorUser(user)) {
      router.replace(getRoleHomePath(user));
      return;
    }

    loadItems();
  }, [accessToken, loadItems, loading, router, user]);

  const renderCorrectionDetails = (item: ContributionCorrection) => {
    const suggestedEntries = getPayloadEntries(item.suggestedPayload, item.placeId);
    const originalEntries = getPayloadEntries(item.originalSnapshot, item.placeId);

    return (
      <Stack spacing={2.5} sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>รายละเอียดคำขอ</Typography>
          <IconButton aria-label="ปิดรายละเอียดคำขอ" onClick={() => setSelected(null)}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {item.placeName || 'คำขอแก้ไขสถานที่'}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            {getContributionLabel(item.kind)}
          </Typography>
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
            หมายเหตุจากทีมงาน: {item.reviewNote}
          </Alert>
        )}

        <Divider />

        <Box>
          <Typography sx={{ mb: 1.25, fontWeight: 600 }}>ข้อมูลที่เสนอแก้</Typography>
          <Stack spacing={1.25}>
            {suggestedEntries.map((entry) => (
              <DetailBlock key={entry.key} label={entry.label} value={entry.value} />
            ))}
            {Array.isArray(item.suggestedPayload.images) && (
              <CraftImageGallery
                images={craftImageSchema.array().parse(item.suggestedPayload.images)}
              />
            )}
            {!suggestedEntries.length && !Array.isArray(item.suggestedPayload.images) && (
              <Alert severity="info">ไม่มีรายละเอียดที่เสนอแก้</Alert>
            )}
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ mb: 1.25, fontWeight: 600 }}>ข้อมูลเดิมตอนส่งคำขอ</Typography>
          <Stack spacing={1.25}>
            {originalEntries.map((entry) => (
              <DetailBlock key={entry.key} label={entry.label} value={entry.value} />
            ))}
            {Array.isArray(item.originalSnapshot.images) && (
              <CraftImageGallery
                images={craftImageSchema.array().parse(item.originalSnapshot.images)}
              />
            )}
            {!originalEntries.length && !Array.isArray(item.originalSnapshot.images) && (
              <Alert severity="info">ไม่มีข้อมูลเดิม</Alert>
            )}
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            component={RouterLink}
            href={
              item.kind === 'places'
                ? `/culture-place/${encodeURIComponent(item.placeId)}`
                : `/creator/contributions/edit/?recordId=${encodeURIComponent(item.placeId)}`
            }
            variant="outlined"
          >
            {item.kind === 'places' ? 'ดูหน้าสถานที่' : 'เปิดรายการเพื่อเสนอข้อมูล'}
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
        py: { xs: 4, md: 5 },
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
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 1280, position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={2}
        >
          <Box>
            <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600 }}>
              ร่วมพัฒนาข้อมูล
            </Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 680, fontSize: 13, color: 'text.secondary' }}>
              ติดตามคำขอของคุณจากทั้ง 6 ประเภทข้อมูล ดูผลการตรวจสอบและข้อความจากทีมงานในที่เดียว
            </Typography>
          </Box>
          <Button
            onClick={() => setPickerOpen(true)}
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            sx={{
              flexShrink: 0,
              minHeight: 44,
              bgcolor: '#293c34',
              color: '#fff',
              '&:hover': { bgcolor: '#3c5147' },
            }}
          >
            ส่งคำขอใหม่
          </Button>
        </Stack>

        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
          {[{ key: 'all', label: 'ทุกประเภท' }, ...PUBLIC_DATA_GROUPS].map((group) => (
            <Button
              key={group.key}
              variant={kindFilter === group.key ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                setKindFilter(group.key);
                setStatusFilter('all');
              }}
            >
              {group.label} (
              {group.key === 'all'
                ? items.length
                : items.filter((item) => item.kind === group.key).length}
              )
            </Button>
          ))}
        </Stack>
        {error && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" onClick={() => void loadItems()}>
                ลองอีกครั้ง
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {isLoading && <Typography role="status">กำลังโหลดคำขอ…</Typography>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              icon="solar:add-folder-bold"
              label="ทั้งหมด"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              value={stats.total}
              tone="#52615d"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              icon="solar:clock-circle-bold"
              label="รอตรวจ"
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              value={stats.pending}
              tone="#9a5b12"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              icon="solar:check-circle-bold"
              label="ผ่านแล้ว"
              active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              value={stats.approved}
              tone="#1b7f4c"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              icon="solar:close-circle-bold"
              label="ไม่ผ่าน"
              active={statusFilter === 'rejected'}
              onClick={() => setStatusFilter('rejected')}
              value={stats.rejected}
              tone="#b42318"
            />
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
        >
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            แสดง {filteredItems.length} จาก {typeItems.length} คำขอ
          </Typography>
          <TextField
            size="small"
            label="ค้นหาชื่อรายการหรือคำขอ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: 1, sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
        {items.length > 0 && !filteredItems.length && !isLoading && (
          <Card sx={{ p: 5, textAlign: 'center' }}>
            <Typography>ไม่พบคำขอที่ตรงกับการค้นหา</Typography>
            <Button
              sx={{ mt: 1 }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setKindFilter('all');
              }}
            >
              แสดงคำขอทั้งหมด
            </Button>
          </Card>
        )}
        {!items.length && !isLoading && !error ? (
          <EmptyState onNew={() => setPickerOpen(true)} />
        ) : (
          <Grid container spacing={2}>
            {filteredItems.map((item) => (
              <Grid key={`${item.kind}:${item.id}`} size={{ xs: 12, md: 6 }}>
                <CorrectionCard item={item} onOpen={() => setSelected(item)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>เลือกประเภทข้อมูลที่ต้องการร่วมพัฒนา</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            ค้นหารายการ เปิดรายละเอียด แล้วเลือกเสนอแก้ไข / เพิ่มเติมข้อมูล
          </Typography>
          <Stack spacing={1.5}>
            {PUBLIC_DATA_GROUPS.map((group) => (
              <Button
                key={group.key}
                component={RouterLink}
                href={group.href}
                variant="outlined"
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {group.label} ↗
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>กลับ</Button>
        </DialogActions>
      </Dialog>
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

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

type PopupBannerRow = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  button_label?: string | null;
  button_url?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  dismissible?: boolean | null;
  show_once?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PopupBannerForm = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  sortOrder: string;
  isActive: boolean;
  dismissible: boolean;
  showOnce: boolean;
  startsAt: string;
  endsAt: string;
};

type PopupBannersResponse = {
  data?: PopupBannerRow[];
  message?: string;
};

const EMPTY_FORM: PopupBannerForm = {
  title: '',
  description: '',
  imageUrl: '',
  buttonLabel: '',
  buttonUrl: '',
  sortOrder: '0',
  isActive: true,
  dismissible: true,
  showOnce: true,
  startsAt: '',
  endsAt: '',
};

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function toForm(row: PopupBannerRow): PopupBannerForm {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    buttonLabel: row.button_label ?? '',
    buttonUrl: row.button_url ?? '',
    sortOrder: `${row.sort_order ?? 0}`,
    isActive: row.is_active ?? true,
    dismissible: row.dismissible ?? true,
    showOnce: row.show_once ?? true,
    startsAt: toDateTimeLocal(row.starts_at),
    endsAt: toDateTimeLocal(row.ends_at),
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'ไม่กำหนด';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatus(row: PopupBannerRow) {
  const now = Date.now();
  const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (!row.is_active) {
    return { label: 'ซ่อน', color: 'text.disabled' };
  }

  if (startsAt && startsAt > now) {
    return { label: 'รอเผยแพร่', color: 'warning.main' };
  }

  if (endsAt && endsAt < now) {
    return { label: 'หมดอายุ', color: 'error.main' };
  }

  return { label: 'กำลังแสดง', color: 'success.main' };
}

export default function PopupBannerAdminPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [editingBanner, setEditingBanner] = useState<PopupBannerForm | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const bannersQuery = useQuery({
    queryKey: ['admin-popup-banners', accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<PopupBannersResponse>('/api/admin/popup-banners', {
        accessToken,
      }),
  });

  useEffect(() => {
    if (
      bannersQuery.error &&
      bannersQuery.error instanceof AdminApiError &&
      bannersQuery.error.status === 401
    ) {
      checkUserSession?.();
    }
  }, [bannersQuery.error, checkUserSession]);

  const banners = useMemo(() => bannersQuery.data?.data ?? [], [bannersQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (form: PopupBannerForm) =>
      adminApiRequest<{ data?: PopupBannerRow; message?: string }>('/api/admin/popup-banners', {
        method: form.id ? 'PUT' : 'POST',
        accessToken,
        body: form,
      }),
    onSuccess: async () => {
      setMessage('บันทึก popup banner แล้ว');
      setEditingBanner(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-popup-banners'] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const params = new URLSearchParams({ id });

      return adminApiRequest<{ message?: string }>(`/api/admin/popup-banners?${params}`, {
        method: 'DELETE',
        accessToken,
      });
    },
    onSuccess: async () => {
      setMessage('ลบ popup banner แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-popup-banners'] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'ลบไม่สำเร็จ');
    },
  });

  const stats = useMemo(
    () => ({
      total: banners.length,
      active: banners.filter((banner) => getStatus(banner).label === 'กำลังแสดง').length,
      hidden: banners.filter((banner) => !banner.is_active).length,
    }),
    [banners]
  );

  const handleSave = async () => {
    if (!editingBanner) {
      return;
    }

    if (!editingBanner.title.trim()) {
      setError('กรุณากรอกหัวข้อ popup');
      return;
    }

    setError('');
    setMessage('');
    await saveMutation.mutateAsync(editingBanner).catch(() => undefined);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Popup Banner
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการ popup banner ที่จะแสดงบนหน้า home-view
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setEditingBanner(EMPTY_FORM)}
          >
            สร้าง popup
          </Button>
        </Stack>

        {(error || bannersQuery.error) && (
          <Alert severity="error">
            {error ||
              (bannersQuery.error instanceof Error
                ? bannersQuery.error.message
                : 'โหลดข้อมูลไม่สำเร็จ')}
          </Alert>
        )}
        {message && <Alert severity="success">{message}</Alert>}
        {bannersQuery.isLoading && <Alert severity="info">กำลังโหลด popup banner...</Alert>}

        <Alert severity="info">หน้านี้อ่านและบันทึกข้อมูลผ่าน database table popup_banners</Alert>

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          {[
            { label: 'ทั้งหมด', value: stats.total },
            { label: 'กำลังแสดง', value: stats.active },
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

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {banners.map((banner) => {
            const status = getStatus(banner);

            return (
              <Card key={banner.id} sx={{ overflow: 'hidden' }}>
                {banner.image_url ? (
                  <Image
                    alt={banner.title}
                    src={banner.image_url}
                    ratio="16/9"
                    sx={{ bgcolor: 'background.neutral' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 180,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'background.neutral',
                      color: 'text.disabled',
                    }}
                  >
                    ไม่มีรูปภาพ
                  </Box>
                )}

                <Stack spacing={1.5} sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap variant="h6" sx={{ fontWeight: 900 }}>
                        {banner.title}
                      </Typography>
                      <Typography sx={{ color: status.color, fontSize: 13, fontWeight: 800 }}>
                        {status.label}
                      </Typography>
                    </Box>

                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                      #{banner.sort_order ?? 0}
                    </Typography>
                  </Stack>

                  <Typography sx={{ minHeight: 44, color: 'text.secondary', fontSize: 13 }}>
                    {banner.description || 'ไม่มีคำอธิบาย'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    เริ่ม: {formatDate(banner.starts_at)} · สิ้นสุด: {formatDate(banner.ends_at)}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="outlined" onClick={() => setEditingBanner(toForm(banner))}>
                      แก้ไข
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => deleteMutation.mutate(banner.id)}
                    >
                      ลบ
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            );
          })}

          {!banners.length && !bannersQuery.isLoading && (
            <Card sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              ยังไม่มี popup banner
            </Card>
          )}
        </Box>
      </Stack>

      <Drawer
        anchor="right"
        open={!!editingBanner}
        onClose={() => setEditingBanner(null)}
        slotProps={{ paper: { sx: { width: { xs: 1, sm: 560 } } } }}
      >
        {editingBanner && (
          <Stack sx={{ height: 1 }}>
            <Stack spacing={0.5} sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {editingBanner.id ? 'แก้ไข popup' : 'สร้าง popup'}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                ข้อมูลนี้จะแสดงเป็น popup บนหน้า home-view เมื่อเปิดใช้งาน
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2.25} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              <TextField
                fullWidth
                label="หัวข้อ"
                value={editingBanner.title}
                onChange={(event) =>
                  setEditingBanner({ ...editingBanner, title: event.target.value })
                }
              />

              <TextField
                fullWidth
                multiline
                minRows={4}
                label="คำอธิบาย"
                value={editingBanner.description}
                onChange={(event) =>
                  setEditingBanner({ ...editingBanner, description: event.target.value })
                }
              />

              <TextField
                fullWidth
                label="Image URL"
                value={editingBanner.imageUrl}
                onChange={(event) =>
                  setEditingBanner({ ...editingBanner, imageUrl: event.target.value })
                }
              />

              {editingBanner.imageUrl && (
                <Image
                  alt={editingBanner.title || 'Popup preview'}
                  src={editingBanner.imageUrl}
                  ratio="16/9"
                  sx={{ borderRadius: 1, bgcolor: 'background.neutral' }}
                />
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="ข้อความปุ่ม"
                  value={editingBanner.buttonLabel}
                  onChange={(event) =>
                    setEditingBanner({ ...editingBanner, buttonLabel: event.target.value })
                  }
                />
                <TextField
                  fullWidth
                  label="Button URL"
                  value={editingBanner.buttonUrl}
                  onChange={(event) =>
                    setEditingBanner({ ...editingBanner, buttonUrl: event.target.value })
                  }
                />
              </Stack>

              <TextField
                fullWidth
                type="number"
                label="ลำดับการแสดง"
                value={editingBanner.sortOrder}
                onChange={(event) =>
                  setEditingBanner({ ...editingBanner, sortOrder: event.target.value })
                }
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="เริ่มแสดง"
                  InputLabelProps={{ shrink: true }}
                  value={editingBanner.startsAt}
                  onChange={(event) =>
                    setEditingBanner({ ...editingBanner, startsAt: event.target.value })
                  }
                />
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="สิ้นสุด"
                  InputLabelProps={{ shrink: true }}
                  value={editingBanner.endsAt}
                  onChange={(event) =>
                    setEditingBanner({ ...editingBanner, endsAt: event.target.value })
                  }
                />
              </Stack>

              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingBanner.isActive}
                      onChange={(event) =>
                        setEditingBanner({ ...editingBanner, isActive: event.target.checked })
                      }
                    />
                  }
                  label="เผยแพร่"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingBanner.dismissible}
                      onChange={(event) =>
                        setEditingBanner({ ...editingBanner, dismissible: event.target.checked })
                      }
                    />
                  }
                  label="ให้ผู้ใช้ปิด popup ได้"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingBanner.showOnce}
                      onChange={(event) =>
                        setEditingBanner({ ...editingBanner, showOnce: event.target.checked })
                      }
                    />
                  }
                  label="แสดงครั้งเดียวหลังผู้ใช้ปิด"
                />
              </Stack>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ p: 2.5 }}>
              <LoadingButton
                fullWidth
                variant="contained"
                loading={saveMutation.isPending}
                onClick={handleSave}
              >
                บันทึก
              </LoadingButton>
              <Button fullWidth color="inherit" onClick={() => setEditingBanner(null)}>
                ยกเลิก
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

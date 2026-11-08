'use client';

import type { HomeHeroImage } from 'src/lib/home-hero';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Box,
  Card,
  Chip,
  Table,
  Stack,
  Alert,
  Dialog,
  Button,
  Switch,
  MenuItem,
  TableRow,
  Skeleton,
  TableBody,
  TableCell,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  FormControlLabel,
} from '@mui/material';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import { type HomeHeroOperation } from 'src/lib/home-hero-crud';
import { homeHeroSchema, MAX_HERO_IMAGES } from 'src/lib/home-hero';

import { EmptyContent } from 'src/components/empty-content';
import { TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { resizeImageFile } from '../performance-groups/resize-image-file';

type Response = { images: HomeHeroImage[] };
export default function HeroAdminPage() {
  const { user } = useAuthContext();
  const token = user?.accessToken ?? user?.access_token ?? '';
  const cache = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingImage, setEditingImage] = useState<HomeHeroImage | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<HomeHeroImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeHeroImage | null>(null);
  const queryKey = ['admin-home-hero-records', token];
  const query = useQuery({
    queryKey,
    enabled: !!token,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      adminApiRequest<Response>('/api/admin/home-content/hero/', {
        accessToken: token,
        signal,
      }),
  });
  const images = query.data?.images ?? [];
  const save = useMutation({
    mutationFn: (operation: HomeHeroOperation) =>
      adminApiRequest<Response>('/api/admin/home-content/hero/', {
        method:
          operation.action === 'create'
            ? 'POST'
            : operation.action === 'delete'
              ? 'DELETE'
              : 'PATCH',
        accessToken: token,
        body: operation,
      }),
    onMutate: async () => {
      await cache.cancelQueries({ queryKey });
      setError('');
      setMessage('');
    },
    onSuccess: (result, operation) => {
      cache.setQueryData(queryKey, result);
      setMessage(
        operation.action === 'delete'
          ? 'ลบภาพแล้ว'
          : operation.action === 'move'
            ? 'บันทึกลำดับภาพแล้ว'
            : 'บันทึกภาพนี้แล้ว'
      );
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : 'บันทึกไม่สำเร็จ'),
  });
  const busy = uploading || save.isPending;
  const update = (id: string, patch: Partial<HomeHeroImage>) => {
    setError('');
    setEditingImage((current) => (current?.id === id ? { ...current, ...patch } : current));
  };
  const move = (index: number, direction: -1 | 1) => {
    const image = images[index];
    if (image) save.mutate({ action: 'move', id: image.id, direction });
  };
  const saveDraft = async () => {
    if (!editingImage || busy) return;
    const parsed = homeHeroSchema.safeParse({ images: [editingImage] });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'กรุณาตรวจข้อมูลภาพ');
      return;
    }
    try {
      if (editingOriginal) {
        const patch = Object.fromEntries(
          (['imageUrl', 'alt', 'isActive'] as const)
            .filter((key) => editingImage[key] !== editingOriginal[key])
            .map((key) => [key, editingImage[key]])
        );
        if (Object.keys(patch).length)
          await save.mutateAsync({
            action: 'update',
            id: editingImage.id,
            expected: editingOriginal,
            patch,
          });
      } else {
        await save.mutateAsync({ action: 'create', image: parsed.data.images[0] });
        setSearch('');
        setStatus('all');
        setPage(Math.floor(images.length / rowsPerPage));
      }
      setEditingImage(null);
      setEditingOriginal(null);
    } catch {
      /* The mutation displays the error and keeps this record's draft open. */
    }
  };
  const upload = async (files: File[], replaceId?: string) => {
    if (!files.length || busy || !query.isSuccess) return;
    if (!replaceId && (images?.length ?? 0) + files.length > MAX_HERO_IMAGES) {
      setError(`เพิ่มได้สูงสุด ${MAX_HERO_IMAGES} ภาพ`);
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      for (const file of files) {
        if (
          !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) ||
          file.size > 20 * 1024 * 1024
        )
          throw new Error('รองรับ JPG, PNG, WebP และ AVIF ขนาดไม่เกิน 20 MB ต่อภาพ');
        const resized = await resizeImageFile(file);
        const body = new FormData();
        body.append('file', resized);
        const result = await adminApiRequest<{ data: { url: string } }>(
          '/api/admin/home-content/hero-upload/',
          { method: 'POST', accessToken: token, body }
        );
        if (replaceId) update(replaceId, { imageUrl: result.data.url });
        else
          await save.mutateAsync({
            action: 'create',
            image: {
              id: crypto.randomUUID(),
              imageUrl: result.data.url,
              alt: file.name.replace(/\.[^.]+$/, '').slice(0, 200) || 'ภาพวัฒนธรรมไทย',
              isActive: true,
            },
          });
      }
      if (!replaceId) {
        setSearch('');
        setStatus('all');
        setPage(Math.floor((images?.length ?? 0) / rowsPerPage));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };
  const ready = query.isSuccess;
  const loadingImages = query.isPending;
  const needle = search.trim().toLocaleLowerCase('th');
  const filtered = (images ?? [])
    .map((image, index) => ({ image, index }))
    .filter(
      ({ image }) =>
        (status === 'all' || image.isActive === (status === 'active')) &&
        (!needle ||
          [image.alt, image.imageUrl].some((value) =>
            value.toLocaleLowerCase('th').includes(needle)
          ))
    );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const paginated = filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  return (
    <DashboardContent maxWidth="xl">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography component="h1" variant="h3" sx={{ fontWeight: 900 }}>
            ภาพแบนเนอร์หน้าแรก
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            เพิ่ม แก้ไข ลบ และจัดลำดับภาพ โดยบันทึกแยกตามรายการ
          </Typography>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignSelf: { md: 'flex-start' } }}
        >
          <Button
            component="a"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
          >
            ดูหน้าเว็บไซต์ ↗
          </Button>
          <Button
            variant="outlined"
            disabled={busy || !token || query.isFetching}
            onClick={() => void query.refetch()}
          >
            โหลดข้อมูลใหม่
          </Button>
        </Stack>
      </Stack>
      {(error || query.error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || (query.error instanceof Error ? query.error.message : 'โหลดภาพไม่สำเร็จ')}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="ค้นหาภาพแบนเนอร์"
            placeholder="คำอธิบายภาพ หรือ URL"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
          <TextField
            select
            fullWidth
            label="สถานะ"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            sx={{ maxWidth: { md: 220 } }}
          >
            <MenuItem value="all">ทุกสถานะ</MenuItem>
            <MenuItem value="active">เปิดใช้งาน</MenuItem>
            <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
          </TextField>
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            <Button
              component="label"
              variant="outlined"
              disabled={!ready || busy || (images?.length ?? 0) >= MAX_HERO_IMAGES}
            >
              {uploading ? 'กำลังอัปโหลด…' : 'อัปโหลดภาพ'}
              <input
                type="file"
                hidden
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={!ready || busy}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  void upload(files);
                }}
              />
            </Button>
            <Button
              variant="outlined"
              disabled={!ready || busy || (images?.length ?? 0) >= MAX_HERO_IMAGES}
              onClick={() => {
                setError('');
                setMessage('');
                setEditingOriginal(null);
                setEditingImage({ id: crypto.randomUUID(), imageUrl: '', alt: '', isActive: true });
              }}
            >
              เพิ่มภาพด้วย URL
            </Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              variant="outlined"
              label={`${images?.length ?? 0} / ${MAX_HERO_IMAGES} ภาพ`}
            />
            <Chip
              size="small"
              color="success"
              variant="soft"
              label={`เปิดใช้งาน ${images?.filter((image) => image.isActive).length ?? 0} ภาพ`}
            />
          </Stack>
        </Stack>
        <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
          {loadingImages
            ? 'กำลังโหลดภาพ…'
            : `แสดง ${filtered.length} จาก ${images?.length ?? 0} ภาพ`}{' '}
          · แนะนำภาพแนวนอน 1920 × 840 พิกเซล · เลือกอัปโหลดได้หลายไฟล์
        </Typography>
      </Card>
      <Card>
        <TableContainer sx={{ overflow: 'auto' }}>
          <Table sx={{ minWidth: 1000 }} aria-label="ภาพแบนเนอร์หน้าแรก">
            <TableHeadCustom
              headCells={[
                { id: 'order', label: 'ลำดับ', width: 80 },
                { id: 'preview', label: 'ภาพตัวอย่าง', width: 210 },
                { id: 'description', label: 'คำอธิบายภาพ' },
                { id: 'status', label: 'สถานะ', width: 180 },
                { id: 'actions', label: 'จัดการ', width: 320 },
              ]}
            />
            <TableBody>
              {loadingImages &&
                [0, 1, 2].map((row) => (
                  <TableRow key={row}>
                    <TableCell colSpan={5}>
                      <Skeleton height={70} />
                    </TableCell>
                  </TableRow>
                ))}
              {!loadingImages &&
                paginated.map(({ image, index }) => (
                  <TableRow key={image.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{index + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      {image.imageUrl ? (
                        <Box
                          component="img"
                          src={image.imageUrl}
                          alt={image.alt}
                          sx={{
                            display: 'block',
                            width: 160,
                            height: 70,
                            borderRadius: 1,
                            objectFit: 'cover',
                            bgcolor: '#edf0eb',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 160,
                            height: 70,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'background.neutral',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            ยังไม่มีภาพ
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                        {image.alt || 'ยังไม่มีคำอธิบายภาพ'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ภาพที่ {index + 1}
                        {!image.imageUrl ? ' · กรุณาเพิ่มไฟล์หรือ URL' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        label={
                          <Typography variant="body2">
                            {image.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </Typography>
                        }
                        control={
                          <Switch
                            checked={image.isActive}
                            disabled={busy}
                            onChange={(_, checked) =>
                              save.mutate({
                                action: 'update',
                                id: image.id,
                                expected: image,
                                patch: { isActive: checked },
                              })
                            }
                            slotProps={{ input: { 'aria-label': `เปิดใช้งานภาพที่ ${index + 1}` } }}
                          />
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busy}
                          onClick={() => {
                            setError('');
                            setEditingOriginal({ ...image });
                            setEditingImage({ ...image });
                          }}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="small"
                          aria-label={`เลื่อนภาพที่ ${index + 1} ขึ้น`}
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          เลื่อนขึ้น
                        </Button>
                        <Button
                          size="small"
                          aria-label={`เลื่อนภาพที่ ${index + 1} ลง`}
                          disabled={busy || index === (images?.length ?? 0) - 1}
                          onClick={() => move(index, 1)}
                        >
                          เลื่อนลง
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={busy}
                          onClick={() => {
                            setError('');
                            setDeleteTarget(image);
                          }}
                        >
                          ลบ
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              {!loadingImages && !query.error && !filtered.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyContent
                      sx={{ py: 6 }}
                      title={
                        search || status !== 'all'
                          ? 'ไม่พบภาพที่ตรงกับตัวกรอง'
                          : 'ยังไม่มีภาพแบนเนอร์'
                      }
                      description={
                        search || status !== 'all'
                          ? 'ลองเปลี่ยนคำค้นหาหรือสถานะ'
                          : 'เพิ่มภาพใหม่เพื่อแสดงบนหน้าแรก'
                      }
                      action={
                        search || status !== 'all' ? (
                          <Button
                            sx={{ mt: 2 }}
                            onClick={() => {
                              setSearch('');
                              setStatus('all');
                              setPage(0);
                            }}
                          >
                            ล้างตัวกรอง
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePaginationCustom
          page={currentPage}
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          labelRowsPerPage="แสดงต่อหน้า:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          rowsPerPageOptions={[5, 10, 20]}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
      </Card>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
        ภาพแสดงตามลำดับในตาราง · การเปิด–ปิด จัดลำดับ และลบ จะบันทึกทันที ·
        ปิดทุกภาพเพื่อใช้พื้นหลังสีเรียบ
      </Typography>
      <Dialog
        open={!!editingImage}
        onClose={() => {
          if (!busy) {
            setEditingImage(null);
            setEditingOriginal(null);
            setError('');
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingOriginal ? 'แก้ไขภาพแบนเนอร์' : 'เพิ่มภาพแบนเนอร์'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editingImage?.imageUrl && (
              <Box
                component="img"
                src={editingImage.imageUrl}
                alt={editingImage.alt}
                sx={{
                  width: 1,
                  maxHeight: 240,
                  objectFit: 'contain',
                  bgcolor: '#edf0eb',
                  borderRadius: 1.5,
                }}
              />
            )}
            <TextField
              label="URL รูปภาพ"
              value={editingImage?.imageUrl ?? ''}
              disabled={busy}
              onChange={(event) =>
                editingImage && update(editingImage.id, { imageUrl: event.target.value })
              }
              fullWidth
            />
            <TextField
              label="คำอธิบายภาพ"
              value={editingImage?.alt ?? ''}
              disabled={busy}
              onChange={(event) =>
                editingImage && update(editingImage.id, { alt: event.target.value })
              }
              fullWidth
              helperText="อธิบายสิ่งที่อยู่ในภาพสำหรับผู้ใช้โปรแกรมอ่านหน้าจอ"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Button
              component="label"
              variant="outlined"
              disabled={busy}
              sx={{ alignSelf: 'flex-start' }}
            >
              {uploading ? 'กำลังอัปโหลด…' : 'เปลี่ยนไฟล์ภาพ'}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  if (editingImage) void upload(files.slice(0, 1), editingImage.id);
                }}
              />
            </Button>
            <FormControlLabel
              label="เปิดใช้งานภาพนี้"
              control={
                <Switch
                  checked={editingImage?.isActive ?? false}
                  disabled={busy}
                  onChange={(_, checked) =>
                    editingImage && update(editingImage.id, { isActive: checked })
                  }
                />
              }
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
              กด “บันทึกภาพนี้” เพื่อเผยแพร่การแก้ไขของรายการนี้บนหน้าแรก
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => {
              setEditingImage(null);
              setEditingOriginal(null);
              setError('');
            }}
          >
            ยกเลิก
          </Button>
          <Button variant="contained" disabled={busy} onClick={() => void saveDraft()}>
            {save.isPending ? 'กำลังบันทึก…' : 'บันทึกภาพนี้'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!deleteTarget}
        onClose={() => {
          if (!busy) {
            setDeleteTarget(null);
            setError('');
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ลบภาพแบนเนอร์นี้?</DialogTitle>
        <DialogContent>
          <Typography>{deleteTarget?.alt || 'ภาพแบนเนอร์'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ภาพนี้จะถูกนำออกจากหน้าแรกทันที
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => {
              setDeleteTarget(null);
              setError('');
            }}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => {
              if (deleteTarget)
                save.mutate(
                  { action: 'delete', id: deleteTarget.id, expected: deleteTarget },
                  { onSuccess: () => setDeleteTarget(null) }
                );
            }}
          >
            {save.isPending ? 'กำลังลบ…' : 'ลบภาพนี้'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

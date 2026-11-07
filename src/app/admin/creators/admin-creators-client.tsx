'use client';

import type { CreatorStatus, CreatorProfile } from 'src/sections/creator/types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';
import { getCreatorAvatarUrl } from 'src/utils/creator-avatar';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { getAdminCreators, reviewAdminCreator } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';

const TABLE_HEAD = [
  { id: 'createdAt', label: 'วันที่สมัคร', width: 120 },
  { id: 'creator', label: 'ผู้เขียน' },
  { id: 'contact', label: 'ติดต่อ', width: 200 },
  { id: 'status', label: 'สถานะ', width: 90 },

  { id: 'warning', label: 'คำเตือน', width: 180 },
  { id: 'actions', label: '', width: 130 },
];

const STATUS_OPTIONS: Array<{ value: 'all' | CreatorStatus; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอตรวจ' },
  { value: 'approved', label: 'อนุมัติ' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

function getStatusText(status: string) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

export function AdminCreatorsClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<CreatorProfile[]>([]);
  const [selected, setSelected] = useState<CreatorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [warningNote, setWarningNote] = useState('');
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatus>('pending');
  const [creatorIsActive, setCreatorIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreatorStatus>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.displayName,
        item.email,
        item.phone,
        item.bio,
        item.provinceCode,
        item.warningNote,
        item.creatorScore?.totalScore,
        ...(item.creatorAwards ?? []).flatMap((award) => [award.title, award.subtitle]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [items, searchQuery, statusFilter]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredItems, page, rowsPerPage]
  );

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getAdminCreators(accessToken);
      setItems(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลด creator ไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredItems.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredItems.length, page, rowsPerPage]);

  useEffect(() => {
    if (!selected) {
      setRejectReason('');
      setWarningNote('');
      setCreatorStatus('pending');
      setCreatorIsActive(true);
      return;
    }

    setRejectReason(selected.rejectReason);
    setWarningNote(selected.warningNote);
    setCreatorStatus(selected.status);
    setCreatorIsActive(selected.isActive);
  }, [selected]);

  const hasChanges = Boolean(
    selected &&
    (creatorStatus !== selected.status ||
      (creatorStatus === 'approved' && creatorIsActive !== selected.isActive) ||
      (creatorStatus === 'rejected' && rejectReason.trim() !== selected.rejectReason) ||
      warningNote.trim() !== selected.warningNote)
  );

  const reviewCreator = async () => {
    if (!selected || !accessToken) return;
    if (creatorStatus === 'rejected' && !rejectReason.trim()) {
      setError('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await reviewAdminCreator(accessToken, {
        id: selected.id,
        status: creatorStatus,
        isActive: creatorStatus === 'approved' && creatorIsActive,
        rejectReason,
        warningNote,
      });
      setMessage('บันทึกการจัดการผู้เขียนแล้ว');
      setSelected(null);
      setRejectReason('');
      setWarningNote('');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'จัดการผู้เขียนไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 600 }}>
              จัดการผู้เขียน
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตรวจคำขอสมัคร อนุมัติให้ใช้งาน หรือระงับบัญชีผู้เขียน
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignSelf: { md: 'flex-start' } }}
          >
            <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหาผู้เขียน"
              placeholder="ชื่อ อีเมล หรือเบอร์โทร"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(0);
              }}
            />
            <TextField
              select
              fullWidth
              label="สถานะ"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | CreatorStatus);
                setPage(0);
              }}
              sx={{ maxWidth: { md: 220 } }}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
            แสดง {filteredItems.length.toLocaleString('th-TH')} จาก{' '}
            {items.length.toLocaleString('th-TH')} ผู้เขียน
          </Typography>
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="subtitle2">
                        {fDateTime(item.createdAt, 'YYYY/MM/DD')}
                      </Typography>
                      <Typography variant="caption">
                        {fDateTime(item.createdAt, 'HH:MM:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{item.displayName}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {item.bio || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{item.email}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {item.phone || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          item.status === 'approved'
                            ? item.isActive
                              ? 'ใช้งานได้'
                              : 'ระงับใช้งาน'
                            : getStatusText(item.status)
                        }
                        color={
                          (item.status === 'approved' && !item.isActive
                            ? 'warning'
                            : statusColor(item.status)) as any
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {item.warningNote ? (
                        <Stack spacing={0.5}>
                          <Chip
                            size="small"
                            color="warning"
                            label="มีคำเตือน"
                            sx={{ alignSelf: 'flex-start' }}
                          />
                          <Typography
                            sx={{
                              maxWidth: 220,
                              color: 'text.secondary',
                              fontSize: 12,
                            }}
                            noWrap
                          >
                            {item.warningNote}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setSelected(item)}>
                        จัดการ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!filteredItems.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={filteredItems.length}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="Page size:"
            rowsPerPageOptions={[5, 10, 25, 50]}
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
        open={!!selected}
        onClose={() => {
          if (!isSubmitting) setSelected(null);
        }}
        PaperProps={{
          sx: {
            width: { xs: 1, sm: 520 },
            bgcolor: '#fff',
            backgroundImage: 'none',
            '& .MuiFormLabel-asterisk': { color: 'error.main' },
          },
        }}
      >
        {selected && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
              spacing={2.5}
              sx={{ p: 3, flex: 1, minHeight: 0, overflowY: 'auto', '& > *': { flexShrink: 0 } }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  จัดการบัญชี Creator
                </Typography>
                <IconButton
                  aria-label="ปิด"
                  disabled={isSubmitting}
                  onClick={() => setSelected(null)}
                >
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.75} sx={{ minWidth: 0 }}>
                <Avatar
                  src={getCreatorAvatarUrl(selected.id, selected.avatarUrl)}
                  alt={selected.displayName}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: '#e9eee5',
                    color: '#365641',
                    fontWeight: 600,
                  }}
                >
                  {selected.displayName?.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="h2"
                    sx={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {selected.displayName}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.25,
                      fontSize: 13,
                      color: 'text.secondary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {selected.email}
                  </Typography>
                </Box>
              </Stack>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f3f5ef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  สถานะปัจจุบัน
                </Typography>
                <Chip
                  size="small"
                  label={
                    selected.status === 'approved'
                      ? selected.isActive
                        ? 'อนุมัติแล้ว · เข้าใช้งานได้'
                        : 'ระงับการใช้งาน'
                      : getStatusText(selected.status)
                  }
                  color={
                    selected.status === 'approved' && !selected.isActive
                      ? 'warning'
                      : (statusColor(selected.status) as any)
                  }
                />
                {selected.bio && (
                  <Typography
                    sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary', whiteSpace: 'pre-wrap' }}
                  >
                    {selected.bio}
                  </Typography>
                )}
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}
              <Divider />
              <Typography component="h3" sx={{ fontWeight: 600 }}>
                เปลี่ยนสถานะบัญชี
              </Typography>
              <TextField
                select
                fullWidth
                label="เลือกสถานะใหม่"
                value={
                  creatorStatus === 'approved'
                    ? creatorIsActive
                      ? 'active'
                      : 'suspended'
                    : creatorStatus
                }
                disabled={isSubmitting}
                onChange={(event) => {
                  const value = event.target.value;
                  setCreatorStatus(
                    value === 'active' || value === 'suspended'
                      ? 'approved'
                      : (value as CreatorStatus)
                  );
                  setCreatorIsActive(value === 'active');
                }}
              >
                <MenuItem value="pending">รอตรวจ — ยังเข้าใช้งานไม่ได้</MenuItem>
                <MenuItem value="active">อนุมัติและเปิดใช้งาน</MenuItem>
                <MenuItem value="suspended">ระงับใช้งาน — เก็บผลอนุมัติเดิมไว้</MenuItem>
                <MenuItem value="rejected">ไม่อนุมัติคำขอสมัคร</MenuItem>
              </TextField>
              <Alert
                sx={{
                  bgcolor: '#f0f4ee',
                  color: '#47604d',
                  borderRadius: 1.5,
                  fontSize: 13,
                  '& .MuiAlert-icon': { color: '#5c785e' },
                }}
                severity={creatorStatus === 'approved' && creatorIsActive ? 'success' : 'info'}
              >
                {creatorStatus === 'approved' && creatorIsActive
                  ? 'หลังบันทึก ผู้เขียนจะเข้าสู่ระบบและส่งบทความได้'
                  : 'หลังบันทึก ผู้เขียนจะยังเข้าใช้งานไม่ได้'}
              </Alert>
              {creatorStatus === 'rejected' && (
                <TextField
                  multiline
                  minRows={3}
                  label="เหตุผลที่ไม่อนุมัติ"
                  required
                  disabled={isSubmitting}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  helperText="ผู้เขียนจะเห็นเหตุผลนี้ กรุณาระบุให้ชัดเจน"
                />
              )}
              <Box
                key={selected.id}
                sx={{
                  boxShadow: 'none',
                  border: '1px solid #e2e5de',
                  borderRadius: 1.5,
                  '&::before': { display: 'none' },
                }}
              >
                <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                      ข้อความเตือนถึงผู้เขียน
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {selected.warningNote
                        ? 'บัญชีนี้มีคำเตือนอยู่แล้ว'
                        : 'ไม่จำเป็นต้องกรอก และไม่เปลี่ยนสิทธิ์เข้าใช้งาน'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ px: 2, pb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="ข้อความเตือน"
                    placeholder="แจ้งสิ่งที่ผู้เขียนควรปรับปรุง"
                    disabled={isSubmitting}
                    value={warningNote}
                    onChange={(event) => setWarningNote(event.target.value)}
                    helperText="ข้อความนี้จะแสดงให้ผู้เขียนเห็นหลังบันทึก หากลบข้อความแล้วบันทึกจะเป็นการล้างคำเตือน"
                  />
                  {selected.warningNote && (
                    <Button
                      color="inherit"
                      disabled={isSubmitting || !warningNote}
                      onClick={() => setWarningNote('')}
                      sx={{ mt: 1 }}
                    >
                      ล้างข้อความเตือน
                    </Button>
                  )}
                </Box>
              </Box>
              <Divider />
              <Box
                sx={{
                  boxShadow: 'none',
                  border: '1px solid #e2e5de',
                  '&::before': { display: 'none' },
                }}
              >
                <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>คะแนนและรางวัล</Typography>
                </Box>
                <Box sx={{ px: 2, pb: 2 }}>
                  {' '}
                  <Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          flex: 1,
                        }}
                      >
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          คะแนนรวม
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                          {selected.creatorScore?.totalScore ?? 0}/100
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          flex: 1,
                        }}
                      >
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          บทความเผยแพร่
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                          {selected.creatorScore?.publishedArticleCount ?? 0}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                      <Chip
                        size="small"
                        label={`คุณภาพ ${selected.creatorScore?.averageQualityScore ?? 0}`}
                        variant="soft"
                      />
                      <Chip
                        size="small"
                        label={`โปรไฟล์ ${selected.creatorScore?.profileCompletenessScore ?? 0}`}
                        variant="soft"
                      />
                      <Chip
                        size="small"
                        label={`วิว ${(selected.creatorScore?.totalViews ?? 0).toLocaleString('th-TH')}`}
                        variant="soft"
                      />
                      <Chip
                        size="small"
                        label={`ไลก์ ${(selected.creatorScore?.totalLikes ?? 0).toLocaleString('th-TH')}`}
                        variant="soft"
                      />
                    </Stack>
                    {selected.creatorAwards?.length ? (
                      <Stack spacing={1}>
                        {selected.creatorAwards.map((award) => (
                          <Stack
                            key={award.key}
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Box
                              sx={{
                                width: 54,
                                height: 54,
                                borderRadius: 1,
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                                bgcolor: 'background.neutral',
                              }}
                            >
                              {award.imageUrl ? (
                                <Box
                                  component="img"
                                  src={award.imageUrl}
                                  alt={award.title}
                                  sx={{ width: 1, height: 1, objectFit: 'contain' }}
                                />
                              ) : (
                                <Typography sx={{ fontSize: 10, fontWeight: 600 }}>
                                  BADGE
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600 }}>{award.title}</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                                {award.subtitle}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        ยังไม่ได้รับรางวัลตามเกณฑ์ที่ตั้งไว้
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Stack>
            <Box
              sx={{
                flexShrink: 0,
                px: 3,
                py: 2.5,
                bgcolor: '#fff',
                borderTop: '1px solid #e2e5de',
              }}
            >
              <Typography sx={{ mb: 1.5, fontSize: 12, color: 'text.secondary' }}>
                {hasChanges ? 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก' : 'ยังไม่มีการเปลี่ยนแปลง'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  sx={{
                    minHeight: 44,
                    flex: 1,
                    borderRadius: 1.5,
                    bgcolor: '#293c34',
                    color: '#fff',
                    '&:hover': { bgcolor: '#3c5147' },
                  }}
                  disabled={!hasChanges || (creatorStatus === 'rejected' && !rejectReason.trim())}
                  loading={isSubmitting}
                  onClick={reviewCreator}
                >
                  บันทึกการเปลี่ยนแปลง
                </Button>
                <Button color="inherit" disabled={isSubmitting} onClick={() => setSelected(null)}>
                  ยกเลิก
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>
    </DashboardContent>
  );
}

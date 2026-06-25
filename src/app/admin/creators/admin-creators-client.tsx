'use client';

import type { CreatorStatus, CreatorProfile } from 'src/sections/creator/types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { getAdminCreators, reviewAdminCreator } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';

const TABLE_HEAD = [
  { id: 'createdAt', label: 'วันที่สมัคร', width: 120 },
  { id: 'creator', label: 'ผู้เขียน' },
  { id: 'contact', label: 'ติดต่อ', width: 200 },
  { id: 'score', label: 'คะแนนรวม', width: 160 },
  { id: 'awards', label: 'รางวัลที่ได้', width: 260 },
  { id: 'status', label: 'สถานะ', width: 90 },
  { id: 'active', label: 'การใช้งาน', width: 100 },
  { id: 'warning', label: 'คำเตือน', width: 180 },
  { id: 'actions', label: '', width: 130 },
];

const STATUS_OPTIONS: Array<{ value: 'all' | CreatorStatus; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอตรวจ' },
  { value: 'approved', label: 'อนุมัติ' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

function scoreColor(score: number) {
  if (score >= 85) return 'success';
  if (score >= 70) return 'primary';
  if (score >= 50) return 'warning';

  return 'default';
}

function generateCreatorPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);

  return Array.from(values, (value) => chars[value % chars.length]).join('');
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreatorStatus>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
      setNewPassword('');
      setConfirmNewPassword('');
      return;
    }

    setRejectReason(selected.rejectReason);
    setWarningNote(selected.warningNote);
    setCreatorStatus(selected.status);
    setCreatorIsActive(selected.isActive);
    setNewPassword('');
    setConfirmNewPassword('');
  }, [selected]);

  const reviewCreator = async () => {
    if (!selected || !accessToken) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await reviewAdminCreator(accessToken, {
        id: selected.id,
        status: creatorStatus,
        isActive: creatorIsActive,
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

  const resetCreatorPassword = async () => {
    if (!selected || !accessToken) return;

    const trimmedPassword = newPassword.trim();

    if (trimmedPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      setMessage('');
      return;
    }

    if (trimmedPassword !== confirmNewPassword.trim()) {
      setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      setMessage('');
      return;
    }

    setIsResettingPassword(true);
    setError('');
    setMessage('');

    try {
      await adminApiRequest<{ message?: string }>('/api/admin/creators', {
        method: 'PATCH',
        accessToken,
        body: {
          action: 'resetPassword',
          id: selected.id,
          password: trimmedPassword,
        },
      });
      setMessage('ตั้งรหัสผ่านใหม่ให้ผู้เขียนแล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const fillGeneratedPassword = () => {
    const password = generateCreatorPassword();
    setNewPassword(password);
    setConfirmNewPassword(password);
    setError('');
    setMessage('');
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              จัดการผู้เขียน
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการ user ที่ลงทะเบียนเป็น creator, เปิด/ปิด active และบันทึกคำเตือน
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลด creator...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหา creator"
              placeholder="ชื่อ, email, เบอร์โทร, bio"
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
            {items.length.toLocaleString('th-TH')} creator
          </Typography>
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 1520 }}>
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
                      <Typography sx={{ fontWeight: 800 }}>{item.displayName}</Typography>
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
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={`${item.creatorScore?.totalScore ?? 0}/100`}
                          color={scoreColor(item.creatorScore?.totalScore ?? 0) as any}
                          variant="soft"
                        />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          บทความ {item.creatorScore?.publishedArticleCount ?? 0} · คุณภาพ{' '}
                          {item.creatorScore?.averageQualityScore ?? 0}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          วิว {(item.creatorScore?.totalViews ?? 0).toLocaleString('th-TH')} · ไลก์{' '}
                          {(item.creatorScore?.totalLikes ?? 0).toLocaleString('th-TH')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {item.creatorAwards?.length ? (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {item.creatorAwards.slice(0, 3).map((award) => (
                            <Chip
                              key={award.key}
                              size="small"
                              label={award.title}
                              variant="soft"
                              color={award.key === 'topContributor' ? 'warning' : 'default'}
                            />
                          ))}
                          {item.creatorAwards.length > 3 && (
                            <Chip size="small" label={`+${item.creatorAwards.length - 3}`} />
                          )}
                        </Stack>
                      ) : (
                        <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          STATUS_OPTIONS.find((option) => option.value === item.status)?.label ??
                          item.status
                        }
                        color={statusColor(item.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        color={item.isActive ? 'success' : 'default'}
                        variant={item.isActive ? 'soft' : 'outlined'}
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
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: 1, sm: 520 } } }}
      >
        {selected && (
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {selected.displayName}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{selected.email}</Typography>
            </Box>
            <Chip
              label={STATUS_OPTIONS.find((option) => option.value === selected.status)?.label}
              color={statusColor(selected.status) as any}
              sx={{ alignSelf: 'flex-start' }}
            />
            {selected.warningNote && (
              <Alert severity="warning">
                {selected.warningNote}
                {selected.warnedAt ? ` · ${fDateTime(selected.warnedAt)}` : ''}
              </Alert>
            )}
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {selected.bio || 'ไม่มีข้อมูลแนะนำตัว'}
            </Typography>
            <Divider />
            <Box>
              <Typography sx={{ mb: 1.5, fontWeight: 900 }}>คะแนนและรางวัล</Typography>
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
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>คะแนนรวม</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
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
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
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
                          <Typography sx={{ fontSize: 10, fontWeight: 900 }}>BADGE</Typography>
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }}>{award.title}</Typography>
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
            <Divider />
            <TextField
              select
              fullWidth
              label="สถานะผู้เขียน"
              value={creatorStatus}
              onChange={(event) => setCreatorStatus(event.target.value as CreatorStatus)}
            >
              {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Active"
              value={creatorIsActive ? 'active' : 'inactive'}
              onChange={(event) => setCreatorIsActive(event.target.value === 'active')}
              helperText="Inactive จะปิดการใช้งานบัญชี creator และบล็อกการเขียน/อัปโหลด"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField
              multiline
              minRows={3}
              label="เหตุผลกรณี reject"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              helperText="จำเป็นเมื่อเลือกสถานะไม่อนุมัติ"
            />
            <TextField
              multiline
              minRows={3}
              label="ข้อความเตือน"
              placeholder="เช่น ใช้คำไม่สุภาพในบทความ กรุณาปรับภาษาให้เหมาะสม"
              value={warningNote}
              onChange={(event) => setWarningNote(event.target.value)}
              helperText="ปล่อยว่างเพื่อล้างคำเตือน"
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" loading={isSubmitting} onClick={reviewCreator}>
                บันทึก
              </Button>
              <Button color="inherit" onClick={() => setSelected(null)}>
                ยกเลิก
              </Button>
            </Stack>
            <Divider />
            <Box>
              <Typography sx={{ fontWeight: 900 }}>ตั้งรหัสผ่านใหม่</Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                ใช้ในกรณีผู้เขียนลืมรหัสผ่าน จากนั้นแจ้งรหัสใหม่ให้ผู้เขียนผ่านช่องทางที่ปลอดภัย
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="รหัสผ่านใหม่"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                helperText="อย่างน้อย 6 ตัวอักษร"
              />
              <TextField
                fullWidth
                label="ยืนยันรหัสผ่านใหม่"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={fillGeneratedPassword}>
                สุ่มรหัสผ่าน
              </Button>
              <LoadingButton
                color="warning"
                variant="contained"
                loading={isResettingPassword}
                onClick={resetCreatorPassword}
              >
                ตั้งรหัสผ่านใหม่
              </LoadingButton>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';
import { SYSTEM_CULTURE_CATEGORIES } from 'src/lib/culture-categories';

import { EmptyContent } from 'src/components/empty-content';
import { TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

type ReviewerStatus = 'pending' | 'verified' | 'suspended' | 'rejected';
type ReviewerLevel = 'junior' | 'senior' | 'expert';

type AdminReviewer = {
  id: string;
  userId: string;
  email: string;
  userDisplayName: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  reviewerLevel: ReviewerLevel;
  reviewerStatus: ReviewerStatus;
  expertiseCategories: string[];
  expertiseRegions: string[];
  expertiseProvinces: string[];
  organization: string;
  position: string;
  credentials: string;
  proofUrls: string[];
  verifiedBy: string;
  verifiedAt: string;
  reviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  accuracyScore: number;
  trustScore: number;
  canReviewCategories: string[];
  canReviewRegions: string[];
  canApprove: boolean;
  canPublish: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type AdminReviewerUser = {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string;
};

type ReviewerForm = {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  reviewerLevel: ReviewerLevel;
  reviewerStatus: ReviewerStatus;
  expertiseCategories: string;
  expertiseRegions: string;
  expertiseProvinces: string;
  organization: string;
  position: string;
  credentials: string;
  proofUrls: string;
  canReviewCategories: string;
  canReviewRegions: string;
  canApprove: boolean;
  canPublish: boolean;
  notes: string;
};

type ReviewerAction = 'suspend' | 'delete';

type MasterOption = {
  value: string;
  label: string;
};

type ReviewersResponse = {
  data?: AdminReviewer[];
  users?: AdminReviewerUser[];
  message?: string;
};

const defaultForm: ReviewerForm = {
  id: '',
  userId: '',
  displayName: '',
  bio: '',
  avatarUrl: '',
  reviewerLevel: 'junior',
  reviewerStatus: 'pending',
  expertiseCategories: '',
  expertiseRegions: '',
  expertiseProvinces: '',
  organization: '',
  position: '',
  credentials: '',
  proofUrls: '',
  canReviewCategories: '',
  canReviewRegions: '',
  canApprove: false,
  canPublish: false,
  notes: '',
};

const TABLE_HEAD = [
  { id: 'avatar', label: 'รูป', width: 88 },
  { id: 'reviewer', label: 'ผู้ตรวจสอบ', width: 280 },
  { id: 'expertise', label: 'ความเชี่ยวชาญ', width: 260 },
  { id: 'status', label: 'สถานะ', width: 150 },
  { id: 'score', label: 'คะแนน', width: 170 },
  { id: 'permission', label: 'สิทธิ์', width: 180 },
  { id: 'updatedAt', label: 'อัปเดตล่าสุด', width: 170 },
  { id: 'actions', label: '', width: 260, align: 'right' as const },
];

const STATUS_OPTIONS: Array<{ value: ReviewerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'verified', label: 'ยืนยันแล้ว' },
  { value: 'suspended', label: 'ระงับ' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

const LEVEL_OPTIONS: Array<{ value: ReviewerLevel; label: string }> = [
  { value: 'junior', label: 'ระดับเริ่มต้น' },
  { value: 'senior', label: 'ระดับชำนาญ' },
  { value: 'expert', label: 'ระดับผู้เชี่ยวชาญ' },
];

const REGION_LABELS: Record<string, string> = {
  central: 'ภาคกลาง',
  north: 'ภาคเหนือ',
  northeast: 'ภาคตะวันออกเฉียงเหนือ',
  east: 'ภาคตะวันออก',
  west: 'ภาคตะวันตก',
  south: 'ภาคใต้',
};

const CATEGORY_OPTIONS: MasterOption[] = SYSTEM_CULTURE_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));

const REGION_OPTIONS: MasterOption[] = Array.from(
  new Set(provinces.map((province) => province.region).filter(Boolean))
).map((region) => ({
  value: region,
  label: REGION_LABELS[region] ?? region,
}));

const PROVINCE_OPTIONS: MasterOption[] = provinces.map((province) => ({
  value: province.code,
  label: province.name,
}));

function statusColor(status: ReviewerStatus) {
  if (status === 'verified') return 'success';
  if (status === 'suspended' || status === 'rejected') return 'error';
  return 'warning';
}

function getStatusLabel(status: ReviewerStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function getLevelLabel(level: ReviewerLevel) {
  return LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

function joinValues(values: string[]) {
  return values.filter(Boolean).join(', ');
}

function splitValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOptionLabel(value: string, options: MasterOption[]) {
  return options.find((option) => option.value === value || option.label === value)?.label ?? value;
}

function formatValues(values: string[], options: MasterOption[]) {
  return values
    .map((value) => getOptionLabel(value, options))
    .filter(Boolean)
    .join(', ');
}

function getSelectedOptions(value: string, options: MasterOption[]) {
  return splitValues(value).map((item) => {
    const option = options.find((current) => current.value === item || current.label === item);

    return option ?? { value: item, label: item };
  });
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase();
}

function toForm(reviewer: AdminReviewer): ReviewerForm {
  return {
    id: reviewer.id,
    userId: reviewer.userId,
    displayName: reviewer.displayName,
    bio: reviewer.bio,
    avatarUrl: reviewer.avatarUrl,
    reviewerLevel: reviewer.reviewerLevel,
    reviewerStatus: reviewer.reviewerStatus,
    expertiseCategories: joinValues(reviewer.expertiseCategories),
    expertiseRegions: joinValues(reviewer.expertiseRegions),
    expertiseProvinces: joinValues(reviewer.expertiseProvinces),
    organization: reviewer.organization,
    position: reviewer.position,
    credentials: reviewer.credentials,
    proofUrls: joinValues(reviewer.proofUrls),
    canReviewCategories: joinValues(reviewer.canReviewCategories),
    canReviewRegions: joinValues(reviewer.canReviewRegions),
    canApprove: reviewer.canApprove,
    canPublish: reviewer.canPublish,
    notes: reviewer.notes,
  };
}

export function AdminReviewersClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<AdminReviewer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AdminReviewerUser[]>([]);
  const [form, setForm] = useState<ReviewerForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewerStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<{
    id: string;
    type: ReviewerAction;
  } | null>(null);
  const selectedAvailableUser = useMemo(
    () => availableUsers.find((item) => item.id === form.userId) ?? null,
    [availableUsers, form.userId]
  );
  const selectedReviewer = useMemo(
    () => items.find((item) => item.userId === form.userId) ?? null,
    [form.userId, items]
  );
  const formAvatarUrl =
    selectedReviewer?.avatarUrl ?? selectedAvailableUser?.photoUrl ?? form.avatarUrl;
  const formAvatarName =
    form.displayName ||
    selectedReviewer?.displayName ||
    selectedAvailableUser?.displayName ||
    selectedAvailableUser?.email ||
    'ผู้ตรวจสอบ';

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== 'all' && item.reviewerStatus !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.displayName,
        item.email,
        item.organization,
        item.position,
        item.expertiseCategories.join(' '),
        item.expertiseRegions.join(' '),
        item.expertiseProvinces.join(' '),
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
      const result = await adminApiRequest<ReviewersResponse>('/api/admin/reviewers', {
        accessToken,
      });

      setItems(result.data ?? []);
      setAvailableUsers(result.users ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดผู้ตรวจสอบไม่สำเร็จ');

      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await checkUserSession?.();
      }
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

  const updateForm = (field: keyof ReviewerForm, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateMasterField = (field: keyof ReviewerForm, values: MasterOption[]) => {
    updateForm(field, values.map((item) => item.value).join(', '));
  };

  const openCreateDrawer = () => {
    setForm(defaultForm);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (reviewer: AdminReviewer) => {
    setForm(toForm(reviewer));
    setIsDrawerOpen(true);
  };

  const saveReviewer = async () => {
    if (!accessToken) return;

    if (!form.id && !form.userId) {
      setError('กรุณาเลือกผู้ใช้งานที่จะผูกกับผู้ตรวจสอบ');
      return;
    }

    if (!form.displayName.trim()) {
      setError('กรุณากรอกชื่อผู้ตรวจสอบ');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await adminApiRequest<{ data?: AdminReviewer }>('/api/admin/reviewers', {
        method: form.id ? 'PATCH' : 'POST',
        accessToken,
        body: form,
      });
      setMessage('บันทึกโปรไฟล์ผู้ตรวจสอบแล้ว');
      setIsDrawerOpen(false);
      setForm(defaultForm);
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกผู้ตรวจสอบไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const getReviewerPayload = (reviewer: AdminReviewer, changes: Partial<ReviewerForm> = {}) => ({
    id: reviewer.id,
    displayName: reviewer.displayName,
    bio: reviewer.bio,
    avatarUrl: reviewer.avatarUrl,
    reviewerLevel: reviewer.reviewerLevel,
    reviewerStatus: reviewer.reviewerStatus,
    expertiseCategories: joinValues(reviewer.expertiseCategories),
    expertiseRegions: joinValues(reviewer.expertiseRegions),
    expertiseProvinces: joinValues(reviewer.expertiseProvinces),
    organization: reviewer.organization,
    position: reviewer.position,
    credentials: reviewer.credentials,
    proofUrls: joinValues(reviewer.proofUrls),
    canReviewCategories: joinValues(reviewer.canReviewCategories),
    canReviewRegions: joinValues(reviewer.canReviewRegions),
    canApprove: reviewer.canApprove,
    canPublish: reviewer.canPublish,
    notes: reviewer.notes,
    ...changes,
  });

  const suspendReviewer = async (reviewer: AdminReviewer) => {
    if (!accessToken || reviewer.reviewerStatus === 'suspended') return;

    if (!window.confirm(`ต้องการปิดการตรวจของ ${reviewer.displayName} หรือไม่?`)) {
      return;
    }

    setActiveAction({ id: reviewer.id, type: 'suspend' });
    setError('');
    setMessage('');

    try {
      await adminApiRequest<{ data?: AdminReviewer }>('/api/admin/reviewers', {
        method: 'PATCH',
        accessToken,
        body: getReviewerPayload(reviewer, {
          reviewerStatus: 'suspended',
          canApprove: false,
          canPublish: false,
        }),
      });
      setMessage('ปิดการตรวจแล้ว');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ปิดการตรวจไม่สำเร็จ');
    } finally {
      setActiveAction(null);
    }
  };

  const deleteReviewer = async (reviewer: AdminReviewer) => {
    if (!accessToken) return;

    if (!window.confirm(`ต้องการลบ ${reviewer.displayName} ออกจากหน้าผู้ตรวจสอบหรือไม่?`)) {
      return;
    }

    setActiveAction({ id: reviewer.id, type: 'delete' });
    setError('');
    setMessage('');

    try {
      await adminApiRequest<{ message?: string }>('/api/admin/reviewers', {
        method: 'DELETE',
        accessToken,
        body: { id: reviewer.id },
      });
      setMessage('ลบผู้ตรวจสอบแล้ว');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ลบผู้ตรวจสอบไม่สำเร็จ');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              จัดการผู้ตรวจสอบ
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการโปรไฟล์ผู้ตรวจสอบ ความเชี่ยวชาญ สถานะยืนยัน และสิทธิ์การอนุมัติ
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
            <Button variant="contained" onClick={openCreateDrawer}>
              เพิ่มผู้ตรวจสอบ
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดผู้ตรวจสอบ...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหาผู้ตรวจสอบ"
              placeholder="ชื่อ, อีเมล, องค์กร, ความเชี่ยวชาญ"
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
                setStatusFilter(event.target.value as ReviewerStatus | 'all');
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
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 1340 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedItems.map((reviewer) => (
                  <TableRow key={reviewer.id} hover>
                    <TableCell>
                      <Avatar
                        src={reviewer.avatarUrl || undefined}
                        alt={reviewer.displayName}
                        sx={{ width: 44, height: 44 }}
                      >
                        {getInitials(reviewer.displayName || reviewer.email)}
                      </Avatar>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 800 }}>{reviewer.displayName}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {reviewer.email || reviewer.userId}
                        </Typography>
                        {(reviewer.organization || reviewer.position) && (
                          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                            {[reviewer.organization, reviewer.position].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.75}>
                        <Typography sx={{ fontSize: 13 }}>
                          {formatValues(reviewer.expertiseCategories, CATEGORY_OPTIONS) || '-'}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {[
                            formatValues(reviewer.expertiseRegions, REGION_OPTIONS),
                            formatValues(reviewer.expertiseProvinces, PROVINCE_OPTIONS),
                          ]
                            .filter(Boolean)
                            .join(' · ') || '-'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.75} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={getStatusLabel(reviewer.reviewerStatus)}
                          color={statusColor(reviewer.reviewerStatus)}
                          variant="soft"
                        />
                        <Chip
                          size="small"
                          label={getLevelLabel(reviewer.reviewerLevel)}
                          variant="outlined"
                        />
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: 13 }}>
                          ความน่าเชื่อถือ {reviewer.trustScore.toLocaleString('th-TH')}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          ความแม่นยำ {reviewer.accuracyScore.toLocaleString('th-TH')} · ตรวจแล้ว{' '}
                          {reviewer.reviewCount.toLocaleString('th-TH')}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {reviewer.canApprove && (
                          <Chip size="small" label="อนุมัติได้" variant="soft" />
                        )}
                        {reviewer.canPublish && (
                          <Chip size="small" label="เผยแพร่ได้" variant="soft" />
                        )}
                        {!reviewer.canApprove && !reviewer.canPublish && (
                          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>-</Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {reviewer.updatedAt ? fDateTime(reviewer.updatedAt) : '-'}
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditDrawer(reviewer)}
                        >
                          แก้ไข
                        </Button>
                        <LoadingButton
                          size="small"
                          color="warning"
                          variant="outlined"
                          loading={
                            activeAction?.id === reviewer.id && activeAction.type === 'suspend'
                          }
                          disabled={reviewer.reviewerStatus === 'suspended'}
                          onClick={() => suspendReviewer(reviewer)}
                        >
                          ปิดใช้งาน
                        </LoadingButton>
                        <LoadingButton
                          size="small"
                          color="error"
                          variant="outlined"
                          loading={
                            activeAction?.id === reviewer.id && activeAction.type === 'delete'
                          }
                          onClick={() => deleteReviewer(reviewer)}
                        >
                          ลบ
                        </LoadingButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {!filteredItems.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <EmptyContent filled title="ไม่พบข้อมูล" sx={{ py: 10 }} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={filteredItems.length}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="จำนวนต่อหน้า:"
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
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: 1, sm: 620 } },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
            <Box>
              <Typography variant="h6">
                {form.id ? 'แก้ไขผู้ตรวจสอบ' : 'เพิ่มผู้ตรวจสอบ'}
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                โปรไฟล์นี้แยกจากบทบาทของผู้ใช้งาน และใช้เป็นรายชื่อผู้ตรวจบทความ
              </Typography>
            </Box>

            <Button color="inherit" onClick={() => setIsDrawerOpen(false)}>
              ปิด
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
            <TextField
              select
              fullWidth
              label="ผู้ใช้งาน"
              value={form.userId}
              disabled={Boolean(form.id)}
              onChange={(event) => {
                const selectedUser = availableUsers.find((item) => item.id === event.target.value);

                updateForm('userId', event.target.value);

                if (selectedUser && !form.displayName) {
                  updateForm('displayName', selectedUser.displayName || selectedUser.email);
                }

                if (selectedUser) {
                  updateForm('avatarUrl', selectedUser.photoUrl);
                }
              }}
            >
              {form.id && (
                <MenuItem value={form.userId}>
                  {items.find((item) => item.userId === form.userId)?.email || form.userId}
                </MenuItem>
              )}
              {availableUsers.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.displayName || item.email} · {item.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="ชื่อที่แสดง"
              value={form.displayName}
              onChange={(event) => updateForm('displayName', event.target.value)}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="ประวัติย่อ"
              value={form.bio}
              onChange={(event) => updateForm('bio', event.target.value)}
            />

            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={formAvatarUrl || undefined}
                  alt={formAvatarName}
                  sx={{ width: 56, height: 56, fontWeight: 900, bgcolor: 'primary.main' }}
                >
                  {getInitials(formAvatarName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>รูปผู้ตรวจสอบ</Typography>
                  <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
                    ใช้รูปเดียวกับโปรไฟล์บัญชีของผู้ใช้งาน แก้ไขรูปได้จากหน้าโปรไฟล์ของบัญชีนั้น
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label="ระดับ"
                value={form.reviewerLevel}
                onChange={(event) => updateForm('reviewerLevel', event.target.value)}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="สถานะ"
                value={form.reviewerStatus}
                onChange={(event) => updateForm('reviewerStatus', event.target.value)}
              >
                {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="องค์กร"
                value={form.organization}
                onChange={(event) => updateForm('organization', event.target.value)}
              />
              <TextField
                fullWidth
                label="ตำแหน่ง"
                value={form.position}
                onChange={(event) => updateForm('position', event.target.value)}
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="คุณวุฒิและประสบการณ์"
              value={form.credentials}
              onChange={(event) => updateForm('credentials', event.target.value)}
            />

            <TextField
              fullWidth
              label="ลิงก์หลักฐาน"
              placeholder="คั่นแต่ละรายการด้วยจุลภาค"
              value={form.proofUrls}
              onChange={(event) => updateForm('proofUrls', event.target.value)}
            />

            <Autocomplete
              multiple
              options={CATEGORY_OPTIONS}
              value={getSelectedOptions(form.expertiseCategories, CATEGORY_OPTIONS)}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              onChange={(_, values) => updateMasterField('expertiseCategories', values)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="หมวดหมู่ที่เชี่ยวชาญ"
                  placeholder="เลือกจากรายการกลาง"
                />
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                multiple
                fullWidth
                options={REGION_OPTIONS}
                value={getSelectedOptions(form.expertiseRegions, REGION_OPTIONS)}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, values) => updateMasterField('expertiseRegions', values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ภูมิภาคที่เชี่ยวชาญ"
                    placeholder="เลือกจากรายการกลาง"
                  />
                )}
              />
              <Autocomplete
                multiple
                fullWidth
                options={PROVINCE_OPTIONS}
                value={getSelectedOptions(form.expertiseProvinces, PROVINCE_OPTIONS)}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, values) => updateMasterField('expertiseProvinces', values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="จังหวัดที่เชี่ยวชาญ"
                    placeholder="เลือกจากรายการกลาง"
                  />
                )}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                multiple
                fullWidth
                options={CATEGORY_OPTIONS}
                value={getSelectedOptions(form.canReviewCategories, CATEGORY_OPTIONS)}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, values) => updateMasterField('canReviewCategories', values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="หมวดหมู่ที่ตรวจได้"
                    placeholder="เลือกจากรายการกลาง"
                  />
                )}
              />
              <Autocomplete
                multiple
                fullWidth
                options={REGION_OPTIONS}
                value={getSelectedOptions(form.canReviewRegions, REGION_OPTIONS)}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, values) => updateMasterField('canReviewRegions', values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ภูมิภาคที่ตรวจได้"
                    placeholder="เลือกจากรายการกลาง"
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.canApprove}
                    onChange={(event) => updateForm('canApprove', event.target.checked)}
                  />
                }
                label="อนุมัติได้"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.canPublish}
                    onChange={(event) => updateForm('canPublish', event.target.checked)}
                  />
                }
                label="เผยแพร่ได้"
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="หมายเหตุ"
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
            />
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ p: 3 }}>
            <Button color="inherit" onClick={() => setIsDrawerOpen(false)}>
              ยกเลิก
            </Button>
            <LoadingButton variant="contained" loading={isSaving} onClick={saveReviewer}>
              บันทึก
            </LoadingButton>
          </Stack>
        </Stack>
      </Drawer>
    </DashboardContent>
  );
}

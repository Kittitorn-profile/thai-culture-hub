'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';
import {
  ADMIN_ROLE,
  type AdminPermission,
  ADMIN_PERMISSION_OPTIONS,
} from 'src/auth/admin-permissions';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  permissions: AdminPermission[];
  firstName?: string;
  lastName?: string;
  displayName?: string;
  createdAt?: string;
  lastSignInAt?: string | null;
  isActive: boolean;
};

type UserForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: AdminPermission[];
  isActive: boolean;
};

type AdminUsersResponse = {
  data?: AdminUser[];
  message?: string;
};

const defaultForm: UserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: ADMIN_ROLE.manage,
  permissions: [ADMIN_PERMISSION_OPTIONS[0].value],
  isActive: true,
};

const TABLE_HEAD = [
  { id: 'user', label: 'ผู้ใช้งาน', width: 320 },
  { id: 'role', label: 'Role', width: 140 },
  { id: 'status', label: 'สถานะการใช้งาน', width: 150 },
  { id: 'createdAt', label: 'สร้างเมื่อ', width: 180 },
  { id: 'lastSignInAt', label: 'เข้าใช้ล่าสุด', width: 180 },
  { id: 'actions', label: '', width: 160, align: 'right' as const },
];

function getRoleColor(role: string) {
  if (role === ADMIN_ROLE.admin) return 'primary';
  if (role === ADMIN_ROLE.manage) return 'info';
  if (role === ADMIN_ROLE.reviewer) return 'secondary';
  return 'default';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminUsersClient() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [form, setForm] = useState<UserForm>(defaultForm);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['admin-users', accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<AdminUsersResponse>('/api/admin/users', {
        accessToken,
      }),
    select: (result) => result.data ?? [],
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const paginatedUsers = useMemo(
    () => users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, users]
  );

  useEffect(() => {
    if (
      usersQuery.error &&
      usersQuery.error instanceof AdminApiError &&
      usersQuery.error.status === 401
    ) {
      checkUserSession?.();
    }
  }, [checkUserSession, usersQuery.error]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(users.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, rowsPerPage, users.length]);

  const updateForm = (field: keyof UserForm, value: string | boolean | AdminPermission[]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const createUserMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<{ message?: string }>('/api/admin/users', {
        method: 'POST',
        accessToken,
        body: {
          ...form,
        },
      }),
    onSuccess: async () => {
      setMessage('สร้างผู้ใช้แล้ว');
      setForm(defaultForm);
      setIsCreateDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'สร้างผู้ใช้ไม่สำเร็จ');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<{ message?: string }>('/api/admin/users', {
        method: 'PATCH',
        accessToken,
        body: {
          id: selectedUser?.id,
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          isActive: form.isActive,
        },
      }),
    onSuccess: async () => {
      setMessage('บันทึกข้อมูลผู้ใช้แล้ว');
      setForm(defaultForm);
      setSelectedUser(null);
      setIsCreateDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกผู้ใช้ไม่สำเร็จ');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (targetUser: AdminUser) =>
      adminApiRequest<{ message?: string }>('/api/admin/users', {
        method: 'DELETE',
        accessToken,
        body: {
          id: targetUser.id,
        },
      }),
    onSuccess: async () => {
      setMessage('ลบผู้ใช้แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'ลบผู้ใช้ไม่สำเร็จ');
    },
  });

  const openCreateDrawer = () => {
    setSelectedUser(null);
    setForm(defaultForm);
    setIsCreateDrawerOpen(true);
  };

  const openEditDrawer = (targetUser: AdminUser) => {
    setSelectedUser(targetUser);
    setForm({
      email: targetUser.email,
      password: '',
      firstName: targetUser.firstName ?? '',
      lastName: targetUser.lastName ?? '',
      role: targetUser.role,
      permissions: targetUser.permissions,
      isActive: targetUser.isActive,
    });
    setIsCreateDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsCreateDrawerOpen(false);
    setSelectedUser(null);
    setForm(defaultForm);
  };

  const saveUser = async () => {
    setError('');
    setMessage('');

    if (selectedUser) {
      await updateUserMutation.mutateAsync().catch(() => undefined);
      return;
    }

    await createUserMutation.mutateAsync().catch(() => undefined);
  };

  const deleteUser = async (targetUser: AdminUser) => {
    const label = targetUser.displayName || targetUser.email;

    if (!window.confirm(`ต้องการลบผู้ใช้ ${label} หรือไม่?`)) {
      return;
    }

    setError('');
    setMessage('');
    await deleteUserMutation.mutateAsync(targetUser).catch(() => undefined);
  };

  const isEditingCurrentUser =
    Boolean(selectedUser) && (selectedUser?.id === user?.id || selectedUser?.id === user?.sub);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              จัดการผู้ใช้งาน
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการรายชื่อและข้อมูลส่วนตัวของผู้ใช้งาน
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={openCreateDrawer}
            sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
          >
            สร้างผู้ใช้ใหม่
          </Button>
        </Stack>

        {(error || usersQuery.error) && (
          <Alert severity="error">
            {error ||
              (usersQuery.error instanceof Error
                ? usersQuery.error.message
                : 'โหลดผู้ใช้ไม่สำเร็จ')}
          </Alert>
        )}
        {message && <Alert severity="success">{message}</Alert>}
        {usersQuery.isLoading && <Alert severity="info">กำลังโหลดผู้ใช้...</Alert>}

        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 2.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                รายชื่อผู้ใช้งาน
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                ทั้งหมด {users.length.toLocaleString('th-TH')} ผู้ใช้
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={`Admin ${users.filter((item) => item.role === ADMIN_ROLE.admin).length}`}
                color="primary"
                variant="soft"
              />
              <Chip
                size="small"
                label={`Manage ${users.filter((item) => item.role !== ADMIN_ROLE.admin).length}`}
                variant="soft"
              />
              <Chip
                size="small"
                label={`ใช้งาน ${users.filter((item) => item.isActive !== false).length}`}
                color="success"
                variant="soft"
              />
              <Chip
                size="small"
                label={`ปิดใช้งาน ${users.filter((item) => item.isActive === false).length}`}
                color="default"
                variant="soft"
              />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedUsers.map((adminUser) => (
                  <TableRow key={adminUser.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 800 }}>
                          {adminUser.displayName || adminUser.email}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {adminUser.email}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={adminUser.role || '-'}
                        color={getRoleColor(adminUser.role)}
                        variant="soft"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={adminUser.isActive === false ? 'ปิดใช้งาน' : 'ใช้งาน'}
                        color={adminUser.isActive === false ? 'default' : 'success'}
                        variant="soft"
                      />
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(adminUser.createdAt)}
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(adminUser.lastSignInAt)}
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditDrawer(adminUser)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={
                            deleteUserMutation.isPending ||
                            adminUser.id === user?.id ||
                            adminUser.id === user?.sub
                          }
                          onClick={() => deleteUser(adminUser)}
                        >
                          ลบ
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                <TableNoData notFound={!users.length && !usersQuery.isLoading} />
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={users.length}
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
        open={isCreateDrawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: { width: { xs: 1, sm: 460 } },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
            <Box>
              <Typography variant="h6">
                {selectedUser ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้ใหม่'}
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                {selectedUser
                  ? 'แก้ไขข้อมูลส่วนตัวหรือเปลี่ยนรหัสผ่าน'
                  : 'เพิ่มข้อมูลส่วนตัวสำหรับผู้ใช้งานใหม่'}
              </Typography>
            </Box>

            <Button color="inherit" onClick={closeDrawer}>
              ปิด
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
            <TextField
              fullWidth
              label="Email"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
            />

            <TextField
              fullWidth
              label={selectedUser ? 'Password ใหม่' : 'Password'}
              type="password"
              value={form.password}
              helperText={selectedUser ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน' : undefined}
              onChange={(event) => updateForm('password', event.target.value)}
            />

            <TextField
              fullWidth
              label="ชื่อ"
              value={form.firstName}
              onChange={(event) => updateForm('firstName', event.target.value)}
            />

            <TextField
              fullWidth
              label="นามสกุล"
              value={form.lastName}
              onChange={(event) => updateForm('lastName', event.target.value)}
            />

            {!selectedUser && (
              <TextField
                select
                fullWidth
                label="Role"
                value={form.role}
                helperText="สิทธิ์เมนูหลังสร้างผู้ใช้จัดการได้ที่หน้า จัดการสิทธิ์"
                onChange={(event) => updateForm('role', event.target.value)}
              >
                <MenuItem value={ADMIN_ROLE.admin}>admin</MenuItem>
                <MenuItem value={ADMIN_ROLE.manage}>manage</MenuItem>
              </TextField>
            )}

            <TextField
              select
              fullWidth
              label="สถานะการใช้งาน"
              value={form.isActive ? 'active' : 'inactive'}
              helperText={isEditingCurrentUser ? 'ไม่สามารถปิดใช้งานบัญชีของตัวเองได้' : undefined}
              disabled={isEditingCurrentUser}
              onChange={(event) => updateForm('isActive', event.target.value === 'active')}
            >
              <MenuItem value="active">ใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </TextField>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ p: 3 }}>
            <Button color="inherit" onClick={closeDrawer}>
              ยกเลิก
            </Button>
            <LoadingButton
              variant="contained"
              loading={createUserMutation.isPending || updateUserMutation.isPending}
              onClick={saveUser}
            >
              {selectedUser ? 'บันทึก' : 'สร้างผู้ใช้'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Drawer>
    </DashboardContent>
  );
}

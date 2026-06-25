'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';
import {
  ADMIN_ROLE,
  type AdminPermission,
  ALL_ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_OPTIONS,
} from 'src/auth/admin-permissions';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  permissions: AdminPermission[];
  displayName?: string;
};

type AdminUsersResponse = {
  data?: AdminUser[];
  message?: string;
};

const TABLE_HEAD = [
  { id: 'user', label: 'ผู้ใช้งาน', width: 260 },
  { id: 'role', label: 'Role', width: 120 },
  { id: 'permissions', label: 'เมนูที่อนุญาต', width: 560 },
  { id: 'actions', label: '', width: 120, align: 'right' as const },
];

function getRolePermissions(role: string, permissions: AdminPermission[]) {
  if (role === ADMIN_ROLE.admin) {
    return ALL_ADMIN_PERMISSIONS;
  }

  return normalizePermissions(permissions);
}

function normalizePermissions(permissions: unknown): AdminPermission[] {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter((permission): permission is AdminPermission =>
    ALL_ADMIN_PERMISSIONS.includes(permission)
  );
}

function getRoleColor(role: string) {
  if (role === ADMIN_ROLE.admin) return 'primary';
  if (role === ADMIN_ROLE.manage) return 'info';
  if (role === ADMIN_ROLE.reviewer) return 'secondary';
  return 'default';
}

function getPermissionLabel(permission: AdminPermission) {
  return ADMIN_PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ?? permission;
}

function getUsersFromResponse(result: AdminUsersResponse | AdminUser[]) {
  return Array.isArray(result) ? result : (result.data ?? []);
}

export function AdminUserPermissionsClient() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const usersQueryKey = useMemo(() => ['admin-user-permissions', accessToken], [accessToken]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<AdminUsersResponse>('/api/admin/users', {
        accessToken,
      }),
    select: (result) =>
      getUsersFromResponse(result).map((item) => ({
        ...item,
        permissions: normalizePermissions(item.permissions),
      })),
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

  const updateUserMutation = useMutation({
    mutationFn: (targetUser: AdminUser) =>
      adminApiRequest<{ message?: string }>('/api/admin/users', {
        method: 'PATCH',
        accessToken,
        body: {
          id: targetUser.id,
          permissions: getRolePermissions(targetUser.role, targetUser.permissions),
        },
      }),
    onSuccess: async () => {
      setMessage('บันทึกสิทธิ์ผู้ใช้แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกสิทธิ์ไม่สำเร็จ');
    },
  });

  const updateUserAccess = async (targetUser: AdminUser) => {
    setError('');
    setMessage('');
    await updateUserMutation.mutateAsync(targetUser).catch(() => undefined);
  };

  const updateLocalUser = (targetUser: AdminUser, changes: Partial<AdminUser>) => {
    queryClient.setQueryData<AdminUsersResponse | AdminUser[]>(usersQueryKey, (current) => {
      const currentResponse = Array.isArray(current) ? { data: current } : (current ?? { data: [] });
      const currentItems = getUsersFromResponse(currentResponse);

      return {
        ...currentResponse,
        data: currentItems.map((item) =>
          item.id === targetUser.id
            ? {
                ...item,
                ...changes,
                ...(changes.role === ADMIN_ROLE.admin ? { permissions: ALL_ADMIN_PERMISSIONS } : {}),
              }
            : item
        ),
      };
    });
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            จัดการสิทธิ์ผู้ใช้งาน
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
            กำหนดเมนูที่ผู้ใช้งานเข้าใช้งานได้
          </Typography>
        </Box>

        <Alert severity="info">
          Role admin จะได้ทุกเมนูอัตโนมัติ ส่วน role manage สามารถเลือกเมนูที่อนุญาตได้ทีละรายการ
        </Alert>

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
                สิทธิ์การเข้าใช้งาน
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
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 1180 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedUsers.map((adminUser) => {
                  const isAdminRole = adminUser.role === ADMIN_ROLE.admin;
                  const selectedPermissions = getRolePermissions(
                    adminUser.role,
                    normalizePermissions(adminUser.permissions)
                  );
                  const isSavingThisUser =
                    updateUserMutation.isPending &&
                    updateUserMutation.variables?.id === adminUser.id;

                  return (
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
                        <Stack spacing={1.5}>
                          <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            {selectedPermissions.map((permission) => (
                              <Chip
                                key={permission}
                                size="small"
                                label={getPermissionLabel(permission)}
                                variant="soft"
                              />
                            ))}
                            {!selectedPermissions.length && (
                              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                                ยังไม่ได้เลือกเมนู
                              </Typography>
                            )}
                          </Stack>

                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={isAdminRole}
                              onClick={() =>
                                updateLocalUser(adminUser, { permissions: ALL_ADMIN_PERMISSIONS })
                              }
                            >
                              เลือกทั้งหมด
                            </Button>
                            <Button
                              size="small"
                              color="inherit"
                              variant="outlined"
                              disabled={isAdminRole}
                              onClick={() => updateLocalUser(adminUser, { permissions: [] })}
                            >
                              ล้าง
                            </Button>
                          </Stack>

                          <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            {ADMIN_PERMISSION_OPTIONS.map((option) => (
                              <FormControlLabel
                                key={option.value}
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={selectedPermissions.includes(option.value)}
                                    disabled={isAdminRole}
                                    onChange={(event) => {
                                      const permissions = event.target.checked
                                        ? [...selectedPermissions, option.value]
                                        : selectedPermissions.filter(
                                            (permission) => permission !== option.value
                                          );

                                      updateLocalUser(adminUser, {
                                        permissions: Array.from(new Set(permissions)),
                                      });
                                    }}
                                  />
                                }
                                label={option.label}
                                sx={{
                                  m: 0,
                                  minWidth: 148,
                                  '& .MuiFormControlLabel-label': {
                                    fontSize: 13,
                                    whiteSpace: 'nowrap',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <LoadingButton
                          size="small"
                          variant="contained"
                          loading={isSavingThisUser}
                          onClick={() => updateUserAccess(adminUser)}
                        >
                          บันทึก
                        </LoadingButton>
                      </TableCell>
                    </TableRow>
                  );
                })}

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
    </DashboardContent>
  );
}

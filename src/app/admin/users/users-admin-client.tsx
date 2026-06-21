'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';

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
  createdAt?: string;
  lastSignInAt?: string | null;
};

type CreateUserForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: AdminPermission[];
};

const defaultForm: CreateUserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: ADMIN_ROLE.manage,
  permissions: [ADMIN_PERMISSION_OPTIONS[0].value],
};

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getRolePermissions(role: string, permissions: AdminPermission[]) {
  return role === ADMIN_ROLE.admin ? ALL_ADMIN_PERMISSIONS : permissions;
}

export function AdminUsersClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState<CreateUserForm>(defaultForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        data?: AdminUser[];
        message?: string;
      };

      if (!response.ok) {
        if (response.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(result.message || 'โหลดผู้ใช้ไม่สำเร็จ');
      }

      setUsers(result.data ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดผู้ใช้ไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateForm = (field: keyof CreateUserForm, value: string | AdminPermission[]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'role' && value === ADMIN_ROLE.admin
        ? { permissions: ALL_ADMIN_PERMISSIONS }
        : {}),
    }));
  };

  const createUser = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...form,
          permissions: getRolePermissions(form.role, form.permissions),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'สร้างผู้ใช้ไม่สำเร็จ');
      }

      setMessage('สร้างผู้ใช้ admin แล้ว');
      setForm(defaultForm);
      setIsCreateDrawerOpen(false);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'สร้างผู้ใช้ไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const updateUserAccess = async (targetUser: AdminUser) => {
    setSavingUserId(targetUser.id);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: targetUser.id,
          role: targetUser.role,
          permissions: getRolePermissions(targetUser.role, targetUser.permissions),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'บันทึกสิทธิ์ไม่สำเร็จ');
      }

      setMessage('บันทึกสิทธิ์ผู้ใช้แล้ว');
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกสิทธิ์ไม่สำเร็จ');
    } finally {
      setSavingUserId('');
    }
  };

  const updateLocalUser = (targetUser: AdminUser, changes: Partial<AdminUser>) => {
    setUsers((current) =>
      current.map((item) =>
        item.id === targetUser.id
          ? {
              ...item,
              ...changes,
              ...(changes.role === ADMIN_ROLE.admin ? { permissions: ALL_ADMIN_PERMISSIONS } : {}),
            }
          : item
      )
    );
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Admin Users
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              สร้างผู้ใช้ role manage และกำหนดเมนูที่เข้าใช้งานได้
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={() => setIsCreateDrawerOpen(true)}
            sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
          >
            สร้างผู้ใช้ใหม่
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดผู้ใช้...</Alert>}

        <Stack spacing={2}>
          {users.map((adminUser) => (
            <Card key={adminUser.id} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>
                      {adminUser.displayName || adminUser.email}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {adminUser.email} · สร้างเมื่อ {formatDate(adminUser.createdAt)} · เข้าใช้ล่าสุด{' '}
                      {formatDate(adminUser.lastSignInAt)}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    disabled={savingUserId === adminUser.id}
                    onClick={() => updateUserAccess(adminUser)}
                  >
                    บันทึกสิทธิ์
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Role"
                    value={adminUser.role}
                    onChange={(event) =>
                      updateLocalUser(adminUser, { role: event.target.value as string })
                    }
                    sx={{ maxWidth: { md: 240 } }}
                  >
                    <MenuItem value={ADMIN_ROLE.admin}>admin</MenuItem>
                    <MenuItem value={ADMIN_ROLE.manage}>manage</MenuItem>
                  </TextField>

                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ mb: 1, color: 'text.secondary', fontSize: 13 }}>
                      เมนูที่อนุญาต
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {ADMIN_PERMISSION_OPTIONS.map((option) => (
                        <FormControlLabel
                          key={option.value}
                          control={
                            <Checkbox
                              checked={adminUser.permissions.includes(option.value)}
                              disabled={adminUser.role === ADMIN_ROLE.admin}
                              onChange={(event) => {
                                const permissions = event.target.checked
                                  ? [...adminUser.permissions, option.value]
                                  : adminUser.permissions.filter(
                                      (permission) => permission !== option.value
                                    );

                                updateLocalUser(adminUser, { permissions });
                              }}
                            />
                          }
                          label={option.label}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>

      <Drawer
        anchor="right"
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: 1, sm: 460 } },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
            <Box>
              <Typography variant="h6">สร้างผู้ใช้ใหม่</Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                กำหนด role และเมนูที่อนุญาตให้เข้าใช้งาน
              </Typography>
            </Box>

            <Button color="inherit" onClick={() => setIsCreateDrawerOpen(false)}>
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
              label="Password"
              type="password"
              value={form.password}
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

            <TextField
              select
              fullWidth
              label="Role"
              value={form.role}
              onChange={(event) => updateForm('role', event.target.value)}
            >
              <MenuItem value={ADMIN_ROLE.admin}>admin</MenuItem>
              <MenuItem value={ADMIN_ROLE.manage}>manage</MenuItem>
            </TextField>

            <FormControl fullWidth disabled={form.role === ADMIN_ROLE.admin}>
              <InputLabel>เมนูที่อนุญาต</InputLabel>
              <Select
                multiple
                value={form.permissions}
                input={<OutlinedInput label="เมนูที่อนุญาต" />}
                renderValue={(selected) =>
                  selected
                    .map(
                      (permission) =>
                        ADMIN_PERMISSION_OPTIONS.find((option) => option.value === permission)
                          ?.label ?? permission
                    )
                    .join(', ')
                }
                onChange={(event) =>
                  updateForm('permissions', event.target.value as AdminPermission[])
                }
              >
                {ADMIN_PERMISSION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={form.permissions.includes(option.value)} />
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ p: 3 }}>
            <Button color="inherit" onClick={() => setIsCreateDrawerOpen(false)}>
              ยกเลิก
            </Button>
            <LoadingButton variant="contained" loading={isSaving} onClick={createUser}>
              สร้างผู้ใช้
            </LoadingButton>
          </Stack>
        </Stack>
      </Drawer>
    </DashboardContent>
  );
}

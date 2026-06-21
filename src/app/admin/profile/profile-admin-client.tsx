'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { supabase } from 'src/lib/supabase';
import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

function splitDisplayName(displayName = '') {
  const [firstName = '', ...lastNameParts] = displayName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(' '),
  };
}

export function ProfileAdminClient() {
  const { user, checkUserSession } = useAuthContext();
  const fallbackName = splitDisplayName(user?.displayName);
  const [firstName, setFirstName] = useState(user?.firstName ?? fallbackName.firstName);
  const [lastName, setLastName] = useState(user?.lastName ?? fallbackName.lastName);
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      formData.set('firstName', firstName.trim());
      formData.set('lastName', lastName.trim());
      formData.set('photoUrl', photoUrl.trim());

      await adminApiRequest<{ message?: string }>('/api/admin/profile', {
        method: 'PUT',
        accessToken,
        body: formData,
      });

      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
          photo_url: photoUrl.trim() || null,
        },
      });
    },
    onSuccess: async () => {
      setMessage('บันทึกโปรไฟล์แล้ว');
      await checkUserSession?.();
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    },
  });

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    setError('');
    setMessage('');

    await saveProfileMutation.mutateAsync().catch(() => undefined);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            Profile
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
            จัดการข้อมูลส่วนตัวที่ใช้แสดงในระบบ admin
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              <Avatar src={photoUrl} alt={user?.displayName} sx={{ width: 112, height: 112 }}>
                {firstName.charAt(0).toUpperCase()}
              </Avatar>

              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>รูปภาพโปรไฟล์</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  วางลิงก์รูปภาพที่เปิดดูได้ เช่น URL จาก CDN หรือ Supabase Storage
                </Typography>
              </Stack>
            </Stack>

            <TextField
              fullWidth
              label="ลิงก์รูปภาพโปรไฟล์"
              value={photoUrl}
              placeholder="https://example.com/avatar.jpg"
              onChange={(event) => setPhotoUrl(event.target.value)}
              helperText="ปล่อยว่างได้ ถ้าไม่ต้องการแสดงรูป"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="ชื่อ"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <TextField
                fullWidth
                label="นามสกุล"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </Stack>

            <TextField fullWidth disabled label="Email" value={user?.email ?? ''} />

            <LoadingButton
              variant="contained"
              loading={saveProfileMutation.isPending}
              onClick={saveProfile}
              sx={{ alignSelf: 'flex-end' }}
            >
              บันทึกโปรไฟล์
            </LoadingButton>
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

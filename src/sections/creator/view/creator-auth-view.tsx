'use client';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword } from 'src/auth/context/supabase';
import { getRoleHomePath } from 'src/auth/utils/role-redirect';

import { registerCreator } from '../creator-api';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

type Props = {
  mode: 'sign-in' | 'register';
};

const initialForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  password: '',
  bio: '',
  phone: '',
};

export function CreatorAuthView({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';
  const returnTo = searchParams.get('returnTo') ?? '';
  const safeReturnTo = returnTo.startsWith('/creator/') ? returnTo : '';
  const authSwitchHref = `${isRegister ? '/creator/sign-in' : '/creator/register'}${
    safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''
  }`;

  const updateForm = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerCreator(form);
        setMessage('ส่งคำขอลงทะเบียนแล้ว ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี');
        setForm(initialForm);
        return;
      }

      const signInResult = await signInWithPassword({ email: form.email, password: form.password });

      await checkUserSession?.();
      router.replace(safeReturnTo || getRoleHomePath(signInResult.data.user));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ทำรายการไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 12, md: 14 },
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
      <Stack
        spacing={3}
        sx={{
          mx: 'auto',
          p: { xs: 3, sm: 4 },
          maxWidth: 560,
          zIndex: 1,
          color: creatorTone.deep,
          position: 'relative',
          borderRadius: 2,
          backdropFilter: 'blur(3px)',
          bgcolor: 'rgba(248,246,238,0.9)',
          boxShadow: '0 24px 80px rgba(32,42,43,0.24)',
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            {isRegister ? 'สมัครเป็น Creator' : 'Creator Login'}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {isRegister
              ? 'ลงทะเบียนเพื่อเขียนและส่งบทความวัฒนธรรมให้ทีมงานตรวจสอบ'
              : 'เข้าสู่ระบบเพื่อจัดการโปรไฟล์และบทความของคุณ'}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Stack spacing={2.5}>
          {isRegister && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
              </Stack>
              <TextField
                label="ชื่อที่แสดง"
                value={form.displayName}
                onChange={(event) => updateForm('displayName', event.target.value)}
              />
              <TextField
                label="เบอร์โทร"
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
              />
              <TextField
                multiline
                minRows={3}
                label="แนะนำตัว"
                value={form.bio}
                onChange={(event) => updateForm('bio', event.target.value)}
              />
            </>
          )}

          <TextField
            label="Email"
            value={form.email}
            onChange={(event) => updateForm('email', event.target.value)}
          />
          <TextField
            label="Password"
            type={showPassword.value ? 'text' : 'password'}
            value={form.password}
            onChange={(event) => updateForm('password', event.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={showPassword.onToggle} edge="end">
                      <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button size="large" variant="contained" loading={isSubmitting} onClick={submit}>
            {isRegister ? 'ส่งคำขอลงทะเบียน' : 'เข้าสู่ระบบ'}
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isRegister ? 'มีบัญชีแล้ว? ' : 'ยังไม่มีบัญชี? '}
          <Link component={RouterLink} href={authSwitchHref}>
            {isRegister ? 'เข้าสู่ระบบ' : 'สมัครเป็น Creator'}
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}

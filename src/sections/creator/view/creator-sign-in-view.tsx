'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { getRoleHomePath } from 'src/auth/utils/role-redirect';
import { CREATOR_AUTH_TOKEN_KEY } from 'src/auth/context/supabase/auth-provider';

import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const SignInSchema = z.object({
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { error: 'กรุณากรอกรหัสผ่าน' })
    .min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
});

type CreatorSignInFormValues = z.infer<typeof SignInSchema>;

const initialSignInForm: CreatorSignInFormValues = {
  email: '',
  password: '',
};

export function CreatorSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [error, setError] = useState('');

  const methods = useForm<CreatorSignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: initialSignInForm,
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;
  const redirectMessage = searchParams.get('message') ?? '';
  const returnTo = searchParams.get('returnTo') ?? '';
  const safeReturnTo = returnTo.startsWith('/creator/') ? returnTo : '';
  const registerHref = `/creator/register${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''}`;

  const onSubmit = handleSubmit(async (data) => {
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });
      const signInResult = (await response.json().catch(() => ({}))) as {
        token?: string;
        message?: string;
        user?: {
          role?: string | null;
        };
      };

      if (!response.ok || !signInResult.token || signInResult.user?.role !== 'creator') {
        throw new Error(signInResult.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
      }

      sessionStorage.setItem(CREATOR_AUTH_TOKEN_KEY, signInResult.token);
      await checkUserSession?.();
      router.replace(safeReturnTo || getRoleHomePath({ role: 'creator' }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ทำรายการไม่สำเร็จ');
    }
  });

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 12, md: 20 },
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
            Creator Login
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            เข้าสู่ระบบเพื่อจัดการโปรไฟล์และบทความของคุณ
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {redirectMessage && <Alert severity="success">{redirectMessage}</Alert>}

        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <Field.Text name="email" label="Email" />
            <Field.Text
              name="password"
              label="Password"
              type={showPassword.value ? 'text' : 'password'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={showPassword.onToggle} edge="end">
                        <Iconify
                          icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                        />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button size="large" type="submit" variant="contained" loading={isSubmitting}>
              เข้าสู่ระบบ
            </Button>
          </Stack>
        </Form>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          ยังไม่มีบัญชี?{' '}
          <Link component={RouterLink} href={registerHref}>
            สมัครเป็น Creator
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}

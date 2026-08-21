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

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { getRoleHomePath } from 'src/auth/utils/role-redirect';
import { CREATOR_AUTH_TOKEN_KEY } from 'src/auth/context/supabase/auth-provider';

import { GoogleIdentityButton } from '../components/google-identity-button';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const SignInSchema = z.object({
  email: z.string().min(1, { error: 'กรุณากรอกอีเมล' }).email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z
    .string()
    .min(1, { error: 'กรุณากรอกรหัสผ่าน' })
    .min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
  acceptTerms: z.boolean().refine((value) => value, {
    error: 'กรุณายอมรับเงื่อนไขการใช้งานก่อนเข้าสู่ระบบ',
  }),
});

type CreatorSignInFormValues = z.infer<typeof SignInSchema>;

const initialSignInForm: CreatorSignInFormValues = {
  email: '',
  password: '',
  acceptTerms: false,
};

export function CreatorSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const methods = useForm<CreatorSignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: initialSignInForm,
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;
  const acceptTerms = watch('acceptTerms');
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

  const handleGoogleCredential = async (credential: string) => {
    if (!acceptTerms) {
      setError('กรุณายอมรับเงื่อนไขการใช้บริการก่อนดำเนินการด้วย Google');
      return;
    }

    setError('');
    setIsGoogleLoading(true);

    const { data: sessionData, error: oauthError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    });

    if (oauthError || !sessionData.session?.access_token) {
      setError('ไม่สามารถยืนยันตัวตนด้วย Google ได้ กรุณาลองใหม่');
      setIsGoogleLoading(false);
      return;
    }

    const response = await fetch('/api/creator/google-auth', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    const result = (await response.json().catch(() => ({}))) as {
      token?: string | null;
      message?: string;
      data?: { status?: string };
    };

    await supabase.auth.signOut({ scope: 'local' });

    if (!response.ok) {
      setError(result.message ?? 'ดำเนินการด้วย Google ไม่สำเร็จ');
      setIsGoogleLoading(false);
      return;
    }

    if (!result.token || result.data?.status !== 'approved') {
      router.replace(
        '/creator/sign-in?message=ส่งคำขอสมัครด้วย Google แล้ว กรุณารอผู้ดูแลตรวจสอบและอนุมัติบัญชี'
      );
      router.refresh();
      setIsGoogleLoading(false);
      return;
    }

    sessionStorage.setItem(CREATOR_AUTH_TOKEN_KEY, result.token);
    await checkUserSession?.();
    router.replace(safeReturnTo || getRoleHomePath({ role: 'creator' }));
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        pt: {
          xs: 'calc(var(--layout-header-mobile-height) + 32px)',
          md: 'calc(var(--layout-header-desktop-height) + 56px)',
        },
        pb: { xs: 5, md: 8 },
        minHeight: '100vh',
        display: 'grid',
        alignItems: 'center',
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
          p: { xs: 2.5, sm: 4.5 },
          width: 1,
          maxWidth: { xs: 400, md: 480 },
          zIndex: 1,
          color: creatorTone.deep,
          position: 'relative',
          border: '1px solid rgba(248,246,238,0.52)',
          borderRadius: { xs: 2.5, sm: 3.5 },
          backdropFilter: 'blur(14px)',
          bgcolor: 'rgba(248,246,238,0.94)',
          boxShadow: '0 28px 90px rgba(32,42,43,0.28)',
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900 }}>
            CREATOR CENTER
          </Typography>
          <Typography
            variant="h4"
            sx={{ mt: 0.5, fontSize: { xs: 30, sm: 40 }, lineHeight: 1.18, fontWeight: 950 }}
          >
            เข้าสู่ระบบสำหรับผู้ร่วมสร้างข้อมูล
          </Typography>
          <Typography sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.7 }}>
            เข้าสู่ระบบเพื่อจัดการโปรไฟล์และบทความของคุณ
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {redirectMessage && <Alert severity="success">{redirectMessage}</Alert>}

        <Form methods={methods} onSubmit={onSubmit}>
          <Stack
            spacing={2.5}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.6)' } }}
          >
            <Field.Text name="email" label="อีเมล" />
            <Field.Text
              name="password"
              label="รหัสผ่าน"
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

            <Field.Checkbox
              name="acceptTerms"
              label={
                <Typography component="span" sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ยอมรับเงื่อนไขการใช้บริการ และรับทราบว่าชื่อที่แสดง
                  รวมถึงรูปโปรไฟล์ของฉันอาจถูกนำไปแสดงบนเว็บไซต์ในบทความหรือพื้นที่ Creator{' '}
                  <Link
                    component={RouterLink}
                    href="/terms-and-conditions"
                    target="_blank"
                    onClick={(event) => event.stopPropagation()}
                  >
                    เงื่อนไขการใช้บริการ
                  </Link>{' '}
                  และ{' '}
                  <Link
                    component={RouterLink}
                    href="/privacy-policy"
                    target="_blank"
                    onClick={(event) => event.stopPropagation()}
                  >
                    นโยบายความเป็นส่วนตัว
                  </Link>
                </Typography>
              }
              slotProps={{
                wrapper: {
                  sx: {
                    px: 1.2,
                    py: 1,
                    borderRadius: 1.2,
                    bgcolor: 'rgba(111,135,144,0.08)',
                  },
                },
              }}
            />

            <Button
              size="large"
              type="submit"
              variant="contained"
              loading={isSubmitting}
              disabled={!acceptTerms}
              fullWidth
              sx={{ minHeight: 52, fontWeight: 900 }}
            >
              เข้าสู่ระบบ
            </Button>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
              <Typography variant="caption" color="text.secondary">
                หรือ
              </Typography>
              <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
            </Stack>

            <GoogleIdentityButton
              disabled={!acceptTerms || isSubmitting || isGoogleLoading}
              loading={isGoogleLoading}
              onCredential={handleGoogleCredential}
              onConfigError={setError}
            />
          </Stack>
        </Form>

        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          ยังไม่มีบัญชี?{' '}
          <Link component={RouterLink} href={registerHref}>
            สมัครเป็นผู้ร่วมสร้างข้อมูล
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}

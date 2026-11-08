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

import { cultureUi } from 'src/theme/culture-ui';
import { creatorGoogleClient } from 'src/lib/creator-google-auth';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { useAuthContext } from 'src/auth/hooks';
import { CREATOR_AUTH_TOKEN_KEY } from 'src/auth/context/supabase/auth-provider';
import { getRoleHomePath, getSafeRoleRedirectPath } from 'src/auth/utils/role-redirect';

import { GoogleIdentityButton } from '../components/google-identity-button';

const SignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'กรุณากรอกอีเมล' })
    .email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }),
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
  const [notice, setNotice] = useState('');
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
  const returnTo = searchParams.get('returnTo') ?? '';
  const safeReturnTo = returnTo ? getSafeRoleRedirectPath({ role: 'creator' }, returnTo) : '';
  const registerHref = `/creator/register${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''}`;

  const onSubmit = handleSubmit(async (data) => {
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          acceptTerms: data.acceptTerms,
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
    setNotice('');
    setIsGoogleLoading(true);

    try {
      const { data: sessionData, error: oauthError } =
        await creatorGoogleClient.auth.signInWithIdToken({
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
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent: 'sign-in', acceptTerms }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        token?: string | null;
        message?: string;
        outcome?: 'signed_in' | 'pending' | 'registration_submitted';
        data?: { status?: string };
      };

      if (!response.ok) {
        setError(result.message ?? 'ดำเนินการด้วย Google ไม่สำเร็จ');
        setIsGoogleLoading(false);
        return;
      }

      if (result.data?.status === 'pending') {
        setNotice('พบบัญชีของคุณแล้ว ขณะนี้อยู่ระหว่างรอทีมงานตรวจสอบและอนุมัติ ไม่ต้องสมัครซ้ำ');
        return;
      }
      if (!result.token || result.data?.status !== 'approved') {
        throw new Error('ไม่สามารถเปิด session ได้ กรุณาลองใหม่หรือติดต่อทีมงาน');
      }

      sessionStorage.setItem(CREATOR_AUTH_TOKEN_KEY, result.token);
      await checkUserSession?.();
      router.replace(safeReturnTo || getRoleHomePath({ role: 'creator' }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่'
      );
    } finally {
      setIsGoogleLoading(false);
      await creatorGoogleClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        width: 1,
        maxWidth: 1408,
        mx: 'auto',
        px: HOME_SECTION_PX,
        pt: { xs: 4, md: 6 },
        pb: { xs: 5, md: 7 },
        bgcolor: cultureUi.background,
        color: cultureUi.text,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
          gap: { xs: 4, md: 7 },
          alignItems: 'start',
        }}
      >
        <Box component="header" sx={{ pt: { md: 2 } }}>
          <Typography sx={{ color: cultureUi.muted, fontSize: 12, mb: 1 }}>
            ชุมชน Creator
          </Typography>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: 32, md: 42 }, fontWeight: 600, lineHeight: 1.4 }}
          >
            กลับมาเล่าเรื่อง
            <br />
            วัฒนธรรมไปด้วยกัน
          </Typography>
          <Typography sx={{ mt: 2, color: cultureUi.muted, fontSize: 15, lineHeight: 1.85 }}>
            เข้าสู่ระบบเพื่อเขียนบทความ จัดการโปรไฟล์ และติดตามเรื่องราวที่คุณแบ่งปัน
          </Typography>
          <Typography
            sx={{
              mt: 3,
              pt: 2,
              borderTop: `1px solid ${cultureUi.border}`,
              color: cultureUi.muted,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            เพิ่งสมัครใช่ไหม? บัญชีจะเริ่มใช้งานได้หลังทีมงานตรวจสอบและอนุมัติ
          </Typography>
        </Box>
        <Stack
          spacing={2.5}
          sx={{
            mx: 'auto',
            p: { xs: 2.5, md: 3.5 },
            width: 1,
            maxWidth: 460,
            minWidth: 0,
            zIndex: 1,
            color: cultureUi.text,
            position: 'relative',
            border: '1px solid #dfe3df',
            borderRadius: 2.5,
            bgcolor: '#fff',
            boxShadow: 'none',
            '& .MuiFormLabel-asterisk': { color: 'error.main' },
          }}
        >
          <Logo
            href="/"
            aria-label="Thailand Cultural Hub — กลับหน้าแรก"
            sx={{
              width: { xs: 160, sm: 184 },
              height: 'auto',
              aspectRatio: '2941 / 1169',
              mx: 'auto',
              '& img': { display: 'block', objectFit: 'contain' },
            }}
          />
          <Box>
            <Typography
              component="h2"
              textAlign="center"
              sx={{ fontSize: 24, fontWeight: 600, lineHeight: 1.4 }}
            >
              เข้าสู่ระบบ Creator
            </Typography>
            <Typography textAlign="center" sx={{ mt: 0.75, fontSize: 13, color: cultureUi.muted }}>
              กรอกอีเมลและรหัสผ่านของคุณ
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="info">{notice}</Alert>}

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack
              spacing={2.5}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.6)' } }}
            >
              <Field.Text
                name="email"
                label="อีเมล"
                size="small"
                required
                autoComplete="username"
              />
              <Field.Text
                name="password"
                label="รหัสผ่าน"
                size="small"
                required
                autoComplete="current-password"
                type={showPassword.value ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={showPassword.onToggle}
                          edge="end"
                          aria-label={showPassword.value ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        >
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
                    <Box component="span" sx={{ color: 'error.main' }}>
                      *{' '}
                    </Box>
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
                      bgcolor: cultureUi.subtle,
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
                sx={{ minHeight: 44, fontWeight: 600 }}
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
              {!acceptTerms && (
                <Typography
                  sx={{
                    mt: '8px !important',
                    fontSize: 12,
                    color: 'text.secondary',
                    textAlign: 'center',
                  }}
                >
                  เลือกยอมรับเงื่อนไขด้านบน เพื่อเข้าสู่ระบบด้วย Google
                </Typography>
              )}
            </Stack>
          </Form>

          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            ยังไม่มีบัญชี?{' '}
            <Link component={RouterLink} href={registerHref}>
              สมัครเป็น Creator
            </Link>
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

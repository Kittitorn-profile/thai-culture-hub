'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';
import { creatorGoogleClient } from 'src/lib/creator-google-auth';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { GoogleIdentityButton } from 'src/sections/creator/components/google-identity-button';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/supabase';
import { CREATOR_AUTH_TOKEN_KEY } from '../../context/supabase/auth-provider';
import { getAuthRole, getSafeRoleRedirectPath } from '../../utils/role-redirect';

// ----------------------------------------------------------------------

export type SignInSchemaType = z.infer<typeof SignInSchema>;

export const SignInSchema = z.object({
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { error: 'Password is required!' })
    .min(6, { error: 'Password must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

type Props = {
  adminMode?: boolean;
};

export function SupabaseSignInView({ adminMode = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showPassword = useBoolean();

  const { checkUserSession } = useAuthContext();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultValues: SignInSchemaType = {
    email: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      const result = await signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      const role = getAuthRole(result.data.user);
      if (adminMode && !['admin', 'manage', 'manager', 'reviewer'].includes(role)) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล กรุณาเข้าสู่ระบบผ่านหน้า Creator');
      }
      await checkUserSession?.();

      router.replace(getSafeRoleRedirectPath(result.data.user, searchParams.get('returnTo')));
    } catch (error) {
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    }
  });

  const handleGoogleCredential = async (credential: string) => {
    if (!adminMode || googleLoading || isSubmitting) return;
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await creatorGoogleClient.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });
      if (error) throw error;
      if (!data.session) throw new Error('ไม่สามารถยืนยันบัญชี Google ได้ กรุณาลองใหม่');
      const verified = await creatorGoogleClient.auth.getUser(data.session.access_token);
      if (verified.error || !verified.data.user)
        throw new Error('ไม่สามารถยืนยันบัญชี Google ได้ กรุณาลองใหม่');
      const user = verified.data.user;
      if (!['admin', 'manage', 'manager', 'reviewer'].includes(getAuthRole(user))) {
        throw new Error('บัญชี Google นี้ไม่มีสิทธิ์ผู้ดูแล กรุณาเลือกบัญชีที่ได้รับสิทธิ์');
      }
      sessionStorage.removeItem(CREATOR_AUTH_TOKEN_KEY);
      await creatorGoogleClient.auth.signOut({ scope: 'local' });
      const installed = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });
      if (installed.error) throw installed.error;
      await checkUserSession?.();
      router.replace(getSafeRoleRedirectPath(user, searchParams.get('returnTo')));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      await creatorGoogleClient.auth.signOut({ scope: 'local' });
      setGoogleLoading(false);
    }
  };

  const renderForm = () => (
    <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="email"
        label="อีเมล"
        required
        size={adminMode ? 'small' : 'medium'}
        autoComplete="username"
        disabled={isSubmitting || googleLoading}
      />

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Field.Text
          name="password"
          label="รหัสผ่าน"
          required
          size={adminMode ? 'small' : 'medium'}
          autoComplete="current-password"
          disabled={isSubmitting || googleLoading}
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
      </Box>

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        disabled={googleLoading}
        loadingIndicator="กำลังเข้าสู่ระบบ..."
        sx={{ minHeight: 44, borderRadius: 1.5 }}
      >
        เข้าสู่ระบบ
      </Button>
    </Box>
  );

  return (
    <>
      {adminMode ? (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 11, mb: 1, letterSpacing: 1 }}>
            ADMIN PORTAL
          </Typography>
          <Typography component="h1" sx={{ fontSize: 26, fontWeight: 600, lineHeight: 1.4 }}>
            เข้าสู่ระบบผู้ดูแล
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 13, lineHeight: 1.7, color: 'text.secondary' }}>
            จัดการข้อมูลและเนื้อหา Thailand Cultural Hub
          </Typography>
        </Box>
      ) : (
        <FormHead
          title={adminMode ? 'เข้าสู่ระบบผู้ดูแล' : 'ลงชื่อเข้าใช้งาน'}
          description={
            adminMode ? (
              'สำหรับผู้ดูแลและทีมงาน Thailand Cultural Hub'
            ) : (
              <>
                {`Don’t have an account? `}
                <Link component={RouterLink} href={paths.auth.supabase.signUp} variant="subtitle2">
                  Get started
                </Link>
              </>
            )
          }
          sx={{ textAlign: { xs: 'center', md: 'left' } }}
        />
      )}

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {adminMode && (
        <Box sx={{ mb: 3 }}>
          <GoogleIdentityButton
            disabled={isSubmitting}
            loading={googleLoading}
            onCredential={handleGoogleCredential}
            onConfigError={setErrorMessage}
          />
          <Typography sx={{ mt: 1, fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
            ใช้บัญชี Google ที่ได้รับสิทธิ์ผู้ดูแล
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mt: 2.5,
              color: 'text.secondary',
              fontSize: 12,
              '&::before, &::after': {
                content: '""',
                flex: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            หรือใช้อีเมลและรหัสผ่าน
          </Box>
        </Box>
      )}
      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>
    </>
  );
}

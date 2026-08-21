'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';
import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { getRoleHomePath } from 'src/auth/utils/role-redirect';
import { CREATOR_AUTH_TOKEN_KEY } from 'src/auth/context/supabase/auth-provider';

import { registerCreator } from '../creator-api';
import { GoogleIdentityButton } from '../components/google-identity-button';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const registerSteps = ['ข้อมูลส่วนตัว', 'ตั้งค่าบัญชี', 'ส่งคำขอสมัคร'];

const RegisterSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().min(1, { error: 'กรุณากรอกชื่อที่แสดง' }),
    email: z.string().min(1, { error: 'กรุณากรอกอีเมล' }).email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }),
    phone: z.string(),
    provinceCode: z.string().min(1, { error: 'กรุณาเลือกจังหวัดของคุณ' }),
    bio: z.string(),
    authMethod: z.enum(['password', 'google']),
    password: z.string(),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean({ error: 'กรุณายอมรับเงื่อนไขการใช้บริการก่อนส่งคำขอสมัคร' })
      .refine((value) => value === true, {
        error: 'กรุณายอมรับเงื่อนไขการใช้บริการก่อนส่งคำขอสมัคร',
      }),
  })
  .superRefine((data, context) => {
    if (data.authMethod !== 'password') return;
    if (!data.password) {
      context.addIssue({ code: 'custom', path: ['password'], message: 'กรุณากรอกรหัสผ่าน' });
    } else if (data.password.length < 6) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      });
    }
    if (!data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'กรุณายืนยันรหัสผ่าน',
      });
    } else if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
      });
    }
  });

type CreatorRegisterFormValues = z.infer<typeof RegisterSchema>;

type ProvinceOption = {
  code: string;
  name: string;
};

const initialRegisterForm: CreatorRegisterFormValues = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  authMethod: 'password',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  provinceCode: '',
  bio: '',
  phone: '',
};

function getFallbackProvinceOptions() {
  return provinces.map((province) => ({ code: province.code, name: province.name }));
}

function getProvinceOptionsFromGeoJson(data: unknown) {
  const features = (
    data as { features?: Array<{ id?: string | number; properties?: Record<string, unknown> }> }
  )?.features;

  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map((feature) => {
      const provinceCode =
        feature.properties?.shapeISO ??
        feature.properties?.id ??
        feature.properties?.shapeID ??
        feature.id;
      const code =
        typeof provinceCode === 'string' || typeof provinceCode === 'number'
          ? String(provinceCode)
          : '';
      const fallbackProvince = provinces.find((province) => province.code === code);
      const provinceName =
        fallbackProvince?.name ??
        feature.properties?.shapeName ??
        feature.properties?.name ??
        feature.properties?.NAME_1;

      return {
        code,
        name: typeof provinceName === 'string' ? provinceName.trim() : code,
      };
    })
    .filter((province) => province.code && province.name)
    .sort((firstProvince, secondProvince) =>
      firstProvince.name.localeCompare(secondProvince.name, 'th')
    );
}

export function CreatorRegisterView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>(
    getFallbackProvinceOptions
  );
  const [activeRegisterStep, setActiveRegisterStep] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState('');

  const methods = useForm<CreatorRegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: initialRegisterForm,
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    clearErrors,
    reset,
    setValue,
    trigger,
    watch,
    formState: { isSubmitting },
  } = methods;
  const acceptTerms = watch('acceptTerms');
  const authMethod = watch('authMethod');
  const returnTo = searchParams.get('returnTo') ?? '';
  const safeReturnTo = returnTo.startsWith('/creator/') ? returnTo : '';
  const signInHref = `/creator/sign-in${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''}`;

  const goNextRegisterStep = async () => {
    const isValid = await trigger(['displayName', 'provinceCode'], {
      shouldFocus: true,
    });

    if (!isValid) {
      return;
    }

    setError('');
    clearErrors(['email', 'password', 'confirmPassword', 'acceptTerms']);
    setActiveRegisterStep((current) => Math.min(current + 1, registerSteps.length - 1));
  };

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/thailand-provinces', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextOptions = getProvinceOptionsFromGeoJson(data);

        if (nextOptions.length) {
          setProvinceOptions(nextOptions);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    setError('');
    setMessage('');

    try {
      if (data.authMethod === 'google') {
        if (!googleAccessToken) {
          throw new Error('กรุณาเชื่อมต่อบัญชี Google อีกครั้ง');
        }

        const response = await fetch('/api/creator/google-auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: data.displayName,
            phone: data.phone,
            provinceCode: data.provinceCode,
            bio: data.bio,
          }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          token?: string | null;
          message?: string;
          data?: { status?: string };
        };

        await supabase.auth.signOut({ scope: 'local' });

        if (!response.ok) throw new Error(result.message ?? 'สมัครด้วย Google ไม่สำเร็จ');

        if (result.token && result.data?.status === 'approved') {
          sessionStorage.setItem(CREATOR_AUTH_TOKEN_KEY, result.token);
          await checkUserSession?.();
          router.replace(safeReturnTo || getRoleHomePath({ role: 'creator' }));
          return;
        }

        setMessage('ส่งคำขอสมัครด้วย Google แล้ว ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี');
      } else {
        await registerCreator({
          ...data,
          email: data.email.trim().toLowerCase(),
        });
        setMessage('ส่งคำขอลงทะเบียนแล้ว ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี');
      }

      reset(initialRegisterForm);
      setGoogleAccessToken('');
      setActiveRegisterStep(2);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ทำรายการไม่สำเร็จ');
    }
  });

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setMessage('');
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

    const googleUser = sessionData.user;
    const metadata = googleUser.user_metadata ?? {};
    const fullName = String(metadata.full_name ?? metadata.name ?? '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);

    setValue('authMethod', 'google');
    setValue('email', googleUser.email ?? '', { shouldValidate: true });
    setValue('displayName', fullName || googleUser.email?.split('@')[0] || '', {
      shouldValidate: true,
    });
    setValue('firstName', nameParts[0] ?? '');
    setValue('lastName', nameParts.slice(1).join(' '));
    setValue('password', '');
    setValue('confirmPassword', '');
    setGoogleAccessToken(sessionData.session.access_token);
    clearErrors(['email', 'password', 'confirmPassword']);
    setMessage('เชื่อมต่อ Google แล้ว ระบบกรอกชื่อและอีเมลให้เรียบร้อย กรุณาตรวจสอบข้อมูล');
    setIsGoogleLoading(false);
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
          maxWidth: 480,
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
            JOIN CREATOR COMMUNITY
          </Typography>
          <Typography
            variant="h4"
            sx={{ mt: 0.5, fontSize: { xs: 30, sm: 40 }, lineHeight: 1.18, fontWeight: 950 }}
          >
            สมัครเป็น Creator
          </Typography>
          <Typography sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.7 }}>
            ลงทะเบียนเพื่อเขียนและส่งบทความวัฒนธรรมให้ทีมงานตรวจสอบ
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Form methods={methods} onSubmit={onSubmit}>
          <Stack
            spacing={3}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.6)' } }}
          >
            <Stepper
              activeStep={activeRegisterStep}
              alternativeLabel
              sx={{ '& .MuiStepLabel-label': { fontSize: { xs: 11, sm: 13 } } }}
            >
              {registerSteps.map((step) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeRegisterStep === 0 && (
              <Stack spacing={2.5}>
                <GoogleIdentityButton
                  disabled={isSubmitting || isGoogleLoading}
                  loading={isGoogleLoading}
                  onCredential={handleGoogleCredential}
                  onConfigError={setError}
                />
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
                  <Typography variant="caption" color="text.secondary">
                    หรือกรอกข้อมูลด้วยตัวเอง
                  </Typography>
                  <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Field.Text name="firstName" label="ชื่อ" />
                  <Field.Text name="lastName" label="นามสกุล" />
                </Stack>
                <Field.Text name="displayName" label="ชื่อที่แสดง" required />
                <Field.Text name="phone" label="เบอร์โทร" />
                <Field.Text
                  select
                  name="provinceCode"
                  label="จังหวัดของคุณ"
                  helperText="ระบบจะใช้จังหวัดนี้เป็นค่าเริ่มต้นในหน้าข้อมูลวัฒนธรรม"
                >
                  {provinceOptions.map((province) => (
                    <MenuItem key={province.code} value={province.code}>
                      {province.name}
                    </MenuItem>
                  ))}
                </Field.Text>
              </Stack>
            )}

            {activeRegisterStep === 1 && (
              <Stack spacing={2.5}>
                <Field.Text
                  name="email"
                  label="Email สำหรับเข้าสู่ระบบ"
                  required
                  slotProps={{
                    htmlInput: { autoComplete: 'email', readOnly: authMethod === 'google' },
                  }}
                />
                {authMethod !== 'google' && (
                  <>
                    <Field.Text
                      name="password"
                      label="Password"
                      type={showPassword.value ? 'text' : 'password'}
                      slotProps={{
                        htmlInput: { autoComplete: 'new-password' },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={showPassword.onToggle} edge="end">
                                <Iconify
                                  icon={
                                    showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'
                                  }
                                />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Field.Text
                      name="confirmPassword"
                      label="Confirm password"
                      type={showPassword.value ? 'text' : 'password'}
                      slotProps={{
                        htmlInput: { autoComplete: 'new-password' },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={showPassword.onToggle} edge="end">
                                <Iconify
                                  icon={
                                    showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'
                                  }
                                />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </>
                )}
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
              </Stack>
            )}

            {activeRegisterStep === 2 && (
              <Stack spacing={2.5} alignItems="center" sx={{ textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#f8f6ee',
                    bgcolor: '#6f8790',
                    boxShadow: '0 18px 48px rgba(32,42,43,0.18)',
                  }}
                >
                  <Iconify icon="solar:check-circle-bold" width={42} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 950 }}>
                    ส่งคำขอสมัครแล้ว
                  </Typography>
                  <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                    ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี Creator ของคุณ
                  </Typography>
                </Box>
                <Stack
                  textAlign="center"
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  sx={{ width: 1, justifyContent: 'center' }}
                >
                  <Button component={RouterLink} href="/creator/sign-in" variant="contained">
                    ไปหน้าเข้าสู่ระบบ
                  </Button>
                </Stack>
              </Stack>
            )}

            {activeRegisterStep < 2 && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={activeRegisterStep === 0 || isSubmitting}
                  onClick={() => setActiveRegisterStep((current) => Math.max(current - 1, 0))}
                >
                  ย้อนกลับ
                </Button>
                {activeRegisterStep === 0 ? (
                  <Button fullWidth size="large" variant="contained" onClick={goNextRegisterStep}>
                    ต่อไป
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                    loading={isSubmitting}
                    disabled={!acceptTerms}
                    sx={{ minHeight: 50, fontWeight: 900 }}
                  >
                    ส่งคำขอสมัคร
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Form>

        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          มีบัญชีแล้ว?{' '}
          <Link component={RouterLink} href={signInHref}>
            เข้าสู่ระบบ
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}

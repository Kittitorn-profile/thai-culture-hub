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
import StepLabel from '@mui/material/StepLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { creatorGoogleClient } from 'src/lib/creator-google-auth';
import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { getRoleHomePath, getSafeRoleRedirectPath } from 'src/auth/utils/role-redirect';
import { CREATOR_AUTH_TOKEN_KEY } from 'src/auth/context/supabase/auth-provider';

import { registerCreator } from '../creator-api';
import { GoogleIdentityButton } from '../components/google-identity-button';
import { cultureUi } from 'src/theme/culture-ui';
import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

const registerSteps = ['ข้อมูลส่วนตัว', 'ตั้งค่าบัญชี', 'ส่งคำขอสมัคร'];

const RegisterSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().trim().min(1, { error: 'กรุณากรอกชื่อที่แสดง' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกอีเมล' })
      .email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }),
    phone: z
      .string()
      .trim()
      .refine((value) => !value || /^\+?[\d\s()-]{8,20}$/.test(value), {
        error: 'กรุณากรอกเบอร์โทรให้ถูกต้อง',
      }),
    provinceCode: z
      .string()
      .min(1, { error: 'กรุณาเลือกจังหวัดของคุณ' })
      .refine((code) => provinces.some((province) => province.code === code), {
        error: 'กรุณาเลือกจังหวัดจากรายการ',
      }),
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
  const [registrationCreated, setRegistrationCreated] = useState(true);
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
  const safeReturnTo = returnTo ? getSafeRoleRedirectPath({ role: 'creator' }, returnTo) : '';
  const signInHref = `/creator/sign-in${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''}`;

  const goNextRegisterStep = async () => {
    const isValid = await trigger(['displayName', 'phone', 'provinceCode'], {
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
            intent: 'register',
            acceptTerms: data.acceptTerms,
            displayName: data.displayName,
            phone: data.phone,
            provinceCode: data.provinceCode,
            bio: data.bio,
          }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          token?: string | null;
          outcome?: 'signed_in' | 'pending' | 'registration_submitted';
          message?: string;
          data?: { status?: string };
        };

        await creatorGoogleClient.auth.signOut({ scope: 'local' });

        if (!response.ok) throw new Error(result.message ?? 'สมัครด้วย Google ไม่สำเร็จ');

        if (result.token && result.data?.status === 'approved') {
          sessionStorage.setItem(CREATOR_AUTH_TOKEN_KEY, result.token);
          await checkUserSession?.();
          router.replace(safeReturnTo || getRoleHomePath({ role: 'creator' }));
          return;
        }

        if (result.data?.status !== 'pending')
          throw new Error('สถานะบัญชีไม่พร้อมใช้งาน กรุณาติดต่อทีมงาน');
        const created = result.outcome === 'registration_submitted';
        setRegistrationCreated(created);
        setMessage(
          created
            ? 'ส่งคำขอสมัครด้วย Google แล้ว ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี'
            : 'บัญชีนี้มีคำขอสมัครอยู่แล้ว กรุณารอทีมงานตรวจสอบ ไม่ต้องสมัครซ้ำ'
        );
      } else {
        await registerCreator({
          ...data,
          email: data.email.trim().toLowerCase(),
        });
        setRegistrationCreated(true);
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

      const lookupResponse = await fetch('/api/creator/google-auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent: 'lookup' }),
      });
      const lookup = await lookupResponse.json().catch(() => ({}));
      if (lookupResponse.ok) {
        if (lookup.data?.status === 'pending') {
          setRegistrationCreated(false);
          setMessage('บัญชีนี้มีคำขอสมัครอยู่แล้ว อยู่ระหว่างรอทีมงานตรวจสอบ ไม่ต้องสมัครซ้ำ');
        } else {
          router.replace(signInHref);
        }
        await creatorGoogleClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
        return;
      }
      if (lookupResponse.status !== 404) throw new Error(lookup.message ?? 'ตรวจสอบบัญชีไม่สำเร็จ');

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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่'
      );
    } finally {
      setIsGoogleLoading(false);
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
          mx: 'auto',
          width: 1,
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
            ร่วมเล่าเรื่อง
            <br />
            วัฒนธรรมในมุมของคุณ
          </Typography>
          <Typography sx={{ mt: 2, color: cultureUi.muted, fontSize: 15, lineHeight: 1.85 }}>
            สมัครเพื่อเขียนบทความและเสนอแก้ไขข้อมูลวัฒนธรรม โดยมีทีมงานตรวจสอบก่อนเผยแพร่
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 3, display: { xs: 'none', md: 'flex' } }}>
            {['สร้างโปรไฟล์ของคุณ', 'เขียนเรื่องราวจากท้องถิ่น', 'ร่วมดูแลข้อมูลให้ถูกต้อง'].map(
              (text, index) => (
                <Stack key={text} direction="row" spacing={1.5} alignItems="center">
                  <Typography component="span" sx={{ color: '#8b9690', fontSize: 12 }}>
                    0{index + 1}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: cultureUi.muted }}>{text}</Typography>
                </Stack>
              )
            )}
          </Stack>
          <Typography
            sx={{
              mt: 3,
              pt: 2,
              borderTop: `1px solid ${cultureUi.border}`,
              fontSize: 12,
              color: cultureUi.muted,
              lineHeight: 1.8,
            }}
          >
            บัญชีจะเริ่มใช้งานได้หลังทีมงานตรวจสอบคำขอสมัคร
          </Typography>
        </Box>
        <Stack
          spacing={2.5}
          sx={{
            mx: 'auto',
            p: { xs: 2.5, md: 3.5 },
            width: 1,
            maxWidth: 520,
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
          <Box>
            <Typography component="h2" sx={{ fontSize: 24, fontWeight: 600, lineHeight: 1.4 }}>
              สมัครเป็น Creator
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 13, color: cultureUi.muted }}>
              กรอกช่องที่มี * ให้ครบ เพื่อส่งคำขอสมัคร
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && (
            <Alert severity={activeRegisterStep === 2 && registrationCreated ? 'success' : 'info'}>
              {message}
            </Alert>
          )}

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack
              spacing={2.5}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.6)' } }}
            >
              <Stepper
                alternativeLabel
                activeStep={activeRegisterStep}
                sx={{
                  '& .MuiStepLabel-label': { fontSize: { xs: 11, sm: 12 }, mt: '8px !important' },
                  '& .MuiStepIcon-root': { fontSize: 22 },
                  '& .MuiStep-root': { px: 0.5 },
                }}
              >
                {registerSteps.map((step) => (
                  <Step key={step}>
                    <StepLabel>{step}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {activeRegisterStep === 0 && (
                <Stack spacing={2}>
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
                    <Field.Text
                      size="small"
                      name="firstName"
                      label="ชื่อ (ถ้ามี)"
                      autoComplete="given-name"
                    />
                    <Field.Text
                      size="small"
                      name="lastName"
                      label="นามสกุล (ถ้ามี)"
                      autoComplete="family-name"
                    />
                  </Stack>
                  <Field.Text
                    size="small"
                    name="displayName"
                    label="ชื่อที่แสดงบนเว็บไซต์"
                    required
                    helperText="ใช้เป็นชื่อผู้เขียนบทความของคุณ"
                  />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <Field.Text
                      size="small"
                      name="phone"
                      label="เบอร์โทร (ถ้ามี)"
                      autoComplete="tel"
                    />
                    <Field.Autocomplete
                      name="provinceCode"
                      size="small"
                      label="จังหวัดของคุณ"
                      placeholder="พิมพ์ค้นหาจังหวัด"
                      options={provinceOptions.map((province) => province.code)}
                      value={watch('provinceCode') || null}
                      getOptionLabel={(code: string) =>
                        provinceOptions.find((province) => province.code === code)?.name ?? ''
                      }
                      isOptionEqualToValue={(option, value) => option === value}
                      onChange={(_event, code) =>
                        setValue('provinceCode', code ?? '', {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                      noOptionsText="ไม่พบจังหวัด"
                      openText="เปิดรายชื่อจังหวัด"
                      closeText="ปิดรายชื่อจังหวัด"
                      clearText="ล้างจังหวัด"
                      helperText="ใช้เป็นพื้นที่เริ่มต้นในการสำรวจวัฒนธรรม"
                      slotProps={{ textField: { required: true } }}
                    />{' '}
                  </Box>
                </Stack>
              )}

              {activeRegisterStep === 1 && (
                <Stack spacing={2}>
                  <Field.Text
                    size="small"
                    name="email"
                    label="อีเมลสำหรับเข้าสู่ระบบ"
                    required
                    slotProps={{
                      htmlInput: { autoComplete: 'email', readOnly: authMethod === 'google' },
                    }}
                  />
                  {authMethod !== 'google' && (
                    <>
                      <Field.Text
                        size="small"
                        name="password"
                        label="รหัสผ่าน"
                        required
                        helperText="อย่างน้อย 6 ตัวอักษร"
                        type={showPassword.value ? 'text' : 'password'}
                        slotProps={{
                          htmlInput: { autoComplete: 'new-password' },
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={showPassword.onToggle}
                                  edge="end"
                                  aria-label={showPassword.value ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                >
                                  <Iconify
                                    icon={
                                      showPassword.value
                                        ? 'solar:eye-bold'
                                        : 'solar:eye-closed-bold'
                                    }
                                  />
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <Field.Text
                        size="small"
                        name="confirmPassword"
                        label="ยืนยันรหัสผ่าน"
                        required
                        type={showPassword.value ? 'text' : 'password'}
                        slotProps={{
                          htmlInput: { autoComplete: 'new-password' },
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={showPassword.onToggle}
                                  edge="end"
                                  aria-label={showPassword.value ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                >
                                  <Iconify
                                    icon={
                                      showPassword.value
                                        ? 'solar:eye-bold'
                                        : 'solar:eye-closed-bold'
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
                          bgcolor: cultureUi.subtle,
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
                      color: cultureUi.accent,
                      bgcolor: '#f7f7f5',
                      boxShadow: 'none',
                    }}
                  >
                    <Iconify icon="solar:check-circle-bold" width={42} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {registrationCreated ? 'ส่งคำขอสมัครแล้ว' : 'บัญชีอยู่ระหว่างรออนุมัติ'}
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
                    disabled={isSubmitting}
                    sx={{ display: activeRegisterStep === 0 ? 'none' : 'inline-flex' }}
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
                      sx={{ minHeight: 50, fontWeight: 600 }}
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
    </Box>
  );
}

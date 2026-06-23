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
import { useSearchParams } from 'src/routes/hooks';

import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { registerCreator } from '../creator-api';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const registerSteps = ['ข้อมูลส่วนตัว', 'ตั้งค่าบัญชี', 'ส่งคำขอสมัคร'];

const RegisterSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().min(1, { error: 'กรุณากรอกชื่อที่แสดง' }),
    email: schemaUtils.email(),
    phone: z.string(),
    provinceCode: z.string().min(1, { error: 'กรุณาเลือกจังหวัดของคุณ' }),
    bio: z.string(),
    password: z
      .string()
      .min(1, { error: 'กรุณากรอกรหัสผ่าน' })
      .min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
    confirmPassword: z.string().min(1, { error: 'กรุณายืนยันรหัสผ่าน' }),
    acceptTerms: z
      .boolean({ error: 'กรุณายอมรับเงื่อนไขการใช้บริการก่อนส่งคำขอสมัคร' })
      .refine((value) => value === true, {
        error: 'กรุณายอมรับเงื่อนไขการใช้บริการก่อนส่งคำขอสมัคร',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
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
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>(
    getFallbackProvinceOptions
  );
  const [activeRegisterStep, setActiveRegisterStep] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const methods = useForm<CreatorRegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: initialRegisterForm,
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    reset,
    trigger,
    formState: { isSubmitting },
  } = methods;
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
      await registerCreator({
        ...data,
        email: data.email.trim().toLowerCase(),
      });
      setMessage('ส่งคำขอลงทะเบียนแล้ว ทีมงานจะตรวจสอบก่อนเปิดใช้งานบัญชี');
      reset(initialRegisterForm);
      setActiveRegisterStep(2);
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
            สมัครเป็น Creator
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            ลงทะเบียนเพื่อเขียนและส่งบทความวัฒนธรรมให้ทีมงานตรวจสอบ
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Stepper activeStep={activeRegisterStep} alternativeLabel>
              {registerSteps.map((step) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeRegisterStep === 0 && (
              <Stack spacing={2.5}>
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
                  slotProps={{ htmlInput: { autoComplete: 'email' } }}
                />
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
                              icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
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
                      <Link component={RouterLink} href="/terms-and-conditions" target="_blank">
                        เงื่อนไขการใช้บริการ
                      </Link>{' '}
                      และ{' '}
                      <Link component={RouterLink} href="/privacy-policy" target="_blank">
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
                  >
                    ส่งคำขอสมัคร
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Form>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          มีบัญชีแล้ว?{' '}
          <Link component={RouterLink} href={signInHref}>
            เข้าสู่ระบบ
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}

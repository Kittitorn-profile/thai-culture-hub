'use client';

import type { ChangeEvent } from 'react';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';

import { supabase } from 'src/lib/supabase';
import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';
import { SYSTEM_CULTURE_CATEGORIES } from 'src/lib/culture-categories';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

function splitDisplayName(displayName = '') {
  const [firstName = '', ...lastNameParts] = displayName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(' '),
  };
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'A'
  );
}

const AVATAR_MAX_INPUT_SIZE = 1 * 1024 * 1024;
const AVATAR_TARGET_SIZE = 512 * 1024;
const AVATAR_MAX_DIMENSION = 720;

function blobToFile(blob: Blob, fileName: string) {
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'avatar';

  return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('บีบอัดรูปไม่สำเร็จ'));
        }
      },
      type,
      quality
    );
  });
}

async function loadImage(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
      image.src = imageUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function compressAvatarFile(file: File) {
  if (file.size > AVATAR_MAX_INPUT_SIZE) {
    throw new Error('รูปภาพต้องมีขนาดไม่เกิน 1 MB');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('เบราว์เซอร์ไม่รองรับการบีบอัดรูปภาพ');
  }

  const outputType = 'image/webp';
  let quality = 0.82;
  let outputBlob: Blob | null = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    outputBlob = await canvasToBlob(canvas, outputType, quality);

    if (outputBlob.size <= AVATAR_TARGET_SIZE) {
      break;
    }

    if (quality > 0.48) {
      quality -= 0.08;
    } else {
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
  }

  if (!outputBlob || outputBlob.size > AVATAR_TARGET_SIZE) {
    throw new Error('ไม่สามารถลดขนาดรูปให้ต่ำกว่า 0.5 MB ได้ กรุณาเลือกรูปที่เล็กลง');
  }

  return blobToFile(outputBlob, file.name);
}

type MasterOption = {
  value: string;
  label: string;
};

type MyReviewerProfile = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  reviewerLevel: string;
  reviewerStatus: string;
  expertiseCategories: string[];
  expertiseRegions: string[];
  expertiseProvinces: string[];
  organization: string;
  position: string;
  credentials: string;
  proofUrls: string[];
  reviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  accuracyScore: number;
  trustScore: number;
  canReviewCategories: string[];
  canReviewRegions: string[];
  canApprove: boolean;
  canPublish: boolean;
  notes: string;
};

type ProfileResponse = {
  data?: {
    reviewer?: MyReviewerProfile | null;
  };
};

type AvatarUploadResponse = {
  data?: {
    photoUrl?: string;
  };
};

type ReviewerForm = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  expertiseCategories: string;
  expertiseRegions: string;
  expertiseProvinces: string;
  organization: string;
  position: string;
  credentials: string;
  proofUrls: string;
  notes: string;
};

const defaultReviewerForm: ReviewerForm = {
  displayName: '',
  bio: '',
  avatarUrl: '',
  expertiseCategories: '',
  expertiseRegions: '',
  expertiseProvinces: '',
  organization: '',
  position: '',
  credentials: '',
  proofUrls: '',
  notes: '',
};

async function uploadAdminAvatar(accessToken: string, file: File) {
  const uploadFile = await compressAvatarFile(file);
  const formData = new FormData();

  formData.set('file', uploadFile);

  const result = await adminApiRequest<AvatarUploadResponse>('/api/admin/profile/avatar', {
    method: 'POST',
    accessToken,
    body: formData,
  });

  const photoUrl = result.data?.photoUrl ?? '';

  if (!photoUrl) {
    throw new Error('อัปโหลดรูปไม่สำเร็จ');
  }

  return photoUrl;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  verified: 'ยืนยันแล้ว',
  suspended: 'ระงับ',
  rejected: 'ไม่อนุมัติ',
};

const LEVEL_LABELS: Record<string, string> = {
  junior: 'ระดับเริ่มต้น',
  senior: 'ระดับชำนาญ',
  expert: 'ระดับผู้เชี่ยวชาญ',
};

const REGION_LABELS: Record<string, string> = {
  central: 'ภาคกลาง',
  north: 'ภาคเหนือ',
  northeast: 'ภาคตะวันออกเฉียงเหนือ',
  east: 'ภาคตะวันออก',
  west: 'ภาคตะวันตก',
  south: 'ภาคใต้',
};

const CATEGORY_OPTIONS: MasterOption[] = SYSTEM_CULTURE_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));

const REGION_OPTIONS: MasterOption[] = Array.from(
  new Set(provinces.map((province) => province.region).filter(Boolean))
).map((region) => ({
  value: region,
  label: REGION_LABELS[region] ?? region,
}));

const PROVINCE_OPTIONS: MasterOption[] = provinces.map((province) => ({
  value: province.code,
  label: province.name,
}));

function joinValues(values: string[]) {
  return values.filter(Boolean).join(', ');
}

function splitValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOptionLabel(value: string, options: MasterOption[]) {
  return options.find((option) => option.value === value || option.label === value)?.label ?? value;
}

function getSelectedOptions(value: string, options: MasterOption[]) {
  return splitValues(value).map((item) => {
    const option = options.find((current) => current.value === item || current.label === item);

    return option ?? { value: item, label: item };
  });
}

function getReviewerForm(reviewer: MyReviewerProfile): ReviewerForm {
  return {
    displayName: reviewer.displayName,
    bio: reviewer.bio,
    avatarUrl: reviewer.avatarUrl,
    expertiseCategories: joinValues(reviewer.expertiseCategories),
    expertiseRegions: joinValues(reviewer.expertiseRegions),
    expertiseProvinces: joinValues(reviewer.expertiseProvinces),
    organization: reviewer.organization,
    position: reviewer.position,
    credentials: reviewer.credentials,
    proofUrls: joinValues(reviewer.proofUrls),
    notes: reviewer.notes,
  };
}

const fieldGridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
};

const statGridSx = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(5, minmax(0, 1fr))',
  },
};

const panelSx = {
  p: 2,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.neutral',
};

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={panelSx}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 900, fontSize: 20 }}>{value}</Typography>
    </Box>
  );
}

export function ProfileAdminClient() {
  const theme = useTheme();
  const { user, checkUserSession } = useAuthContext();
  const fallbackName = splitDisplayName(user?.displayName);
  const [firstName, setFirstName] = useState(user?.firstName ?? fallbackName.firstName);
  const [lastName, setLastName] = useState(user?.lastName ?? fallbackName.lastName);
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL ?? '');
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [reviewerForm, setReviewerForm] = useState<ReviewerForm>(defaultReviewerForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const profileQuery = useQuery({
    queryKey: ['admin-profile', accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<ProfileResponse>('/api/admin/profile', {
        accessToken,
      }),
  });

  const reviewerProfile = useMemo(
    () => profileQuery.data?.data?.reviewer ?? null,
    [profileQuery.data?.data?.reviewer]
  );
  const sharedAvatarUrl = photoUrl.trim() || reviewerForm.avatarUrl.trim();
  const previewAvatarUrl = pendingAvatarPreview || sharedAvatarUrl;
  const profileDisplayName =
    `${firstName} ${lastName}`.trim() || reviewerForm.displayName || user?.displayName || '';
  const initials = getInitials(profileDisplayName || user?.email || 'Admin');

  const setSharedPhotoUrl = (value: string) => {
    setPhotoUrl(value);
    setReviewerForm((current) => ({
      ...current,
      avatarUrl: value,
    }));
  };

  useEffect(() => {
    if (reviewerProfile) {
      setReviewerForm(getReviewerForm(reviewerProfile));
    }
  }, [reviewerProfile]);

  useEffect(
    () => () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
    },
    [pendingAvatarPreview]
  );

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      formData.set('firstName', firstName.trim());
      formData.set('lastName', lastName.trim());
      formData.set('photoUrl', sharedAvatarUrl);

      await adminApiRequest<{ message?: string }>('/api/admin/profile', {
        method: 'PUT',
        accessToken,
        body: formData,
      });

      const nextDisplayName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: nextDisplayName,
          photo_url: sharedAvatarUrl || null,
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

  const saveReviewerMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<{ data?: { reviewer?: MyReviewerProfile | null } }>('/api/admin/profile', {
        method: 'PATCH',
        accessToken,
        body: {
          ...reviewerForm,
          avatarUrl: sharedAvatarUrl,
        },
      }),
    onSuccess: async (result) => {
      setMessage('บันทึกข้อมูลผู้ตรวจสอบแล้ว');

      if (result.data?.reviewer) {
        setReviewerForm(getReviewerForm(result.data.reviewer));
      }

      await profileQuery.refetch();
    },
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error ? caughtError.message : 'บันทึกข้อมูลผู้ตรวจสอบไม่สำเร็จ'
      );
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

  const clearPendingAvatar = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(null);
    setPendingAvatarPreview('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const selectAvatarFile = (file: File | undefined) => {
    if (!file) return;

    setError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
      clearPendingAvatar();
      return;
    }

    if (file.size > AVATAR_MAX_INPUT_SIZE) {
      setError('รูปภาพต้องมีขนาดไม่เกิน 1 MB');
      clearPendingAvatar();
      return;
    }

    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setMessage('เลือกรูปแล้ว ตรวจ preview แล้วกดยืนยันอัปโหลดเพื่อบันทึก');
  };

  const uploadAvatar = async () => {
    if (!accessToken || !pendingAvatarFile) return;

    setIsUploadingAvatar(true);
    setError('');
    setMessage('');

    try {
      const nextPhotoUrl = await uploadAdminAvatar(accessToken, pendingAvatarFile);

      setSharedPhotoUrl(nextPhotoUrl);
      clearPendingAvatar();
      setMessage('อัปโหลดรูปโปรไฟล์แล้ว');
      await checkUserSession?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const updateReviewerForm = (field: keyof ReviewerForm, value: string) => {
    setReviewerForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateReviewerMasterField = (field: keyof ReviewerForm, values: MasterOption[]) => {
    updateReviewerForm(field, values.map((item) => item.value).join(', '));
  };

  const saveReviewerProfile = async () => {
    if (!reviewerForm.displayName.trim()) {
      setError('กรุณากรอกชื่อผู้ตรวจสอบ');
      return;
    }

    setError('');
    setMessage('');

    await saveReviewerMutation.mutateAsync().catch(() => undefined);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            โปรไฟล์ของฉัน
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
            จัดการข้อมูลส่วนตัวที่ใช้แสดงในระบบ admin
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 2.5,
                overflow: 'hidden',
                position: 'sticky',
                top: 24,
              }}
            >
              <Box
                sx={{
                  height: 118,
                  mx: -2.5,
                  mt: -2.5,
                  mb: -7,
                  bgcolor: 'primary.main',
                }}
              />

              <Stack
                spacing={2.25}
                alignItems="center"
                sx={{ textAlign: 'center', position: 'relative' }}
              >
                <Box sx={{ position: 'relative', mt: 1 }}>
                  <Box
                    ref={avatarInputRef}
                    component="input"
                    type="file"
                    accept="image/*"
                    sx={{ display: 'none' }}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      selectAvatarFile(event.target.files?.[0])
                    }
                  />
                  <Avatar
                    src={previewAvatarUrl || undefined}
                    alt={profileDisplayName || user?.email || 'Admin'}
                    sx={{
                      width: 144,
                      height: 144,
                      mx: 'auto',
                      fontSize: 44,
                      fontWeight: 900,
                      color: 'common.white',
                      bgcolor: 'primary.main',
                      border: '5px solid',
                      borderColor: 'background.paper',
                      boxShadow: (currentTheme) => currentTheme.customShadows.z16,
                    }}
                  >
                    {initials}
                  </Avatar>
                  <Box
                    sx={{
                      right: 2,
                      bottom: 2,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.contrastText',
                      bgcolor: 'primary.main',
                      position: 'absolute',
                      border: '2px solid',
                      borderColor: 'background.paper',
                    }}
                  >
                    <Iconify icon="solar:camera-add-bold" width={20} />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    รูปโปรไฟล์เดียวกัน
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                    รูปนี้ใช้ทั้งบัญชี admin และโปรไฟล์ผู้ตรวจสอบ
                    เพื่อให้ผู้ใช้เห็นภาพเดียวกันทุกจุด
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant={pendingAvatarFile ? 'outlined' : 'contained'}
                  disabled={isUploadingAvatar}
                  startIcon={<Iconify icon="solar:camera-add-bold" />}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {pendingAvatarFile ? 'เลือกรูปใหม่' : 'เลือกรูป'}
                </Button>

                {pendingAvatarFile && (
                  <Stack spacing={1} sx={{ width: 1 }}>
                    <Alert severity="info" sx={{ alignItems: 'flex-start', textAlign: 'left' }}>
                      ตรวจรูป preview ก่อนกดยืนยัน รูปจะยังไม่ถูกบันทึกจนกว่าจะกดยืนยันอัปโหลด
                    </Alert>
                    <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                      <LoadingButton
                        fullWidth
                        variant="contained"
                        loading={isUploadingAvatar}
                        onClick={uploadAvatar}
                      >
                        ยืนยันอัปโหลด
                      </LoadingButton>
                      <Button
                        fullWidth
                        color="inherit"
                        variant="outlined"
                        disabled={isUploadingAvatar}
                        onClick={clearPendingAvatar}
                      >
                        ยกเลิก
                      </Button>
                    </Stack>
                  </Stack>
                )}

                <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!sharedAvatarUrl || isUploadingAvatar}
                    onClick={() => setSharedPhotoUrl('')}
                  >
                    ล้างรูป
                  </Button>
                  <Button
                    fullWidth
                    component={sharedAvatarUrl ? 'a' : 'button'}
                    href={sharedAvatarUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    disabled={!sharedAvatarUrl}
                  >
                    ดูรูป
                  </Button>
                </Stack>
              </Stack>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      ข้อมูลบัญชี
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                      ข้อมูลนี้ใช้แสดงชื่อและรูปในระบบผู้ดูแล
                    </Typography>
                  </Box>

                  <Chip
                    label={user?.email ?? '-'}
                    variant="soft"
                    sx={{ alignSelf: { md: 'center' } }}
                  />
                </Stack>

                <Divider />

                <Box
                  sx={{
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  <Stack spacing={2} sx={{ minWidth: 0 }}>
                    <Box sx={fieldGridSx}>
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
                    </Box>

                    <TextField fullWidth disabled label="อีเมล" value={user?.email ?? ''} />

                    <LoadingButton
                      variant="contained"
                      loading={saveProfileMutation.isPending}
                      onClick={saveProfile}
                      sx={{ alignSelf: 'flex-end' }}
                    >
                      บันทึกโปรไฟล์
                    </LoadingButton>
                  </Stack>
                </Box>
              </Stack>
            </Card>

            {reviewerProfile && (
              <Card sx={{ p: { xs: 2.5, md: 3 }, mt: 3 }}>
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        ข้อมูลผู้ตรวจสอบของฉัน
                      </Typography>
                      <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                        แก้ไขข้อมูลโปรไฟล์และความเชี่ยวชาญที่ใช้แสดงในงานตรวจบทความ
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={
                          STATUS_LABELS[reviewerProfile.reviewerStatus] ??
                          reviewerProfile.reviewerStatus
                        }
                        color={
                          reviewerProfile.reviewerStatus === 'verified' ? 'success' : 'default'
                        }
                        variant="soft"
                      />
                      <Chip
                        label={
                          LEVEL_LABELS[reviewerProfile.reviewerLevel] ??
                          reviewerProfile.reviewerLevel
                        }
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>

                  <Divider />

                  <Box sx={statGridSx}>
                    <StatItem
                      label="ตรวจแล้ว"
                      value={reviewerProfile.reviewCount.toLocaleString('th-TH')}
                    />
                    <StatItem
                      label="อนุมัติ"
                      value={reviewerProfile.approvedCount.toLocaleString('th-TH')}
                    />
                    <StatItem
                      label="ไม่อนุมัติ"
                      value={reviewerProfile.rejectedCount.toLocaleString('th-TH')}
                    />
                    <StatItem
                      label="ความแม่นยำ"
                      value={reviewerProfile.accuracyScore.toLocaleString('th-TH')}
                    />
                    <StatItem
                      label="ความน่าเชื่อถือ"
                      value={reviewerProfile.trustScore.toLocaleString('th-TH')}
                    />
                  </Box>

                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={3}
                    alignItems={{ md: 'flex-start' }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ mb: 2, fontWeight: 900 }}>ข้อมูลแสดงผล</Typography>
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="ชื่อที่แสดง"
                          value={reviewerForm.displayName}
                          onChange={(event) =>
                            updateReviewerForm('displayName', event.target.value)
                          }
                        />
                      </Stack>
                    </Box>
                  </Stack>

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="ประวัติย่อ"
                    value={reviewerForm.bio}
                    onChange={(event) => updateReviewerForm('bio', event.target.value)}
                  />

                  <Box sx={fieldGridSx}>
                    <TextField
                      fullWidth
                      label="องค์กร"
                      value={reviewerForm.organization}
                      onChange={(event) => updateReviewerForm('organization', event.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="ตำแหน่ง"
                      value={reviewerForm.position}
                      onChange={(event) => updateReviewerForm('position', event.target.value)}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="คุณวุฒิและประสบการณ์"
                    value={reviewerForm.credentials}
                    onChange={(event) => updateReviewerForm('credentials', event.target.value)}
                  />

                  <TextField
                    fullWidth
                    label="ลิงก์หลักฐาน"
                    placeholder="คั่นแต่ละรายการด้วยจุลภาค"
                    value={reviewerForm.proofUrls}
                    onChange={(event) => updateReviewerForm('proofUrls', event.target.value)}
                  />

                  <Divider />

                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>ความเชี่ยวชาญ</Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                      เลือกหมวดหมู่ พื้นที่ และจังหวัดที่สะท้อนความเชี่ยวชาญของคุณ
                    </Typography>
                  </Box>

                  <Autocomplete
                    multiple
                    options={CATEGORY_OPTIONS}
                    value={getSelectedOptions(reviewerForm.expertiseCategories, CATEGORY_OPTIONS)}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    onChange={(_, values) =>
                      updateReviewerMasterField('expertiseCategories', values)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="หมวดหมู่ที่เชี่ยวชาญ"
                        placeholder="เลือกจาก master"
                      />
                    )}
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Autocomplete
                      multiple
                      fullWidth
                      options={REGION_OPTIONS}
                      value={getSelectedOptions(reviewerForm.expertiseRegions, REGION_OPTIONS)}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.value === value.value}
                      onChange={(_, values) =>
                        updateReviewerMasterField('expertiseRegions', values)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="ภูมิภาคที่เชี่ยวชาญ"
                          placeholder="เลือกจาก master"
                        />
                      )}
                    />
                    <Autocomplete
                      multiple
                      fullWidth
                      options={PROVINCE_OPTIONS}
                      value={getSelectedOptions(reviewerForm.expertiseProvinces, PROVINCE_OPTIONS)}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.value === value.value}
                      onChange={(_, values) =>
                        updateReviewerMasterField('expertiseProvinces', values)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="จังหวัดที่เชี่ยวชาญ"
                          placeholder="เลือกจาก master"
                        />
                      )}
                    />
                  </Stack>

                  <Divider />

                  <Box sx={panelSx}>
                    <Typography sx={{ mb: 1, fontWeight: 900 }}>
                      ขอบเขตที่ได้รับสิทธิ์ตรวจ
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {reviewerProfile.canReviewCategories.map((value) => (
                        <Chip
                          key={value}
                          label={getOptionLabel(value, CATEGORY_OPTIONS)}
                          variant="soft"
                        />
                      ))}
                      {reviewerProfile.canReviewRegions.map((value) => (
                        <Chip
                          key={value}
                          label={getOptionLabel(value, REGION_OPTIONS)}
                          variant="soft"
                        />
                      ))}
                      {!reviewerProfile.canReviewCategories.length &&
                        !reviewerProfile.canReviewRegions.length && (
                          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                            ยังไม่ได้กำหนดขอบเขต
                          </Typography>
                        )}
                    </Stack>
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="หมายเหตุ"
                    value={reviewerForm.notes}
                    onChange={(event) => updateReviewerForm('notes', event.target.value)}
                  />

                  <LoadingButton
                    variant="contained"
                    loading={saveReviewerMutation.isPending}
                    onClick={saveReviewerProfile}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    บันทึกข้อมูลผู้ตรวจสอบ
                  </LoadingButton>
                </Stack>
              </Card>
            )}
          </Grid>
        </Grid>
      </Stack>
    </DashboardContent>
  );
}

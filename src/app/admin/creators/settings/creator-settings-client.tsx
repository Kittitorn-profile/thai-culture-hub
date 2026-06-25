'use client';

import type { ChangeEvent } from 'react';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

type CreatorLevel = 'quality' | 'reliable' | 'top';

type CreatorSettings = {
  badgeImages: {
    qualityContributor: string;
    reliableContributor: string;
    topContributor: string;
    textileSpecialist: string;
    festivalSpecialist: string;
    ethnicCultureSpecialist: string;
    localFoodSpecialist: string;
    wisdomKeeper: string;
  };
  levelThresholds: {
    qualityMinPublishedArticles: number;
    qualityMinQualityScore: number;
    qualityMinTotalViews: number;
    reliableMinPublishedArticles: number;
    reliableMinQualityScore: number;
    reliableMinTotalViews: number;
    topMinPublishedArticles: number;
    topMinQualityScore: number;
    topMinTotalViews: number;
  };
  specialtyBadges: {
    textileMinArticles: number;
    textileMinQualityScore: number;
    festivalMinArticles: number;
    festivalMinQualityScore: number;
    ethnicCultureMinArticles: number;
    ethnicCultureMinQualityScore: number;
    localFoodMinArticles: number;
    localFoodMinQualityScore: number;
    wisdomMinArticles: number;
    wisdomMinQualityScore: number;
  };
  scoringWeights: {
    publishedArticles: number;
    articleQualityScore: number;
    engagementScore: number;
    profileCompleteness: number;
  };
  creatorPolicy: {
    autoLevelEnabled: boolean;
    requireApprovedProfile: boolean;
    requireActiveAccount: boolean;
    minScoreToShowBadge: number;
    inactiveWarningDays: number;
    publicBadgeMinLevel: CreatorLevel;
  };
};

type BadgeImageField = keyof CreatorSettings['badgeImages'];
type PendingBadgeImage = {
  file: File;
  previewUrl: string;
};

type SettingsResponse = {
  data?: CreatorSettings;
  updatedAt?: string;
  needsMigration?: boolean;
  message?: string;
};

const DEFAULT_SETTINGS: CreatorSettings = {
  badgeImages: {
    qualityContributor: '',
    reliableContributor: '',
    topContributor: '',
    textileSpecialist: '',
    festivalSpecialist: '',
    ethnicCultureSpecialist: '',
    localFoodSpecialist: '',
    wisdomKeeper: '',
  },
  levelThresholds: {
    qualityMinPublishedArticles: 1,
    qualityMinQualityScore: 70,
    qualityMinTotalViews: 100,
    reliableMinPublishedArticles: 5,
    reliableMinQualityScore: 82,
    reliableMinTotalViews: 800,
    topMinPublishedArticles: 15,
    topMinQualityScore: 90,
    topMinTotalViews: 3000,
  },
  specialtyBadges: {
    textileMinArticles: 3,
    textileMinQualityScore: 75,
    festivalMinArticles: 3,
    festivalMinQualityScore: 75,
    ethnicCultureMinArticles: 3,
    ethnicCultureMinQualityScore: 75,
    localFoodMinArticles: 3,
    localFoodMinQualityScore: 75,
    wisdomMinArticles: 3,
    wisdomMinQualityScore: 75,
  },
  scoringWeights: {
    publishedArticles: 35,
    articleQualityScore: 35,
    engagementScore: 20,
    profileCompleteness: 10,
  },
  creatorPolicy: {
    autoLevelEnabled: false,
    requireApprovedProfile: true,
    requireActiveAccount: true,
    minScoreToShowBadge: 70,
    inactiveWarningDays: 45,
    publicBadgeMinLevel: 'quality',
  },
};

const contributorBadges = [
  {
    title: 'QUALITY CONTRIBUTOR',
    subtitle: 'ผู้สร้างสรรค์คุณภาพ',
    color: 'default' as const,
    imageField: 'qualityContributor' as const,
    articleField: 'qualityMinPublishedArticles' as const,
    scoreField: 'qualityMinQualityScore' as const,
    viewField: 'qualityMinTotalViews' as const,
  },
  {
    title: 'RELIABLE CONTRIBUTOR',
    subtitle: 'ผู้ให้ข้อมูลน่าเชื่อถือ',
    color: 'primary' as const,
    imageField: 'reliableContributor' as const,
    articleField: 'reliableMinPublishedArticles' as const,
    scoreField: 'reliableMinQualityScore' as const,
    viewField: 'reliableMinTotalViews' as const,
  },
  {
    title: 'TOP CONTRIBUTOR',
    subtitle: 'ผู้มีส่วนร่วมยอดเยี่ยม',
    color: 'warning' as const,
    imageField: 'topContributor' as const,
    articleField: 'topMinPublishedArticles' as const,
    scoreField: 'topMinQualityScore' as const,
    viewField: 'topMinTotalViews' as const,
  },
];

const specialtyBadges = [
  {
    title: 'TEXTILE SPECIALIST',
    subtitle: 'ผู้เชี่ยวชาญด้านผ้าไทย',
    imageField: 'textileSpecialist' as const,
    articleField: 'textileMinArticles' as const,
    scoreField: 'textileMinQualityScore' as const,
  },
  {
    title: 'FESTIVAL SPECIALIST',
    subtitle: 'ผู้เชี่ยวชาญด้านประเพณี',
    imageField: 'festivalSpecialist' as const,
    articleField: 'festivalMinArticles' as const,
    scoreField: 'festivalMinQualityScore' as const,
  },
  {
    title: 'ETHNIC CULTURE SPECIALIST',
    subtitle: 'ผู้เชี่ยวชาญด้านชาติพันธุ์',
    imageField: 'ethnicCultureSpecialist' as const,
    articleField: 'ethnicCultureMinArticles' as const,
    scoreField: 'ethnicCultureMinQualityScore' as const,
  },
  {
    title: 'LOCAL FOOD SPECIALIST',
    subtitle: 'ผู้เชี่ยวชาญด้านอาหารพื้นถิ่น',
    imageField: 'localFoodSpecialist' as const,
    articleField: 'localFoodMinArticles' as const,
    scoreField: 'localFoodMinQualityScore' as const,
  },
  {
    title: 'WISDOM KEEPER',
    subtitle: 'ผู้สืบสานภูมิปัญญา',
    imageField: 'wisdomKeeper' as const,
    articleField: 'wisdomMinArticles' as const,
    scoreField: 'wisdomMinQualityScore' as const,
  },
];

const levelOptions: Array<{ value: CreatorLevel; label: string }> = [
  { value: 'quality', label: 'QUALITY CONTRIBUTOR' },
  { value: 'reliable', label: 'RELIABLE CONTRIBUTOR' },
  { value: 'top', label: 'TOP CONTRIBUTOR' },
];

const panelSx = {
  p: 2,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.neutral',
};

function numberValue(value: string, fallback = 0) {
  const nextValue = Number(value);

  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function getTotalWeight(settings: CreatorSettings) {
  return Object.values(settings.scoringWeights).reduce(
    (total, value) => total + Number(value || 0),
    0
  );
}

export function CreatorSettingsClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [settings, setSettings] = useState<CreatorSettings>(DEFAULT_SETTINGS);
  const [updatedAt, setUpdatedAt] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingBadgeKey, setUploadingBadgeKey] = useState('');
  const [pendingBadgeImages, setPendingBadgeImages] = useState<
    Partial<Record<BadgeImageField, PendingBadgeImage>>
  >({});
  const pendingBadgeImagesRef = useRef<Partial<Record<BadgeImageField, PendingBadgeImage>>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const totalWeight = getTotalWeight(settings);

  const updateBadgeImage = (field: keyof CreatorSettings['badgeImages'], value: string) => {
    setSettings((current) => ({
      ...current,
      badgeImages: {
        ...current.badgeImages,
        [field]: value,
      },
    }));
  };

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await adminApiRequest<SettingsResponse>('/api/admin/creators/settings', {
        accessToken,
      });

      setSettings(result.data ?? DEFAULT_SETTINGS);
      setUpdatedAt(result.updatedAt ?? '');
      setNeedsMigration(result.needsMigration === true);

      if (result.message) {
        setMessage(result.message);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดการตั้งค่าไม่สำเร็จ');

      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await checkUserSession?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    pendingBadgeImagesRef.current = pendingBadgeImages;
  }, [pendingBadgeImages]);

  useEffect(
    () => () => {
      Object.values(pendingBadgeImagesRef.current).forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    },
    []
  );

  const updateLevelThreshold = (field: keyof CreatorSettings['levelThresholds'], value: string) => {
    setSettings((current) => ({
      ...current,
      levelThresholds: {
        ...current.levelThresholds,
        [field]: numberValue(value),
      },
    }));
  };

  const updateSpecialtyBadge = (field: keyof CreatorSettings['specialtyBadges'], value: string) => {
    setSettings((current) => ({
      ...current,
      specialtyBadges: {
        ...current.specialtyBadges,
        [field]: numberValue(value),
      },
    }));
  };

  const updateWeight = (field: keyof CreatorSettings['scoringWeights'], value: string) => {
    setSettings((current) => ({
      ...current,
      scoringWeights: {
        ...current.scoringWeights,
        [field]: numberValue(value),
      },
    }));
  };

  const updatePolicy = (
    field: keyof CreatorSettings['creatorPolicy'],
    value: string | number | boolean
  ) => {
    setSettings((current) => ({
      ...current,
      creatorPolicy: {
        ...current.creatorPolicy,
        [field]: value,
      },
    }));
  };

  const saveSettings = async () => {
    if (!accessToken) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await adminApiRequest<SettingsResponse>('/api/admin/creators/settings', {
        method: 'PUT',
        accessToken,
        body: { settings },
      });

      setSettings(result.data ?? settings);
      setUpdatedAt(result.updatedAt ?? '');
      setNeedsMigration(false);
      setMessage('บันทึกการตั้งค่า badge Creator แล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const selectBadgePreview = (field: BadgeImageField, file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
      setMessage('');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPendingBadgeImages((current) => {
      if (current[field]?.previewUrl) {
        URL.revokeObjectURL(current[field].previewUrl);
      }

      return {
        ...current,
        [field]: {
          file,
          previewUrl,
        },
      };
    });
    setError('');
    setMessage('แสดงตัวอย่างรูปแล้ว ตรวจสอบก่อนกดอัปโหลดจริง');
  };

  const clearBadgePreview = (field: BadgeImageField) => {
    setPendingBadgeImages((current) => {
      if (current[field]?.previewUrl) {
        URL.revokeObjectURL(current[field].previewUrl);
      }

      const nextImages = { ...current };
      delete nextImages[field];

      return nextImages;
    });
  };

  const uploadBadgeImage = async (field: BadgeImageField, badgeKey: string) => {
    const pendingImage = pendingBadgeImages[field];

    if (!accessToken || !pendingImage) return;

    setUploadingBadgeKey(badgeKey);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.set('file', pendingImage.file);
      formData.set('badgeKey', badgeKey);

      const result = await adminApiRequest<{ data?: { url?: string } }>(
        '/api/admin/creators/settings/badge-upload',
        {
          method: 'POST',
          accessToken,
          body: formData,
        }
      );
      const nextUrl = result.data?.url ?? '';

      if (!nextUrl) {
        throw new Error('ไม่พบ URL รูป badge หลังอัปโหลด');
      }

      updateBadgeImage(field, nextUrl);
      clearBadgePreview(field);
      setMessage('อัปโหลดรูป badge แล้ว กดบันทึกการตั้งค่าเพื่อใช้งาน');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'อัปโหลดรูป badge ไม่สำเร็จ');
    } finally {
      setUploadingBadgeKey('');
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              ตั้งค่า Badge Creator
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตั้งค่าเกณฑ์สำหรับ Contributor และ Specialist ตาม badge ที่แสดงฝั่งผู้ใช้
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              component={RouterLink}
              href="/admin/creators"
              variant="outlined"
              startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
            >
              รายชื่อ Creator
            </Button>
            <Button
              variant="outlined"
              disabled={isLoading}
              onClick={loadSettings}
              startIcon={<Iconify icon="solar:restart-bold" />}
            >
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity={needsMigration ? 'warning' : 'success'}>{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดการตั้งค่า badge Creator...</Alert>}

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Contributor Badge
                </Typography>
                <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                  ใช้จัดระดับผลงานโดยรวมของ Creator จากจำนวนบทความ คุณภาพ และยอดเข้าชม
                </Typography>
              </Box>
              <Chip
                label={updatedAt ? `อัปเดต ${fDateTime(updatedAt)}` : 'ยังไม่เคยบันทึก'}
                variant="soft"
                sx={{ alignSelf: { md: 'center' } }}
              />
            </Stack>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              {contributorBadges.map((badge) => (
                <Box key={badge.title} sx={panelSx}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Chip size="small" color={badge.color} label={badge.title} variant="soft" />
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {badge.subtitle}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      mb: 2,
                      height: 150,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                      bgcolor: 'rgba(255, 255, 255, 0.92)',
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    {pendingBadgeImages[badge.imageField]?.previewUrl ||
                    settings.badgeImages[badge.imageField] ? (
                      <Box
                        component="img"
                        src={
                          pendingBadgeImages[badge.imageField]?.previewUrl ||
                          settings.badgeImages[badge.imageField]
                        }
                        alt={badge.title}
                        sx={{ width: '120px', height: 1, objectFit: 'contain', p: 1 }}
                      />
                    ) : (
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        ยังไม่มีรูป badge
                      </Typography>
                    )}
                  </Box>
                  {pendingBadgeImages[badge.imageField] && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      กำลังแสดง Preview ยังไม่ได้อัปโหลดจริง
                    </Alert>
                  )}
                  <Stack spacing={2}>
                    <LoadingButton component="label" variant="outlined" color="inherit">
                      เลือกไฟล์เพื่อ Preview
                      <Box
                        component="input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          selectBadgePreview(badge.imageField, event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </LoadingButton>
                    <LoadingButton
                      variant="contained"
                      loading={uploadingBadgeKey === badge.title}
                      disabled={!pendingBadgeImages[badge.imageField]}
                      onClick={() => uploadBadgeImage(badge.imageField, badge.title)}
                    >
                      อัปโหลดรูปนี้
                    </LoadingButton>
                    {pendingBadgeImages[badge.imageField] && (
                      <Button color="inherit" onClick={() => clearBadgePreview(badge.imageField)}>
                        ยกเลิก Preview
                      </Button>
                    )}
                    <TextField
                      fullWidth
                      label="URL รูป Badge"
                      value={settings.badgeImages[badge.imageField]}
                      onChange={(event) => updateBadgeImage(badge.imageField, event.target.value)}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="จำนวนบทความเผยแพร่ขั้นต่ำ"
                      value={settings.levelThresholds[badge.articleField]}
                      onChange={(event) =>
                        updateLevelThreshold(badge.articleField, event.target.value)
                      }
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="คะแนนคุณภาพขั้นต่ำ"
                      value={settings.levelThresholds[badge.scoreField]}
                      onChange={(event) =>
                        updateLevelThreshold(badge.scoreField, event.target.value)
                      }
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="ยอดเข้าชมรวมขั้นต่ำ"
                      value={settings.levelThresholds[badge.viewField]}
                      onChange={(event) =>
                        updateLevelThreshold(badge.viewField, event.target.value)
                      }
                    />
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Specialist Badge
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                ใช้ให้ badge ความเชี่ยวชาญตามหมวดบทความ เช่น ผ้าไทย ประเพณี ชาติพันธุ์ อาหารพื้นถิ่น
                และภูมิปัญญา
              </Typography>
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
              }}
            >
              {specialtyBadges.map((badge) => (
                <Box key={badge.title} sx={panelSx}>
                  <Typography variant="subtitle2">{badge.title}</Typography>
                  <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                    {badge.subtitle}
                  </Typography>
                  <Box
                    sx={{
                      mt: 2,
                      height: 132,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                      bgcolor: 'rgba(255, 255, 255, 0.92)',
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    {pendingBadgeImages[badge.imageField]?.previewUrl ||
                    settings.badgeImages[badge.imageField] ? (
                      <Box
                        component="img"
                        src={
                          pendingBadgeImages[badge.imageField]?.previewUrl ||
                          settings.badgeImages[badge.imageField]
                        }
                        alt={badge.title}
                        sx={{ width: 1, height: 1, objectFit: 'contain', p: 1 }}
                      />
                    ) : (
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        ยังไม่มีรูป badge
                      </Typography>
                    )}
                  </Box>
                  {pendingBadgeImages[badge.imageField] && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      กำลังแสดง Preview ยังไม่ได้อัปโหลดจริง
                    </Alert>
                  )}
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <LoadingButton component="label" variant="outlined" color="inherit">
                      เลือกไฟล์เพื่อ Preview
                      <Box
                        component="input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          selectBadgePreview(badge.imageField, event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </LoadingButton>
                    <LoadingButton
                      variant="contained"
                      loading={uploadingBadgeKey === badge.title}
                      disabled={!pendingBadgeImages[badge.imageField]}
                      onClick={() => uploadBadgeImage(badge.imageField, badge.title)}
                    >
                      อัปโหลดรูปนี้
                    </LoadingButton>
                    {pendingBadgeImages[badge.imageField] && (
                      <Button color="inherit" onClick={() => clearBadgePreview(badge.imageField)}>
                        ยกเลิก Preview
                      </Button>
                    )}
                    <TextField
                      fullWidth
                      label="URL รูป Badge"
                      value={settings.badgeImages[badge.imageField]}
                      onChange={(event) => updateBadgeImage(badge.imageField, event.target.value)}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="บทความในหมวดขั้นต่ำ"
                      value={settings.specialtyBadges[badge.articleField]}
                      onChange={(event) =>
                        updateSpecialtyBadge(badge.articleField, event.target.value)
                      }
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="คะแนนคุณภาพขั้นต่ำ"
                      value={settings.specialtyBadges[badge.scoreField]}
                      onChange={(event) =>
                        updateSpecialtyBadge(badge.scoreField, event.target.value)
                      }
                    />
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                สูตรคะแนนและนโยบาย
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                กำหนดน้ำหนักคะแนนและเงื่อนไขการแสดง badge ภายในระบบ
              </Typography>
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Box sx={panelSx}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography sx={{ fontWeight: 900 }}>น้ำหนักคะแนน</Typography>
                  <Chip
                    size="small"
                    label={`รวม ${totalWeight}`}
                    color={totalWeight === 100 ? 'success' : 'warning'}
                    variant="soft"
                  />
                </Stack>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักจำนวนบทความเผยแพร่"
                    value={settings.scoringWeights.publishedArticles}
                    onChange={(event) => updateWeight('publishedArticles', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักคะแนนคุณภาพบทความ"
                    value={settings.scoringWeights.articleQualityScore}
                    onChange={(event) => updateWeight('articleQualityScore', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักยอดเข้าชมและการมีส่วนร่วม"
                    value={settings.scoringWeights.engagementScore}
                    onChange={(event) => updateWeight('engagementScore', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักความครบถ้วนของโปรไฟล์"
                    value={settings.scoringWeights.profileCompleteness}
                    onChange={(event) => updateWeight('profileCompleteness', event.target.value)}
                  />
                </Stack>
              </Box>

              <Box sx={panelSx}>
                <Typography sx={{ fontWeight: 900 }}>นโยบาย badge</Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.creatorPolicy.autoLevelEnabled}
                        onChange={(event) => updatePolicy('autoLevelEnabled', event.target.checked)}
                      />
                    }
                    label="เปิดการปรับ badge อัตโนมัติจากคะแนน"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.creatorPolicy.requireApprovedProfile}
                        onChange={(event) =>
                          updatePolicy('requireApprovedProfile', event.target.checked)
                        }
                      />
                    }
                    label="ต้องเป็น Creator ที่อนุมัติแล้ว"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.creatorPolicy.requireActiveAccount}
                        onChange={(event) =>
                          updatePolicy('requireActiveAccount', event.target.checked)
                        }
                      />
                    }
                    label="ต้องเป็นบัญชีที่เปิดใช้งานอยู่"
                  />
                  <TextField
                    select
                    fullWidth
                    label="Contributor badge ขั้นต่ำที่แสดงหน้า public"
                    value={settings.creatorPolicy.publicBadgeMinLevel}
                    onChange={(event) =>
                      updatePolicy('publicBadgeMinLevel', event.target.value as CreatorLevel)
                    }
                  >
                    {levelOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    type="number"
                    label="คะแนนรวมขั้นต่ำที่แสดง badge"
                    value={settings.creatorPolicy.minScoreToShowBadge}
                    onChange={(event) =>
                      updatePolicy('minScoreToShowBadge', numberValue(event.target.value))
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="แจ้งเตือนเมื่อไม่มีความเคลื่อนไหวเกินกี่วัน"
                    value={settings.creatorPolicy.inactiveWarningDays}
                    onChange={(event) =>
                      updatePolicy('inactiveWarningDays', numberValue(event.target.value))
                    }
                  />
                </Stack>
              </Box>
            </Box>

            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              <Button color="inherit" onClick={() => setSettings(DEFAULT_SETTINGS)}>
                คืนค่าเริ่มต้น
              </Button>
              <LoadingButton variant="contained" loading={isSaving} onClick={saveSettings}>
                บันทึกการตั้งค่า
              </LoadingButton>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

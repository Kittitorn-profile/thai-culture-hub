'use client';

import { useState, useEffect, useCallback } from 'react';

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

type ReviewerLevel = 'junior' | 'senior' | 'expert';

type ReviewerSettings = {
  levelThresholds: {
    seniorMinTrustScore: number;
    seniorMinAccuracyScore: number;
    seniorMinReviewCount: number;
    expertMinTrustScore: number;
    expertMinAccuracyScore: number;
    expertMinReviewCount: number;
  };
  scoringWeights: {
    trustScore: number;
    accuracyScore: number;
    approvalConsistency: number;
    reviewVolume: number;
  };
  reviewPolicy: {
    autoLevelEnabled: boolean;
    requireProofUrls: boolean;
    minVerifiedReviewsForPublish: number;
    allowPublishMinLevel: ReviewerLevel;
    lowTrustWarningScore: number;
    staleReviewDays: number;
  };
};

type SettingsResponse = {
  data?: ReviewerSettings;
  updatedAt?: string;
  needsMigration?: boolean;
  message?: string;
};

const DEFAULT_SETTINGS: ReviewerSettings = {
  levelThresholds: {
    seniorMinTrustScore: 70,
    seniorMinAccuracyScore: 75,
    seniorMinReviewCount: 20,
    expertMinTrustScore: 88,
    expertMinAccuracyScore: 90,
    expertMinReviewCount: 75,
  },
  scoringWeights: {
    trustScore: 40,
    accuracyScore: 35,
    approvalConsistency: 15,
    reviewVolume: 10,
  },
  reviewPolicy: {
    autoLevelEnabled: false,
    requireProofUrls: true,
    minVerifiedReviewsForPublish: 10,
    allowPublishMinLevel: 'senior',
    lowTrustWarningScore: 55,
    staleReviewDays: 30,
  },
};

const levelOptions: Array<{ value: ReviewerLevel; label: string }> = [
  { value: 'junior', label: 'ระดับเริ่มต้น' },
  { value: 'senior', label: 'ระดับชำนาญ' },
  { value: 'expert', label: 'ระดับผู้เชี่ยวชาญ' },
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

function getTotalWeight(settings: ReviewerSettings) {
  return Object.values(settings.scoringWeights).reduce((total, value) => total + Number(value || 0), 0);
}

function LevelPreview({
  title,
  color,
  trustScore,
  accuracyScore,
  reviewCount,
}: {
  title: string;
  color: 'default' | 'primary' | 'success';
  trustScore: number;
  accuracyScore: number;
  reviewCount: number;
}) {
  return (
    <Box sx={panelSx}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" color={color} label={title} variant="soft" />
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
          เกณฑ์ขั้นต่ำสำหรับระดับนี้
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 13 }}>
          ความน่าเชื่อถือ {trustScore.toLocaleString('th-TH')}+
        </Typography>
        <Typography sx={{ fontSize: 13 }}>
          ความแม่นยำ {accuracyScore.toLocaleString('th-TH')}+
        </Typography>
        <Typography sx={{ fontSize: 13 }}>
          จำนวนงานตรวจ {reviewCount.toLocaleString('th-TH')}+
        </Typography>
      </Stack>
    </Box>
  );
}

export function ReviewerSettingsClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [settings, setSettings] = useState<ReviewerSettings>(DEFAULT_SETTINGS);
  const [updatedAt, setUpdatedAt] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const totalWeight = getTotalWeight(settings);

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await adminApiRequest<SettingsResponse>('/api/admin/reviewers/settings', {
        accessToken,
      });

      setSettings(result.data ?? DEFAULT_SETTINGS);
      setUpdatedAt(result.updatedAt ?? '');
      setNeedsMigration(result.needsMigration === true);

      if (result.message) {
        setMessage(result.message);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลด setting ไม่สำเร็จ');

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

  const updateLevelThreshold = (
    field: keyof ReviewerSettings['levelThresholds'],
    value: string
  ) => {
    setSettings((current) => ({
      ...current,
      levelThresholds: {
        ...current.levelThresholds,
        [field]: numberValue(value),
      },
    }));
  };

  const updateWeight = (field: keyof ReviewerSettings['scoringWeights'], value: string) => {
    setSettings((current) => ({
      ...current,
      scoringWeights: {
        ...current.scoringWeights,
        [field]: numberValue(value),
      },
    }));
  };

  const updatePolicy = (
    field: keyof ReviewerSettings['reviewPolicy'],
    value: string | number | boolean
  ) => {
    setSettings((current) => ({
      ...current,
      reviewPolicy: {
        ...current.reviewPolicy,
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
      const result = await adminApiRequest<SettingsResponse>('/api/admin/reviewers/settings', {
        method: 'PUT',
        accessToken,
        body: { settings },
      });

      setSettings(result.data ?? settings);
      setUpdatedAt(result.updatedAt ?? '');
      setNeedsMigration(false);
      setMessage('บันทึกการตั้งค่าผู้ตรวจสอบแล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              ตั้งค่าผู้ตรวจสอบ
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตั้งค่าเกณฑ์คะแนนสำหรับกำหนดระดับ และนโยบายที่เกี่ยวข้องกับผู้ตรวจสอบ
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              component={RouterLink}
              href="/admin/reviewers"
              variant="outlined"
              startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
            >
              รายชื่อผู้ตรวจสอบ
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
        {isLoading && <Alert severity="info">กำลังโหลดการตั้งค่าผู้ตรวจสอบ...</Alert>}

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  เกณฑ์กำหนดระดับ
                </Typography>
                <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                  ผู้ตรวจสอบจะผ่านระดับชำนาญหรือผู้เชี่ยวชาญเมื่อตัวเลขถึงทุกเกณฑ์ขั้นต่ำ
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
              <Box sx={panelSx}>
                <Typography sx={{ mb: 2, fontWeight: 900 }}>ระดับเริ่มต้น</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ค่าเริ่มต้นสำหรับผู้ตรวจสอบใหม่ หรือผู้ตรวจสอบที่ยังไม่ผ่านเกณฑ์ระดับชำนาญ
                </Typography>
              </Box>

              <Box sx={panelSx}>
                <Typography sx={{ mb: 2, fontWeight: 900 }}>เกณฑ์ระดับชำนาญ</Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="คะแนนความน่าเชื่อถือขั้นต่ำ"
                    value={settings.levelThresholds.seniorMinTrustScore}
                    onChange={(event) =>
                      updateLevelThreshold('seniorMinTrustScore', event.target.value)
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="คะแนนความแม่นยำขั้นต่ำ"
                    value={settings.levelThresholds.seniorMinAccuracyScore}
                    onChange={(event) =>
                      updateLevelThreshold('seniorMinAccuracyScore', event.target.value)
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="จำนวนงานตรวจขั้นต่ำ"
                    value={settings.levelThresholds.seniorMinReviewCount}
                    onChange={(event) =>
                      updateLevelThreshold('seniorMinReviewCount', event.target.value)
                    }
                  />
                </Stack>
              </Box>

              <Box sx={panelSx}>
                <Typography sx={{ mb: 2, fontWeight: 900 }}>เกณฑ์ระดับผู้เชี่ยวชาญ</Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="คะแนนความน่าเชื่อถือขั้นต่ำ"
                    value={settings.levelThresholds.expertMinTrustScore}
                    onChange={(event) =>
                      updateLevelThreshold('expertMinTrustScore', event.target.value)
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="คะแนนความแม่นยำขั้นต่ำ"
                    value={settings.levelThresholds.expertMinAccuracyScore}
                    onChange={(event) =>
                      updateLevelThreshold('expertMinAccuracyScore', event.target.value)
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="จำนวนงานตรวจขั้นต่ำ"
                    value={settings.levelThresholds.expertMinReviewCount}
                    onChange={(event) =>
                      updateLevelThreshold('expertMinReviewCount', event.target.value)
                    }
                  />
                </Stack>
              </Box>
            </Box>

            <Stack spacing={1.5}>
              <LevelPreview
                title="ระดับชำนาญ"
                color="primary"
                trustScore={settings.levelThresholds.seniorMinTrustScore}
                accuracyScore={settings.levelThresholds.seniorMinAccuracyScore}
                reviewCount={settings.levelThresholds.seniorMinReviewCount}
              />
              <LevelPreview
                title="ระดับผู้เชี่ยวชาญ"
                color="success"
                trustScore={settings.levelThresholds.expertMinTrustScore}
                accuracyScore={settings.levelThresholds.expertMinAccuracyScore}
                reviewCount={settings.levelThresholds.expertMinReviewCount}
              />
            </Stack>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                สูตรคะแนนและนโยบาย
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                กำหนดน้ำหนักของคะแนนและเงื่อนไขการเปิดสิทธิ์ของผู้ตรวจสอบ
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
                    label="น้ำหนักคะแนนความน่าเชื่อถือ"
                    value={settings.scoringWeights.trustScore}
                    onChange={(event) => updateWeight('trustScore', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักคะแนนความแม่นยำ"
                    value={settings.scoringWeights.accuracyScore}
                    onChange={(event) => updateWeight('accuracyScore', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักความสม่ำเสมอในการอนุมัติ"
                    value={settings.scoringWeights.approvalConsistency}
                    onChange={(event) => updateWeight('approvalConsistency', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="น้ำหนักจำนวนงานตรวจ"
                    value={settings.scoringWeights.reviewVolume}
                    onChange={(event) => updateWeight('reviewVolume', event.target.value)}
                  />
                </Stack>
              </Box>

              <Box sx={panelSx}>
                <Typography sx={{ fontWeight: 900 }}>นโยบายผู้ตรวจสอบ</Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.reviewPolicy.autoLevelEnabled}
                        onChange={(event) =>
                          updatePolicy('autoLevelEnabled', event.target.checked)
                        }
                      />
                    }
                    label="เปิดการปรับระดับอัตโนมัติจากคะแนน"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.reviewPolicy.requireProofUrls}
                        onChange={(event) => updatePolicy('requireProofUrls', event.target.checked)}
                      />
                    }
                    label="ต้องมีลิงก์หลักฐาน/คุณวุฒิ"
                  />
                  <TextField
                    select
                    fullWidth
                    label="ระดับขั้นต่ำที่เผยแพร่ได้"
                    value={settings.reviewPolicy.allowPublishMinLevel}
                    onChange={(event) =>
                      updatePolicy('allowPublishMinLevel', event.target.value as ReviewerLevel)
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
                    label="จำนวนงานตรวจขั้นต่ำก่อนเผยแพร่"
                    value={settings.reviewPolicy.minVerifiedReviewsForPublish}
                    onChange={(event) =>
                      updatePolicy(
                        'minVerifiedReviewsForPublish',
                        numberValue(event.target.value)
                      )
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="แจ้งเตือนเมื่อคะแนนความน่าเชื่อถือต่ำกว่า"
                    value={settings.reviewPolicy.lowTrustWarningScore}
                    onChange={(event) =>
                      updatePolicy('lowTrustWarningScore', numberValue(event.target.value))
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="ถือว่าไม่มีความเคลื่อนไหวเมื่อเกินกี่วัน"
                    value={settings.reviewPolicy.staleReviewDays}
                    onChange={(event) =>
                      updatePolicy('staleReviewDays', numberValue(event.target.value))
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

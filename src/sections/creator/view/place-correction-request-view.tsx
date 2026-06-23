'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { Editor } from 'src/components/editor';

import { useThailandDistrictCenters } from 'src/sections/province/thailand-geojson';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const initialForm = {
  name: '',
  district: '',
  lat: '',
  lng: '',
  mapUrl: '',
  imageUrl: '',
  description: '',
  detail: '',
  reason: '',
};

type CorrectionPlaceDetail = {
  id: string;
  name: string;
  district?: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  mapUrl?: string | null;
  imageUrls?: string[] | null;
  provinceCode?: string | null;
  details?: {
    provinceCode?: string | null;
  } | null;
};

function cleanParam(value: string | null) {
  return value?.trim() ?? '';
}

function toDisplayNumber(value?: number | null) {
  return value == null ? '' : `${value}`;
}

export function PlaceCorrectionRequestView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const queryPlaceId = cleanParam(searchParams.get('placeId'));
  const queryProvinceCode = cleanParam(searchParams.get('provinceCode'));
  const [placeDetail, setPlaceDetail] = useState<CorrectionPlaceDetail | null>(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [placeError, setPlaceError] = useState('');
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const placeId = placeDetail?.id ?? queryPlaceId;
  const placeName = placeDetail?.name ?? '';
  const provinceCode =
    placeDetail?.provinceCode ?? placeDetail?.details?.provinceCode ?? queryProvinceCode;
  const currentDistrict = placeDetail?.district ?? '';
  const currentCategory = placeDetail?.category ?? '';
  const currentLat = toDisplayNumber(placeDetail?.lat);
  const currentLng = toDisplayNumber(placeDetail?.lng);
  const currentMapUrl = placeDetail?.mapUrl ?? '';
  const currentImageUrl = placeDetail?.imageUrls?.find(Boolean) ?? '';
  const { data: districtCentersData, isFetching: isLoadingDistricts } =
    useThailandDistrictCenters(provinceCode);
  const districtOptions = useMemo(
    () =>
      Array.from(new Set((districtCentersData?.districts ?? []).map((district) => district.name)))
        .filter(Boolean)
        .sort((firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, 'th')),
    [districtCentersData?.districts]
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!accessToken) {
      const returnTo = window.location.pathname + window.location.search;
      router.replace(`/creator/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!isCreatorUser(user)) {
      router.replace(getRoleHomePath(user));
    }
  }, [accessToken, loading, router, user]);

  useEffect(() => {
    if (!queryPlaceId) {
      setPlaceDetail(null);
      return undefined;
    }

    const controller = new AbortController();

    setIsLoadingPlace(true);
    setPlaceError('');

    const params = new URLSearchParams({ placeId: queryPlaceId });

    if (queryProvinceCode) {
      params.set('provinceCode', queryProvinceCode);
    }

    fetch(`/api/culture/province-places?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          data?: CorrectionPlaceDetail | null;
          message?: string;
        };

        if (!response.ok || !data.data) {
          throw new Error(data.message ?? 'โหลดรายละเอียดสถานที่ไม่สำเร็จ');
        }

        setPlaceDetail(data.data);
      })
      .catch((caughtError) => {
        if (caughtError instanceof Error && caughtError.name === 'AbortError') {
          return;
        }

        setPlaceDetail(null);
        setPlaceError(
          caughtError instanceof Error ? caughtError.message : 'โหลดรายละเอียดสถานที่ไม่สำเร็จ'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingPlace(false);
        }
      });

    return () => controller.abort();
  }, [queryPlaceId, queryProvinceCode]);

  const updateForm = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cancelRequest = () => {
    setForm(initialForm);
    setError('');
    setMessage('');

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(placeId ? `/culture-place/${encodeURIComponent(placeId)}` : '/');
  };

  const submitRequest = async () => {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/creator/place-corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...form,
          placeId,
          placeName,
          provinceCode,
          originalSnapshot: {
            name: placeName,
            category: currentCategory,
            district: currentDistrict,
            lat: currentLat,
            lng: currentLng,
            mapUrl: currentMapUrl,
            imageUrl: currentImageUrl,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? 'ส่งคำขอแก้ไขไม่สำเร็จ');
      }

      setMessage('ส่งคำขอแก้ไขแล้ว รอ admin ตรวจสอบก่อนนำข้อมูลไปใช้งาน');
      setForm(initialForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ส่งคำขอแก้ไขไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 10, md: 12 },
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
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 1100, position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="h3" sx={{ color: creatorTone.text, fontWeight: 950 }}>
            ขอปรับแก้ข้อมูลสถานที่
          </Typography>
          <Typography sx={{ mt: 1, color: creatorTone.muted }}>
            ส่งข้อมูลที่คิดว่าถูกต้องกว่าให้ admin ตรวจสอบ ก่อนอัปเดตข้อมูลบนเว็บไซต์
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {placeError && <Alert severity="error">{placeError}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {!placeId && (
          <Alert severity="warning">ไม่พบรหัสสถานที่ กรุณาเปิดจากหน้ารายละเอียดสถานที่</Alert>
        )}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '340px 1fr' } }}>
          <Card sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(248,246,238,0.94)' }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                ข้อมูลปัจจุบัน
              </Typography>
              {isLoadingPlace && <Alert severity="info">กำลังโหลดรายละเอียดสถานที่...</Alert>}
              {currentImageUrl && (
                <Box
                  component="img"
                  src={currentImageUrl}
                  alt={placeName || 'ภาพสถานที่'}
                  sx={{
                    width: 1,
                    height: 190,
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    bgcolor: 'grey.200',
                  }}
                />
              )}
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Place ID</Typography>
              <Typography sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                {placeId || '-'}
              </Typography>
              <Divider />
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>ชื่อสถานที่</Typography>
              <Typography sx={{ fontWeight: 800 }}>{placeName || '-'}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>อำเภอ / หมวด</Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {currentDistrict || '-'} / {currentCategory || '-'}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>พิกัด</Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {currentLat || '-'}, {currentLng || '-'}
              </Typography>
            </Stack>
          </Card>

          <Card sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, bgcolor: 'rgba(248,246,238,0.94)' }}>
            <Stack spacing={2.25}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                ข้อมูลที่เสนอแก้
              </Typography>
              <TextField
                label="ชื่อสถานที่ใหม่"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
              <Autocomplete
                freeSolo
                fullWidth
                options={districtOptions}
                value={form.district}
                inputValue={form.district}
                loading={isLoadingDistricts}
                disabled={!provinceCode}
                onChange={(_, value) => updateForm('district', value ?? '')}
                onInputChange={(_, value) => updateForm('district', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="อำเภอ"
                    helperText={
                      provinceCode
                        ? 'เลือกจากอำเภอในจังหวัดนี้ หรือพิมพ์เองหากไม่พบในรายการ'
                        : 'ไม่พบจังหวัดของสถานที่นี้'
                    }
                  />
                )}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Latitude"
                  value={form.lat}
                  onChange={(event) => updateForm('lat', event.target.value)}
                />
                <TextField
                  fullWidth
                  label="Longitude"
                  value={form.lng}
                  onChange={(event) => updateForm('lng', event.target.value)}
                />
              </Stack>
              <TextField
                label="Map URL"
                value={form.mapUrl}
                onChange={(event) => updateForm('mapUrl', event.target.value)}
              />
              <TextField
                label="Image URL"
                value={form.imageUrl}
                onChange={(event) => updateForm('imageUrl', event.target.value)}
              />
              <TextField
                multiline
                minRows={3}
                label="คำอธิบาย/สรุปที่ควรแก้"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
              />
              <Box>
                <Typography sx={{ mb: 1, fontWeight: 800, color: 'text.primary' }}>
                  รายละเอียดเพิ่มเติม
                </Typography>
                <Editor
                  fullItem
                  value={form.detail}
                  sx={{ minHeight: 300, bgcolor: 'background.paper' }}
                  onChange={(value) => updateForm('detail', value)}
                  placeholder="ใส่รายละเอียดเพิ่มเติมหรือแหล่งอ้างอิงที่ช่วยยืนยันข้อมูล..."
                />
              </Box>
              <TextField
                multiline
                minRows={3}
                label="เหตุผลหรือแหล่งอ้างอิง"
                value={form.reason}
                onChange={(event) => updateForm('reason', event.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={!placeId || !placeName || isLoadingPlace}
                  loading={isSubmitting}
                  onClick={submitRequest}
                >
                  ส่งคำขอให้ Admin ตรวจสอบ
                </Button>
                <Button
                  size="large"
                  color="inherit"
                  disabled={isSubmitting}
                  onClick={cancelRequest}
                >
                  ยกเลิก
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}

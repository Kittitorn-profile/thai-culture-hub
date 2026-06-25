'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

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

import { Form, RHFUpload, RHFEditor, RHFTextField } from 'src/components/hook-form';

import { useThailandDistrictCenters } from 'src/sections/province/thailand-geojson';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

import { uploadCreatorPlaceCorrectionImage } from '../creator-api';
import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';

const MAX_PLACE_CORRECTION_IMAGE_SIZE = 2 * 1024 * 1024;

type PlaceCorrectionFormValues = {
  name: string;
  district: string;
  lat: string;
  lng: string;
  mapUrl: string;
  imageUrl: string;
  imageFile: File | null;
  description: string;
  detail: string;
  reason: string;
};

const initialForm: PlaceCorrectionFormValues = {
  name: '',
  district: '',
  lat: '',
  lng: '',
  mapUrl: '',
  imageUrl: '',
  imageFile: null,
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
  const methods = useForm<PlaceCorrectionFormValues>({
    defaultValues: initialForm,
  });
  const {
    reset,
    control,
    setValue,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;
  const [placeDetail, setPlaceDetail] = useState<CorrectionPlaceDetail | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [placeError, setPlaceError] = useState('');
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
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
  const watchedImageUrl = watch('imageUrl');
  const watchedImageFile = watch('imageFile');
  const proposedImageUrl = watchedImageUrl.trim();
  const hasProposedImage = Boolean(proposedImageUrl);
  const hasProposedImageFile = watchedImageFile instanceof File;
  const isProposingCoverChange =
    hasProposedImageFile || (hasProposedImage && proposedImageUrl !== currentImageUrl);
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

  const cancelRequest = () => {
    reset(initialForm);
    setError('');
    setMessage('');

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(placeId ? `/culture-place/${encodeURIComponent(placeId)}` : '/');
  };

  const submitRequest = async (values: PlaceCorrectionFormValues) => {
    setError('');
    setMessage('');

    try {
      let imageUrl = values.imageUrl.trim();

      if (values.imageFile instanceof File) {
        const uploadResult = await uploadCreatorPlaceCorrectionImage(
          accessToken,
          values.imageFile,
          placeId
        );

        imageUrl = uploadResult.data.url ?? imageUrl;
      }

      const payloadValues = { ...values, imageFile: undefined };
      const response = await fetch('/api/creator/place-corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...payloadValues,
          imageUrl,
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
      reset(initialForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ส่งคำขอแก้ไขไม่สำเร็จ');
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

              <Box>
                <Typography sx={{ mb: 0.75, color: 'text.secondary', fontSize: 12 }}>
                  ภาพปัจจุบัน
                </Typography>
                <Box
                  sx={{
                    height: 170,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'grey.200',
                    border: '1px solid rgba(32,42,43,0.08)',
                  }}
                >
                  {currentImageUrl ? (
                    <Box
                      component="img"
                      src={currentImageUrl}
                      alt={placeName || 'ภาพปัจจุบัน'}
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      ยังไม่มีภาพปก
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Place ID</Typography> */}
              {/* <Typography sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                {placeId || '-'}
              </Typography> */}
              <Divider />
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>ชื่อสถานที่</Typography>
              <Typography sx={{ fontWeight: 800 }} variant="h6">
                {placeName || '-'}
              </Typography>
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
            <Form methods={methods} onSubmit={handleSubmit(submitRequest)}>
              <Stack spacing={2.25}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  ข้อมูลที่เสนอแก้
                </Typography>
                <RHFTextField name="name" label="ชื่อสถานที่ใหม่" />
                <Controller
                  name="district"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      freeSolo
                      fullWidth
                      options={districtOptions}
                      value={field.value}
                      inputValue={field.value}
                      loading={isLoadingDistricts}
                      disabled={!provinceCode}
                      onChange={(_, value) => field.onChange(value ?? '')}
                      onInputChange={(_, value) => field.onChange(value)}
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
                  )}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <RHFTextField fullWidth name="lat" label="Latitude" />
                  <RHFTextField fullWidth name="lng" label="Longitude" />
                </Stack>
                <RHFTextField name="mapUrl" label="Map URL" />
                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.72)',
                    border: '1px solid rgba(32,42,43,0.1)',
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>
                          ภาพปกสถานที่
                        </Typography>
                        <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
                          วาง URL รูปภาพใหม่เพื่อเสนอให้ Admin เปลี่ยนภาพปก
                        </Typography>
                      </Box>
                      {currentImageUrl && (
                        <Button
                          size="small"
                          color="inherit"
                          disabled={watchedImageUrl === currentImageUrl}
                          onClick={() =>
                            setValue('imageUrl', currentImageUrl, { shouldDirty: true })
                          }
                        >
                          ใช้ภาพปัจจุบัน
                        </Button>
                      )}
                    </Stack>

                    <RHFTextField
                      name="imageUrl"
                      label="URL ภาพปกใหม่"
                      helperText={
                        isProposingCoverChange
                          ? 'คำขอนี้จะเสนอเปลี่ยนภาพปกของสถานที่'
                          : 'ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนภาพปก'
                      }
                    />

                    <Stack spacing={1}>
                      <RHFUpload
                        name="imageFile"
                        maxSize={MAX_PLACE_CORRECTION_IMAGE_SIZE}
                        helperText="หรือวาง/เลือกไฟล์รูปภาพใหม่ ขนาดไม่เกิน 2 MB ระบบจะอัปโหลดหลังจากกดส่งคำขอ"
                        onDelete={() => {
                          setValue('imageFile', null, { shouldValidate: true, shouldDirty: true });
                        }}
                        slotProps={{
                          wrapper: {
                            sx: {
                              '& .upload__default': {
                                minHeight: 180,
                              },
                            },
                          },
                        }}
                      />
                      {hasProposedImageFile && (
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          หากมีทั้งไฟล์และ URL ระบบจะใช้ไฟล์ที่อัปโหลดเป็นภาพที่เสนอ
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Box>
                <RHFTextField
                  name="description"
                  multiline
                  minRows={3}
                  label="คำอธิบาย/สรุปที่ควรแก้"
                />
                <Box>
                  <Typography sx={{ mb: 1, fontWeight: 800, color: 'text.primary' }}>
                    รายละเอียดเพิ่มเติม
                  </Typography>
                  <RHFEditor
                    name="detail"
                    fullItem
                    sx={{ minHeight: 300, bgcolor: 'background.paper' }}
                    placeholder="ใส่รายละเอียดเพิ่มเติมหรือแหล่งอ้างอิงที่ช่วยยืนยันข้อมูล..."
                  />
                </Box>
                <RHFTextField name="reason" multiline minRows={3} label="เหตุผลหรือแหล่งอ้างอิง" />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={!placeId || !placeName || isLoadingPlace || isSubmitting}
                    loading={isSubmitting}
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
            </Form>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}

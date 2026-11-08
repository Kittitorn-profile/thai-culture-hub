'use client';

import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';

import {
  Box,
  Card,
  Chip,
  Alert,
  Stack,
  Button,
  Container,
  TextField,
  Typography,
} from '@mui/material';

import { adminApiRequest } from 'src/lib/admin-api';
import { resizeImageFile } from 'src/app/admin/home-content/performance-groups/resize-image-file';
import {
  getContributionGroup,
  getContributionLabel,
  getCorrectionFieldLabels,
} from 'src/lib/contribution-corrections';
import {
  type CraftEdit,
  type CraftImage,
  MAX_CRAFT_IMAGES,
  craftSubmissionSchema,
} from 'src/lib/craft-corrections';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

type Response = {
  item: { title: string; values: CraftEdit; revision: string | null; sourceUrls: string[] };
  requests: { id: string; status: string; created_at: string; review_note: string }[];
};
const statuses: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};
export default function CraftCorrectionView() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const recordId = useSearchParams().get('recordId') ?? '';
  const fieldLabels = getCorrectionFieldLabels(recordId);
  const token = user?.accessToken ?? user?.access_token ?? '';
  const [images, setImages] = useState<CraftImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const { register, reset, handleSubmit } = useForm<CraftEdit & { reason: string }>();
  useEffect(() => {
    if (loading) return;
    if (!token)
      router.replace(
        `/creator/sign-in?returnTo=${encodeURIComponent(`/creator/contributions/edit/?recordId=${encodeURIComponent(recordId)}`)}`
      );
    else if (!isCreatorUser(user)) router.replace(getRoleHomePath(user));
  }, [loading, token, user, router, recordId]);
  const query = useQuery({
    queryKey: ['craft-correction', recordId, user?.id],
    enabled: !!token && isCreatorUser(user),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () =>
      adminApiRequest<Response>(
        `/api/creator/contributions/edit/?recordId=${encodeURIComponent(recordId)}`,
        { accessToken: token }
      ),
    retry: false,
  });
  useEffect(() => {
    if (query.data) {
      reset({ ...query.data.item.values, reason: '' });
      setImages(query.data.item.values.images ?? []);
    }
  }, [query.data, reset]);
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminApiRequest('/api/creator/craft-corrections/', {
        accessToken: token,
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      setMessage('ส่งข้อเสนอแล้ว ข้อมูลจะเผยแพร่หลังแอดมินอนุมัติ');
      void query.refetch();
    },
  });
  const busy = uploading || mutation.isPending;
  const uploadImages = async (files: File[]) => {
    if (!files.length || busy) return;
    if (images.length + files.length > MAX_CRAFT_IMAGES) {
      setValidationError(`เพิ่มได้สูงสุด ${MAX_CRAFT_IMAGES} ภาพ`);
      return;
    }
    setUploading(true);
    setMessage('');
    setValidationError('');
    try {
      for (const file of files) {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 20 * 1024 * 1024
        )
          throw new Error('รองรับ JPG, PNG และ WebP ไม่เกิน 20 MB ต่อภาพ');
        const resized = await resizeImageFile(file);
        const body = new FormData();
        body.append('file', resized);
        body.append('recordId', recordId);
        const result = await adminApiRequest<{ data: { url: string } }>(
          '/api/creator/craft-corrections/upload/',
          { accessToken: token, method: 'POST', body }
        );
        setImages((current) => [...current, { url: result.data.url, caption: '', credit: '' }]);
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };
  return (
    <Container
      maxWidth={false}
      sx={{ maxWidth: 1408, px: { xs: 2.5, sm: 4, md: 6, lg: 8 }, py: { xs: 3, md: 5 } }}
    >
      <Stack spacing={3}>
        <Button
          component="a"
          href="/creator/contributions/"
          sx={{ alignSelf: 'flex-start', px: 0 }}
        >
          ← กลับไปร่วมพัฒนาข้อมูล
        </Button>
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 600 }}>
            เสนอแก้ไข / เพิ่มเติมข้อมูล
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            ช่วยเติมข้อมูลและภาพประกอบให้สมบูรณ์ ทีมงานจะตรวจสอบก่อนเผยแพร่
          </Typography>
        </Box>
        {(loading || query.isLoading) && <Typography role="status">กำลังโหลดข้อมูล…</Typography>}
        {query.error && <Alert severity="error">{query.error.message}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {validationError && <Alert severity="error">{validationError}</Alert>}
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {query.data && (
          <Box
            component="form"
            onSubmit={handleSubmit((values) => {
              const parsed = craftSubmissionSchema.safeParse({
                recordId,
                values: { ...values, images },
                reason: values.reason,
                revision: query.data.item.revision,
              });
              if (!parsed.success) {
                setMessage('');
                mutation.reset();
                setValidationError(parsed.error.issues[0]?.message ?? 'กรุณาตรวจข้อมูล');
                return;
              }
              setMessage('');
              setValidationError('');
              mutation.mutate(parsed.data);
            })}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              <Card sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={getContributionLabel(getContributionGroup(recordId))}
                      sx={{ mb: 1.5 }}
                    />
                    <Typography variant="overline" color="text.secondary" display="block">
                      รายการที่เสนอแก้ไข
                    </Typography>
                    <Typography component="h2" variant="h5">
                      {query.data.item.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2.5,
                    }}
                  >
                    {(
                      Object.keys(fieldLabels).filter((key) => key !== 'images') as Exclude<
                        keyof CraftEdit,
                        'images'
                      >[]
                    ).map((key) => (
                      <TextField
                        key={key}
                        label={fieldLabels[key]}
                        {...register(key)}
                        disabled={busy}
                        multiline={key !== 'referenceUrl'}
                        minRows={key === 'description' ? 4 : key === 'referenceUrl' ? undefined : 2}
                        sx={{
                          gridColumn:
                            key === 'practice' || key === 'technique' ? undefined : '1 / -1',
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    ))}
                  </Box>
                </Stack>
              </Card>
              <Card sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography component="h2" variant="h6">
                      ภาพประกอบ
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${images.length} / ${MAX_CRAFT_IMAGES} ภาพ`}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    อัปโหลดเฉพาะภาพที่คุณมีสิทธิ์ใช้ พร้อมระบุคำอธิบายและเจ้าของภาพ
                    ภาพแรกใช้เป็นภาพหลักหลังอนุมัติ
                  </Typography>
                  <Box
                    sx={{
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.neutral',
                      p: 3,
                      textAlign: 'center',
                    }}
                  >
                    <Button
                      component="label"
                      variant="outlined"
                      disabled={busy || images.length >= MAX_CRAFT_IMAGES}
                    >
                      {uploading ? 'กำลังอัปโหลด…' : 'เลือกภาพ (เลือกได้หลายไฟล์)'}
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy || images.length >= MAX_CRAFT_IMAGES}
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          event.target.value = '';
                          void uploadImages(files);
                        }}
                      />
                    </Button>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      JPG, PNG, WebP · ไม่เกิน 20 MB ต่อภาพ · ระบบย่อก่อนอัปโหลด
                    </Typography>
                  </Box>
                  {images.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      ยังไม่มีภาพประกอบ เพิ่มภาพบุคคล ผลงาน
                      หรือรายละเอียดที่เกี่ยวข้องกับรายการนี้ได้
                    </Typography>
                  )}
                  {images.map((image, index) => (
                    <Box
                      key={image.url + index}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
                        gap: 2,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        component="img"
                        src={image.url}
                        alt={image.caption || `ภาพประกอบ ${index + 1}`}
                        sx={{
                          width: 1,
                          height: 150,
                          objectFit: 'contain',
                          borderRadius: 1,
                          bgcolor: '#f1f3ee',
                        }}
                      />
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2">
                          ภาพที่ {index + 1}
                          {index === 0 ? ' · ภาพหลัก' : ''}
                        </Typography>
                        <TextField
                          size="small"
                          label="คำอธิบายภาพ"
                          value={image.caption}
                          disabled={busy}
                          onChange={(event) =>
                            setImages((current) =>
                              current.map((row, i) =>
                                i === index ? { ...row, caption: event.target.value } : row
                              )
                            )
                          }
                          slotProps={{ htmlInput: { maxLength: 300 } }}
                        />
                        <TextField
                          size="small"
                          label="เจ้าของภาพ / เครดิต"
                          value={image.credit}
                          disabled={busy}
                          onChange={(event) =>
                            setImages((current) =>
                              current.map((row, i) =>
                                i === index ? { ...row, credit: event.target.value } : row
                              )
                            )
                          }
                          slotProps={{ htmlInput: { maxLength: 300 } }}
                        />
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          <Button
                            size="small"
                            disabled={busy || index === 0}
                            onClick={() =>
                              setImages((current) => [
                                current[index],
                                ...current.filter((_, i) => i !== index),
                              ])
                            }
                          >
                            ใช้เป็นภาพหลัก
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            disabled={busy}
                            onClick={() =>
                              setImages((current) => current.filter((_, i) => i !== index))
                            }
                            aria-label={`นำภาพที่ ${index + 1} ออกจากข้อเสนอ`}
                          >
                            นำออก
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Card>
              <Card sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h6">
                    เหตุผลและหลักฐาน
                  </Typography>
                  <TextField
                    label="เหตุผล / ข้อมูลที่เพิ่มเติม"
                    {...register('reason')}
                    required
                    disabled={busy}
                    multiline
                    minRows={3}
                    helperText="สรุปสิ่งที่แก้ไข พร้อมหลักฐานหรือที่มาของข้อมูลและภาพ"
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 3000 } }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={busy || query.isFetching}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {mutation.isPending ? 'กำลังส่ง…' : 'ส่งให้แอดมินตรวจสอบ'}
                  </Button>
                </Stack>
              </Card>
            </Stack>
            <Stack
              component="aside"
              spacing={2.5}
              sx={{ position: { md: 'sticky' }, top: { md: 112 } }}
            >
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle1">แหล่งข้อมูลเดิม</Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {query.data.item.sourceUrls
                    .filter((url) => /^https?:\/\//i.test(url))
                    .map((url, index) => (
                      <Button
                        key={url}
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        แหล่งข้อมูล {index + 1} ↗
                      </Button>
                    ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>
                  ข้อเสนอและภาพจะยังไม่เปลี่ยนข้อมูลสาธารณะ จนกว่าทีมงานอนุมัติ
                </Typography>
              </Card>
              <Card sx={{ p: 2.5 }}>
                <Typography component="h2" variant="subtitle1" sx={{ mb: 2 }}>
                  ข้อเสนอของคุณ
                </Typography>
                <Stack spacing={2}>
                  {query.data.requests.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      ยังไม่มีข้อเสนอสำหรับรายการนี้
                    </Typography>
                  )}
                  {query.data.requests.map((request) => (
                    <Box key={request.id}>
                      <Chip
                        size="small"
                        label={statuses[request.status]}
                        color={
                          request.status === 'approved'
                            ? 'success'
                            : request.status === 'rejected'
                              ? 'error'
                              : 'default'
                        }
                      />
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 0.75 }}
                      >
                        {new Date(request.created_at).toLocaleString('th-TH')}
                      </Typography>
                      {request.review_note && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          ความเห็นแอดมิน: {request.review_note}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Stack>
          </Box>
        )}
      </Stack>
    </Container>
  );
}

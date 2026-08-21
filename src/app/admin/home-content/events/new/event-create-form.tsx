'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { Form, Field, RHFEditor } from 'src/components/hook-form';

import { DEFAULT_CONTEST_RESULT_OPTIONS } from 'src/sections/events/event-contest-options';

import { useAuthContext } from 'src/auth/hooks';

import { ImageDropUpload } from '../../performance-groups/image-drop-upload';
import {
  type GroupsContent,
  type HomeContentResponse,
  SECTION_KEY as PERFORMANCE_GROUPS_SECTION_KEY,
  normalizeContent as normalizePerformanceGroupsContent,
} from '../../performance-groups/performance-groups-data';

const EventSchema = zod
  .object({
    title: zod.string().trim().min(1, 'กรุณากรอกชื่อกิจกรรม'),
    description: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    time: zod.string(),
    provinceCode: zod.string(),
    location: zod.string(),
    organizer: zod.string(),
    mediaUrl: zod.string(),
    coverUrl: zod.string(),
    logoUrl: zod.string(),
    imageUrls: zod.array(zod.string()).max(10, 'เพิ่มรูปได้สูงสุด 10 ภาพ'),
    mediaType: zod.enum(['image', 'video']),
    sourceLabel: zod.string(),
    sourceUrl: zod.string(),
    note: zod.string(),
    backgroundColor: zod.string().regex(/^#[0-9a-fA-F]{6}$/, 'กรุณาระบุ Hex Code เช่น #6F8790'),
    isFeatured: zod.boolean(),
    isContest: zod.boolean(),
    contestCategories: zod.array(
      zod.object({
        id: zod.string(),
        name: zod.string().trim().min(1, 'กรุณากรอกชื่อประเภท'),
        maxParticipants: zod.number().min(0),
      })
    ),
    contestResultOptions: zod.array(
      zod.object({
        id: zod.string(),
        name: zod.string().trim().min(1, 'กรุณากรอกชื่อผลหรือรางวัล'),
      })
    ),
    isActive: zod.boolean(),
  })
  .refine((values) => values.isFeatured || values.startsAt, {
    path: ['startsAt'],
    message: 'กรุณาเลือกวันที่เริ่ม',
  })
  .refine((values) => values.isFeatured || values.provinceCode, {
    path: ['provinceCode'],
    message: 'กรุณาเลือกจังหวัด',
  })
  .refine((values) => !values.startsAt || !values.endsAt || values.endsAt >= values.startsAt, {
    path: ['endsAt'],
    message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม',
  });

type EventValues = zod.infer<typeof EventSchema>;

const DEFAULT_VALUES: EventValues = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  time: '',
  provinceCode: '',
  location: '',
  organizer: '',
  mediaUrl: '',
  coverUrl: '',
  logoUrl: '',
  imageUrls: [],
  mediaType: 'image',
  sourceLabel: '',
  sourceUrl: '',
  note: '',
  backgroundColor: '#6f8790',
  isFeatured: false,
  isContest: false,
  contestCategories: [],
  contestResultOptions: DEFAULT_CONTEST_RESULT_OPTIONS.map((option) => ({ ...option })),
  isActive: true,
};

function toTimePickerValue(value?: string) {
  if (!value) return '';
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.toISOString();
  const match = value.match(/(\d{1,2}):(\d{2})/);

  return match
    ? dayjs().hour(Number(match[1])).minute(Number(match[2])).second(0).toISOString()
    : '';
}

function toTimeLabel(value: string) {
  const parsed = dayjs(value);

  return parsed.isValid() ? `${parsed.format('HH:mm')} น.` : value;
}

type EventApiItem = EventValues & {
  id: string;
  sortOrder?: number;
  source?: string;
  sourceEventId?: string;
  syncedAt?: string;
};

export function EventCreateForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const methods = useForm<EventValues>({
    resolver: zodResolver(EventSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { watch, handleSubmit, setValue, reset, formState } = methods;
  const values = watch();
  const [eventItem, setEventItem] = useState<EventApiItem | null>(null);
  const [performanceGroupsContent, setPerformanceGroupsContent] = useState<GroupsContent | null>(
    null
  );
  const [error, setError] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState<'cover' | 'gallery' | 'logo' | ''>('');
  const isEditing = Boolean(eventId);

  useEffect(() => {
    if (!eventId || !accessToken) return () => undefined;
    const controller = new AbortController();

    adminApiRequest<{ data?: EventApiItem | null }>(
      `/api/admin/events?id=${encodeURIComponent(eventId)}`,
      { accessToken, signal: controller.signal }
    )
      .then((response) => {
        if (!response.data) {
          setError('ไม่พบกิจกรรมที่ต้องการแก้ไข');
          return;
        }
        setEventItem(response.data);
        reset({
          ...DEFAULT_VALUES,
          ...response.data,
          time: toTimePickerValue(response.data.time),
          backgroundColor: response.data.backgroundColor || '#6f8790',
        });
      })
      .catch((caught) => {
        if (caught instanceof Error && caught.name !== 'AbortError') setError(caught.message);
      });

    return () => controller.abort();
  }, [accessToken, eventId, reset]);

  useEffect(() => {
    if (!eventId || !accessToken) return () => undefined;
    const controller = new AbortController();

    adminApiRequest<HomeContentResponse>(
      `/api/admin/home-content?sectionKey=${PERFORMANCE_GROUPS_SECTION_KEY}`,
      { accessToken, signal: controller.signal }
    )
      .then((response) =>
        setPerformanceGroupsContent(normalizePerformanceGroupsContent(response.data?.content))
      )
      .catch((caught) => {
        if (caught instanceof Error && caught.name !== 'AbortError') setError(caught.message);
      });

    return () => controller.abort();
  }, [accessToken, eventId]);

  const submit = handleSubmit(async (formValues) => {
    const province = provinces.find((item) => item.code === formValues.provinceCode);

    setError('');
    try {
      await adminApiRequest('/api/admin/events', {
        method: 'POST',
        accessToken,
        body: {
          ...formValues,
          time: toTimeLabel(formValues.time),
          id: eventId,
          provinceName: province?.name ?? '',
          sortOrder: eventItem?.sortOrder ?? 0,
          source: eventItem?.source ?? 'manual',
          sourceEventId: eventItem?.sourceEventId ?? '',
          syncedAt: eventItem?.syncedAt ?? '',
        },
      });

      if (eventId && performanceGroupsContent) {
        const validResultIds = new Set(formValues.contestResultOptions.map((item) => item.id));
        const syncedPerformanceGroupsContent = {
          ...performanceGroupsContent,
          groups: performanceGroupsContent.groups.map((group) => ({
            ...group,
            yearlyData: group.yearlyData.map((record) => {
              if (!record.contestEventIds.includes(eventId)) return record;

              const categoryIds = record.contestCategoryIds[eventId] ?? [];
              const matchedCategoryIds = categoryIds.flatMap((categoryId) => {
                const matchedCategory = formValues.contestCategories.find(
                  (category) =>
                    category.id === categoryId ||
                    category.name.trim().toLocaleLowerCase('th') ===
                      categoryId.trim().toLocaleLowerCase('th')
                );
                return matchedCategory ? [matchedCategory.id] : [];
              });
              return {
                ...record,
                contestCategoryIds: {
                  ...record.contestCategoryIds,
                  [eventId]:
                    matchedCategoryIds.length > 0
                      ? matchedCategoryIds
                      : formValues.contestCategories.length === 1
                        ? [formValues.contestCategories[0].id]
                        : [],
                },
                contestResultIds: {
                  ...record.contestResultIds,
                  [eventId]: (record.contestResultIds[eventId] ?? []).filter((resultId) =>
                    validResultIds.has(resultId)
                  ),
                },
              };
            }),
          })),
        };

        await adminApiRequest('/api/admin/home-content', {
          method: 'PUT',
          accessToken,
          body: {
            sectionKey: PERFORMANCE_GROUPS_SECTION_KEY,
            content: syncedPerformanceGroupsContent,
          },
        });
      }

      router.push('/admin/home-content/events');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'บันทึกกิจกรรมไม่สำเร็จ');
    }
  });

  const participantRecords = (performanceGroupsContent?.groups ?? []).flatMap((group) =>
    group.yearlyData.flatMap((record, yearIndex) =>
      record.contestEventIds.includes(eventId ?? '') ? [{ group, record, yearIndex }] : []
    )
  );

  function updateParticipantRecord(
    groupId: string,
    yearIndex: number,
    updates: { categoryIds?: string[]; resultIds?: string[] }
  ) {
    if (!eventId) return;

    setPerformanceGroupsContent((current) => {
      if (!current) return current;

      return {
        ...current,
        groups: current.groups.map((group) => {
          if (group.id !== groupId) return group;

          return {
            ...group,
            yearlyData: group.yearlyData.map((record, index) =>
              index === yearIndex
                ? {
                    ...record,
                    contestCategoryIds: {
                      ...record.contestCategoryIds,
                      ...(updates.categoryIds !== undefined
                        ? { [eventId]: updates.categoryIds }
                        : {}),
                    },
                    contestResultIds: {
                      ...record.contestResultIds,
                      ...(updates.resultIds !== undefined ? { [eventId]: updates.resultIds } : {}),
                    },
                  }
                : record
            ),
          };
        }),
      };
    });
  }

  async function uploadImage(file?: File, target: 'cover' | 'logo' = 'cover') {
    if (!file) return;
    setUploadingTarget(target);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await adminApiRequest<{ data?: { url?: string } }>(
        '/api/admin/events/upload',
        {
          method: 'POST',
          accessToken,
          body,
        }
      );
      const url = response.data?.url;
      if (url) {
        if (target === 'logo') setValue('logoUrl', url);
        else {
          setValue('coverUrl', url);
          if (values.mediaType === 'image') setValue('mediaUrl', url);
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploadingTarget('');
    }
  }

  async function uploadGallery(files: File[]) {
    const remaining = 10 - values.imageUrls.length;
    const selectedFiles = files.slice(0, remaining);
    if (!selectedFiles.length) return;
    setUploadingTarget('gallery');
    setError('');
    try {
      const urls = await Promise.all(
        selectedFiles.map(async (file) => {
          const body = new FormData();
          body.append('file', file);
          const response = await adminApiRequest<{ data?: { url?: string } }>(
            '/api/admin/events/upload',
            { method: 'POST', accessToken, body }
          );
          return response.data?.url ?? '';
        })
      );
      setValue('imageUrls', [...values.imageUrls, ...urls.filter(Boolean)].slice(0, 10), {
        shouldValidate: true,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'อัปโหลดรูปกิจกรรมไม่สำเร็จ');
    } finally {
      setUploadingTarget('');
    }
  }

  return (
    <DashboardContent maxWidth="lg">
      <Form methods={methods} onSubmit={submit}>
        <Stack spacing={3}>
          <Card
            sx={{
              p: { xs: 2.5, md: 4 },
              color: 'common.white',
              background: `linear-gradient(135deg, ${values.backgroundColor || '#6f8790'}, #263635)`,
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.14)',
                  }}
                >
                  <Iconify icon="solar:calendar-date-bold" width={30} />
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900 }}>
                    {isEditing ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
                  </Typography>
                  <Typography sx={{ opacity: 0.76 }}>
                    {isEditing
                      ? `กิจกรรม • ${values.title || 'กำลังโหลดข้อมูล...'}`
                      : 'สร้างข้อมูลกิจกรรมสำหรับแสดงบนหน้าเว็บ'}
                  </Typography>
                </Box>
              </Stack>
              <Box>
                <Button
                  color="inherit"
                  variant="outlined"
                  onClick={() => router.back()}
                  sx={{
                    alignSelf: { sm: 'center' },
                    borderColor: 'rgba(255,255,255,0.45)',
                  }}
                >
                  กลับหน้ารายการ
                </Button>
              </Box>
            </Stack>
          </Card>

          {error && <Alert severity="error">{error}</Alert>}
          {formState.errors.root?.message && (
            <Alert severity="error">{formState.errors.root.message}</Alert>
          )}

          <Card sx={{ overflow: 'hidden' }}>
            <FormSectionHeader
              step="01"
              icon="solar:file-text-bold"
              title="ข้อมูลหลัก"
              description="ชื่อ รายละเอียด วันเวลา และสถานที่จัดกิจกรรม"
            />
            <Box sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={3}>
                <Field.Text name="title" label="ชื่อกิจกรรม" required />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    รายละเอียดกิจกรรม
                  </Typography>
                  <RHFEditor
                    name="description"
                    placeholder="เขียนรายละเอียด ไฮไลต์ กำหนดการ และข้อมูลสำคัญของกิจกรรม"
                    helperText="รองรับการจัดรูปแบบข้อความ หัวข้อ รายการ และลิงก์"
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.DatePicker
                    name="startsAt"
                    label="วันที่เริ่ม"
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <Field.DatePicker
                    name="endsAt"
                    label="วันที่สิ้นสุด"
                    format="DD/MM/YYYY"
                    minDate={values.startsAt ? dayjs(values.startsAt) : undefined}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <Field.TimePicker
                    name="time"
                    label="เวลา"
                    ampm={false}
                    format="HH:mm"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <Field.Select name="provinceCode" label="จังหวัด">
                    <MenuItem value="">เลือกจังหวัด</MenuItem>
                    {provinces.map((province) => (
                      <MenuItem key={province.code} value={province.code}>
                        {province.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                  <Field.Text name="location" label="สถานที่" />
                  <Field.Text name="organizer" label="ผู้จัด" />
                </Box>
              </Stack>
            </Box>
          </Card>

          <Card sx={{ overflow: 'hidden' }}>
            <FormSectionHeader
              step="02"
              icon="solar:camera-add-bold"
              title="สื่อและหน้ารายละเอียด"
              description="โลโก้ ภาพปก สีพื้นหลัง และแหล่งที่มาของข้อมูล"
            />
            <Box sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    โลโก้กิจกรรม (1:1)
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                  >
                    <ImageDropUpload
                      imageUrl={values.logoUrl}
                      alt="โลโก้กิจกรรม"
                      size={160}
                      aspectRatio="1 / 1"
                      uploading={uploadingTarget === 'logo'}
                      onFile={(file) => uploadImage(file, 'logo')}
                    />
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        ลากภาพมาวาง หรือคลิกเพื่อเลือกไฟล์
                      </Typography>
                      {values.logoUrl && (
                        <Button color="error" onClick={() => setValue('logoUrl', '')}>
                          ลบโลโก้
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>
                <Field.Select name="mediaType" label="ประเภทสื่อ">
                  <MenuItem value="image">ภาพ</MenuItem>
                  <MenuItem value="video">วิดีโอ</MenuItem>
                </Field.Select>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {values.mediaType === 'video' ? 'ภาพปกวิดีโอ' : 'ภาพกิจกรรม'}
                  </Typography>
                  <ImageDropUpload
                    imageUrl={values.coverUrl}
                    alt="ภาพปกกิจกรรม"
                    size="100%"
                    aspectRatio="16 / 9"
                    uploading={uploadingTarget === 'cover'}
                    onFile={(file) => uploadImage(file)}
                  />
                  {values.coverUrl && (
                    <Button
                      color="error"
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => {
                        setValue('coverUrl', '');
                        if (values.mediaType === 'image') setValue('mediaUrl', '');
                      }}
                    >
                      ลบภาพ
                    </Button>
                  )}
                </Box>
                {values.mediaType === 'video' && (
                  <Field.Text
                    name="mediaUrl"
                    label="ลิงก์วิดีโอ"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                )}
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                        ภาพกิจกรรมเพิ่มเติม
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        สูงสุด 10 ภาพ · เพิ่มแล้ว {values.imageUrls.length} ภาพ
                      </Typography>
                    </Box>
                  </Stack>
                  <Box
                    component="label"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      uploadGallery(Array.from(event.dataTransfer.files));
                    }}
                    sx={{
                      p: 3,
                      display: 'grid',
                      placeItems: 'center',
                      textAlign: 'center',
                      cursor: values.imageUrls.length >= 10 ? 'not-allowed' : 'pointer',
                      borderRadius: 2,
                      border: '2px dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Iconify
                      icon="solar:camera-add-bold"
                      width={34}
                      sx={{ mb: 1, color: 'text.secondary' }}
                    />
                    <Typography sx={{ fontWeight: 800 }}>
                      {uploadingTarget === 'gallery'
                        ? 'กำลังอัปโหลด...'
                        : values.imageUrls.length >= 10
                          ? 'ครบ 10 ภาพแล้ว'
                          : 'วางหลายภาพที่นี่ หรือคลิกเลือกไฟล์'}
                    </Typography>
                    <input
                      hidden
                      multiple
                      type="file"
                      accept="image/*"
                      disabled={values.imageUrls.length >= 10 || uploadingTarget === 'gallery'}
                      onChange={(event) => uploadGallery(Array.from(event.target.files ?? []))}
                    />
                  </Box>
                  {values.imageUrls.length > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)',
                          md: 'repeat(5, 1fr)',
                        },
                      }}
                    >
                      {values.imageUrls.map((imageUrl, imageIndex) => (
                        <Box key={`${imageUrl}-${imageIndex}`} sx={{ position: 'relative' }}>
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={`ภาพกิจกรรม ${imageIndex + 1}`}
                            sx={{
                              width: 1,
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              borderRadius: 1.5,
                            }}
                          />
                          <Button
                            color="error"
                            size="small"
                            onClick={() =>
                              setValue(
                                'imageUrls',
                                values.imageUrls.filter((_, index) => index !== imageIndex)
                              )
                            }
                            sx={{ mt: 0.5, minWidth: 0 }}
                          >
                            ลบ
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 900 }}>
                    สีพื้นหลังหน้า Detail
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    เลือกสีหรือกรอก Hex Code ได้โดยตรง
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                  >
                    <Field.Text
                      name="backgroundColor"
                      label="เลือกสี"
                      type="color"
                      sx={{ width: 120, flexShrink: 0 }}
                    />
                    <Field.Text
                      fullWidth
                      name="backgroundColor"
                      label="Hex Code สีพื้นหลัง"
                      placeholder="#6F8790"
                      slotProps={{ htmlInput: { maxLength: 7 } }}
                    />
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        bgcolor: /^#[0-9a-fA-F]{6}$/.test(values.backgroundColor)
                          ? values.backgroundColor
                          : '#6f8790',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  </Stack>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Text name="sourceLabel" label="ชื่อแหล่งที่มา" />
                  <Field.Text name="sourceUrl" label="ลิงก์แหล่งที่มา" />
                </Box>
                <Field.Text
                  name="note"
                  label="หมายเหตุ"
                  placeholder="ข้อควรทราบ เงื่อนไข หรือคำอธิบายเพิ่มเติม"
                  multiline
                  minRows={3}
                />
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 900 }}>
                    ประเภทและการเผยแพร่
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Field.Switch name="isContest" label="เป็นการประกวด" />
                    <Field.Switch name="isFeatured" label="กิจกรรมสำคัญ" />
                    <Field.Switch name="isActive" label="เผยแพร่" />
                  </Stack>
                </Box>
                {values.isContest && (
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: 'background.neutral',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 2 }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                            ประเภทที่เปิดประกวด
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            เพิ่มรุ่นหรือประเภท เพื่อให้วงเลือกตอนบันทึกข้อมูลรายปี
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<Iconify icon="mingcute:add-line" />}
                          onClick={() =>
                            setValue('contestCategories', [
                              ...values.contestCategories,
                              { id: crypto.randomUUID(), name: '', maxParticipants: 0 },
                            ])
                          }
                        >
                          เพิ่มประเภท
                        </Button>
                      </Stack>
                      <Stack spacing={1.5}>
                        {values.contestCategories.map((category, index) => (
                          <Stack
                            key={category.id}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            alignItems={{ sm: 'center' }}
                          >
                            <Field.Text
                              fullWidth
                              name={`contestCategories.${index}.name`}
                              label={`ชื่อประเภท ${index + 1}`}
                              placeholder="เช่น มัธยมศึกษาตอนต้น"
                            />
                            <Field.Text
                              name={`contestCategories.${index}.maxParticipants`}
                              label="จำนวนวงสูงสุด"
                              type="number"
                              sx={{ width: { sm: 190 } }}
                            />
                            <Button
                              color="error"
                              onClick={() =>
                                setValue(
                                  'contestCategories',
                                  values.contestCategories.filter(
                                    (_, itemIndex) => itemIndex !== index
                                  )
                                )
                              }
                            >
                              ลบ
                            </Button>
                          </Stack>
                        ))}
                        {!values.contestCategories.length && (
                          <Alert severity="info">ยังไม่ได้เพิ่มประเภทที่เปิดประกวด</Alert>
                        )}
                      </Stack>
                    </Box>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: 'background.neutral',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 2 }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                            ผลการแข่งขันและรางวัล
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ปรับรายการที่ผู้ดูแลวงสามารถเลือกได้ โดยหนึ่งวงเลือกได้หลายรายการ
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<Iconify icon="mingcute:add-line" />}
                          onClick={() =>
                            setValue('contestResultOptions', [
                              ...values.contestResultOptions,
                              { id: crypto.randomUUID(), name: '' },
                            ])
                          }
                        >
                          เพิ่มรายการ
                        </Button>
                      </Stack>
                      <Stack spacing={1.5}>
                        {values.contestResultOptions.map((option, index) => (
                          <Stack key={option.id} direction="row" spacing={1.5} alignItems="center">
                            <Field.Text
                              fullWidth
                              name={`contestResultOptions.${index}.name`}
                              label={`ผลหรือรางวัล ${index + 1}`}
                            />
                            <Button
                              color="error"
                              onClick={() =>
                                setValue(
                                  'contestResultOptions',
                                  values.contestResultOptions.filter(
                                    (_, itemIndex) => itemIndex !== index
                                  )
                                )
                              }
                            >
                              ลบ
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                    {isEditing && (
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                          sx={{ mb: 2 }}
                        >
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                              วงที่เข้าร่วมและผลการแข่งขัน
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              แก้ประเภทและรางวัลจากกิจกรรมนี้ ข้อมูลจะซิงก์ไปยังข้อมูลรายปีของวง
                            </Typography>
                          </Box>
                          <Chip
                            color="info"
                            label={`${participantRecords.length.toLocaleString('th-TH')} รายการ`}
                          />
                        </Stack>

                        <Stack spacing={2} divider={<Divider flexItem />}>
                          {participantRecords.map(({ group, record, yearIndex }) => {
                            const selectedResultIds = record.contestResultIds[eventId ?? ''] ?? [];
                            return (
                              <Stack
                                key={`${group.id}-${yearIndex}`}
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={2}
                                alignItems={{ md: 'center' }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1.25}
                                  alignItems="center"
                                  sx={{ minWidth: { md: 260 } }}
                                >
                                  <Avatar
                                    variant="rounded"
                                    src={group.logoUrl || undefined}
                                    sx={{ width: 48, height: 48, bgcolor: group.primaryColor }}
                                  >
                                    {group.name.slice(0, 1)}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontWeight: 900 }}>
                                      {group.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ข้อมูลปี {record.year || '-'}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Autocomplete
                                  multiple
                                  fullWidth
                                  options={values.contestCategories}
                                  value={values.contestCategories.filter((category) =>
                                    (record.contestCategoryIds[eventId ?? ''] ?? []).includes(
                                      category.id
                                    )
                                  )}
                                  getOptionLabel={(category) => category.name}
                                  isOptionEqualToValue={(option, selected) =>
                                    option.id === selected.id
                                  }
                                  onChange={(_, selected) =>
                                    updateParticipantRecord(group.id, yearIndex, {
                                      categoryIds: selected.map((category) => category.id),
                                    })
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="ประเภทที่เข้าร่วม"
                                      placeholder="เลือกได้หลายประเภท"
                                    />
                                  )}
                                />

                                <Autocomplete
                                  multiple
                                  fullWidth
                                  options={values.contestResultOptions}
                                  value={values.contestResultOptions.filter((option) =>
                                    selectedResultIds.includes(option.id)
                                  )}
                                  getOptionLabel={(option) => option.name}
                                  isOptionEqualToValue={(option, selected) =>
                                    option.id === selected.id
                                  }
                                  onChange={(_, selected) =>
                                    updateParticipantRecord(group.id, yearIndex, {
                                      resultIds: selected.map((option) => option.id),
                                    })
                                  }
                                  renderInput={(params) => (
                                    <TextField {...params} label="ผลการแข่งขัน / รางวัล" />
                                  )}
                                />

                                <Button
                                  component={RouterLink}
                                  href={`/admin/home-content/performance-groups/${encodeURIComponent(group.id)}/edit`}
                                  variant="outlined"
                                  sx={{ flexShrink: 0 }}
                                  size="xLarge"
                                >
                                  ดูวง
                                </Button>
                              </Stack>
                            );
                          })}

                          {!participantRecords.length && (
                            <Alert severity="info">
                              ยังไม่มีวงที่เลือกเข้าร่วมกิจกรรมนี้
                              สามารถเพิ่มได้จากข้อมูลรายปีในหน้าแก้ไขวง
                            </Alert>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          </Card>

          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1.5}
            sx={{
              position: 'sticky',
              bottom: 16,
              zIndex: 10,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            }}
          >
            <Button color="inherit" onClick={() => router.back()}>
              ยกเลิก
            </Button>
            <LoadingButton type="submit" variant="contained" loading={formState.isSubmitting}>
              {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Form>
    </DashboardContent>
  );
}

function FormSectionHeader({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: IconifyName;
  title: string;
  description: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        px: { xs: 2.5, md: 4 },
        py: 2.25,
        bgcolor: 'background.neutral',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          borderRadius: 1.5,
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }}
      >
        <Iconify icon={icon} width={24} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 900 }}>
            STEP {step}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

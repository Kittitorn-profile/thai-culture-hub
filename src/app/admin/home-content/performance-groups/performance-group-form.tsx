'use client';

import type { Control } from 'react-hook-form';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from 'node_modules/@mui/material/esm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch, Controller, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { useRouter } from 'src/routes/hooks';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { ImageDropUpload } from './image-drop-upload';
import { resizeImageFile } from './resize-image-file';
import {
  parseList,
  type Award,
  SECTION_KEY,
  createGroup,
  type Personnel,
  type Organizer,
  type GroupEntry,
  createPersonnel,
  PersonnelSchema,
  GROUP_CATEGORIES,
  normalizeContent,
  GroupEntrySchema,
  type HomeContentResponse,
} from './performance-groups-data';

type Props = { groupId?: string };
type PositionDraft = { id: string; original: string; name: string };
type OrganizerDraft = Organizer;
type ContestEvent = {
  id: string;
  title: string;
  startsAt: string;
  isContest?: boolean;
  isActive?: boolean;
  organizer?: string;
  logoUrl?: string;
  backgroundColor?: string;
  contestCategories?: Array<{ id: string; name: string; maxParticipants?: number }>;
  contestResultOptions?: Array<{ id: string; name: string }>;
};
type UploadFolder =
  | 'personnel'
  | 'group-logos'
  | 'yearly-logos'
  | 'yearly-organizers'
  | 'group-covers'
  | 'booklets';

export function PerformanceGroupForm({ groupId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editingPersonIndex, setEditingPersonIndex] = useState<number | 'new' | null>(null);
  const [positionDrafts, setPositionDrafts] = useState<PositionDraft[] | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [organizerDrafts, setOrganizerDrafts] = useState<OrganizerDraft[] | null>(null);
  const [uploadingImageKey, setUploadingImageKey] = useState('');
  const isEditing = Boolean(groupId);

  const methods = useForm<GroupEntry>({
    resolver: zodResolver(GroupEntrySchema),
    defaultValues: createGroup(),
  });
  const { control, watch, setValue, handleSubmit, reset } = methods;
  const group = watch();
  const personnelFieldArray = useFieldArray({ control, name: 'personnel' });
  const yearlyFieldArray = useFieldArray({ control, name: 'yearlyData' });

  const query = useQuery({
    queryKey: ['admin-home-content', SECTION_KEY, accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<HomeContentResponse>(`/api/admin/home-content?sectionKey=${SECTION_KEY}`, {
        accessToken,
      }),
  });
  const contestEventsQuery = useQuery({
    queryKey: ['admin-events', 'contests', accessToken],
    enabled: !!accessToken,
    queryFn: () => adminApiRequest<{ data?: ContestEvent[] }>('/api/admin/events', { accessToken }),
  });
  const contestEvents = (contestEventsQuery.data?.data ?? []).filter(
    (eventItem) => eventItem.isContest && eventItem.isActive
  );
  const categoryOptions = Array.from(
    new Set([
      ...GROUP_CATEGORIES,
      ...normalizeContent(query.data?.data?.content)
        .groups.map((item) => item.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ])
  );

  useEffect(() => {
    if (!query.data) return;

    const storedOrganizers = normalizeContent(query.data.data?.content).organizers;
    const organizerNames = new Set(storedOrganizers.map((item) => item.name.trim().toLowerCase()));
    const eventOrganizers = (contestEventsQuery.data?.data ?? []).flatMap((eventItem) => {
      const name = eventItem.organizer?.trim();

      if (!name || organizerNames.has(name.toLowerCase())) return [];

      organizerNames.add(name.toLowerCase());
      return [
        {
          id: `event-organizer-${encodeURIComponent(name.toLowerCase())}`,
          name,
          color: eventItem.backgroundColor || '#637e69',
          logoUrl: eventItem.logoUrl || '',
        },
      ];
    });

    setOrganizers([...storedOrganizers, ...eventOrganizers]);
  }, [contestEventsQuery.data?.data, query.data]);

  useEffect(() => {
    if (!isEditing || !query.data) return;
    const selected = normalizeContent(query.data.data?.content).groups.find(
      (item) => item.id === groupId
    );
    if (selected) reset(selected);
    else setError('ไม่พบข้อมูลวงที่ต้องการแก้ไข');
  }, [groupId, isEditing, query.data, reset]);

  const save = useMutation({
    mutationFn: (values: GroupEntry) => {
      const selectedProvince = provinces.find((province) => province.code === values.provinceCode);
      const nextGroup: GroupEntry = {
        ...values,
        provinceName: selectedProvince?.name ?? '',
      };
      const content = normalizeContent(query.data?.data?.content);
      const groups = isEditing
        ? content.groups.map((item) => (item.id === groupId ? nextGroup : item))
        : [...content.groups, nextGroup];
      const organizerMap = new Map(organizers.map((organizer) => [organizer.id, organizer]));
      const syncedGroups = groups.map((item) => ({
        ...item,
        yearlyData: item.yearlyData.map((record) => {
          const organizer = organizerMap.get(record.organizerId);
          return organizer
            ? {
                ...record,
                organizerName: organizer.name,
                organizerColor: organizer.color,
                organizerLogoUrl: organizer.logoUrl,
              }
            : { ...record, organizerId: '', organizerName: '', organizerLogoUrl: '' };
        }),
      }));
      return adminApiRequest('/api/admin/home-content', {
        method: 'PUT',
        accessToken,
        body: {
          sectionKey: SECTION_KEY,
          content: { ...content, organizers, groups: syncedGroups },
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-home-content', SECTION_KEY] });
      router.push('/admin/home-content/performance-groups');
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : 'บันทึกไม่สำเร็จ'),
  });

  const uploadImage = async (
    key: string,
    folder: UploadFolder,
    file: File | undefined,
    onUploaded: (url: string) => void
  ) => {
    if (!file) return;
    setError('');
    setUploadError('');
    setUploadingImageKey(key);
    try {
      const resizedFile = folder === 'booklets' ? file : await resizeImageFile(file);
      const body = new FormData();
      body.append('file', resizedFile);
      body.append('folder', folder);
      const response = await adminApiRequest<{ data: { url: string } }>(
        '/api/admin/performance-groups/upload',
        { method: 'POST', accessToken, body }
      );
      onUploaded(response.data.url);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'อัปโหลดรูปไม่สำเร็จ';
      setError(message);
      setUploadError(message);
    } finally {
      setUploadingImageKey('');
    }
  };

  const uploadPerformanceImages = async (yearIndex: number, files: File[]) => {
    if (!files.length) return;
    const key = `performances-${yearIndex}`;
    setError('');
    setUploadError('');
    setUploadingImageKey(key);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const resizedFile = await resizeImageFile(file);
          const body = new FormData();
          body.append('file', resizedFile);
          body.append('folder', 'yearly-performances');
          const response = await adminApiRequest<{ data: { url: string } }>(
            '/api/admin/performance-groups/upload',
            { method: 'POST', accessToken, body }
          );
          return response.data.url;
        })
      );
      setValue(`yearlyData.${yearIndex}.performanceImages`, [
        ...group.yearlyData[yearIndex].performanceImages,
        ...urls,
      ]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'อัปโหลดภาพการแสดงไม่สำเร็จ';
      setError(message);
      setUploadError(message);
    } finally {
      setUploadingImageKey('');
    }
  };

  const savePersonnel = (values: Personnel) => {
    if (editingPersonIndex === 'new') {
      personnelFieldArray.append(values);
    } else if (typeof editingPersonIndex === 'number') {
      personnelFieldArray.update(editingPersonIndex, values);
    }
    setEditingPersonIndex(null);
  };

  const savePositions = () => {
    if (!positionDrafts) return;
    const positions = Array.from(
      new Set(positionDrafts.map((position) => position.name.trim()).filter(Boolean))
    );
    const renamedPositions = new Map(
      positionDrafts
        .filter((position) => position.original && position.name.trim())
        .map((position) => [position.original, position.name.trim()])
    );
    setValue('positions', positions, { shouldValidate: true });
    group.personnel.forEach((person, index) => {
      const renamed = renamedPositions.get(person.role);
      if (renamed && renamed !== person.role) {
        setValue(`personnel.${index}.role`, renamed);
      }
    });
    setPositionDrafts(null);
  };

  const saveOrganizers = () => {
    if (!organizerDrafts) return;
    setOrganizers(organizerDrafts.filter((organizer) => organizer.name.trim()));
    setOrganizerDrafts(null);
  };

  const editingPerson =
    editingPersonIndex === 'new'
      ? createPersonnel(group.positions[0] ?? '')
      : typeof editingPersonIndex === 'number'
        ? group.personnel[editingPersonIndex]
        : null;

  const onSubmit = handleSubmit((values) => {
    save.mutate(values);
  });

  return (
    <DashboardContent maxWidth="lg">
      <Snackbar
        open={Boolean(uploadError)}
        autoHideDuration={7000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setUploadError('')}
      >
        <Alert severity="error" variant="filled" onClose={() => setUploadError('')}>
          {uploadError}
        </Alert>
      </Snackbar>
      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={3}>
          <Card
            sx={{
              p: { xs: 2.5, md: 4 },
              color: 'common.white',
              background: `linear-gradient(135deg, ${group.primaryColor || '#8b5e3c'} 0%, #182625 100%)`,
            }}
          >
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.72, letterSpacing: 1.4 }}>
                    จัดการข้อมูลวง
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900 }}>
                    {isEditing ? `แก้ไข ${group.name || 'ข้อมูลวง'}` : 'สร้างวงใหม่'}
                  </Typography>
                  <Typography sx={{ mt: 0.75, opacity: 0.8 }}>
                    กรอกข้อมูลตามลำดับ และสามารถกลับมาแก้ไขเพิ่มเติมภายหลังได้
                  </Typography>
                </Box>
                <Button
                  color="inherit"
                  variant="outlined"
                  onClick={() => router.back()}
                  sx={{ alignSelf: { sm: 'flex-start' }, borderColor: 'rgba(255,255,255,0.45)' }}
                >
                  กลับหน้ารายการ
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  label="1 · ข้อมูลและภาพ"
                  sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.16)' }}
                />
                <Chip
                  label={`2 · บุคลากร ${group.personnel.length} คน`}
                  sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.16)' }}
                />
                <Chip
                  label={`3 · ข้อมูลรายปี ${group.yearlyData.length} ปี`}
                  sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.16)' }}
                />
              </Stack>
            </Stack>
          </Card>
          {error || query.error ? (
            <Alert severity="error">{error || 'โหลดข้อมูลไม่สำเร็จ'}</Alert>
          ) : null}

          <Card sx={{ overflow: 'hidden' }}>
            <SectionHeader
              title="1. ข้อมูลหลักและอัตลักษณ์"
              subtitle="ข้อมูลที่ใช้แนะนำวงและแสดงบนหน้าเว็บไซต์"
            />
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
              }}
            >
              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  ข้อมูลทั่วไป
                </Typography>
                <Field.Text required name="name" label="ชื่อวง" />
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Autocomplete
                    freeSolo
                    autoSelect
                    selectOnFocus
                    clearOnBlur={false}
                    name="category"
                    label="ประเภทวง"
                    options={categoryOptions}
                    helperText="เลือกจากรายการ หรือพิมพ์หมวดใหม่แล้วกด Enter"
                  />
                  <Field.Select required name="provinceCode" label="จังหวัด">
                    <MenuItem value="">เลือกจังหวัด</MenuItem>
                    {provinces.map((province) => (
                      <MenuItem key={province.code} value={province.code}>
                        {province.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>
                <Field.Text type="number" name="totalMembers" label="จำนวนสมาชิกทั้งหมด" />
                <Field.Text
                  multiline
                  minRows={5}
                  name="description"
                  label="รายละเอียดวง"
                  placeholder="ประวัติ จุดเด่น รูปแบบการแสดง และข้อมูลสำคัญของวง"
                />
                <Box
                  sx={{
                    p: 2,
                    gap: 2,
                    display: 'grid',
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ gridColumn: '1 / -1', fontWeight: 800 }}>
                    ที่มาและการอัปเดตข้อมูล
                  </Typography>
                  <Field.Text
                    name="sourceLabel"
                    label="ชื่อแหล่งข้อมูล"
                    placeholder="เช่น กรมการพัฒนาชุมชน"
                  />
                  <Field.Text
                    type="date"
                    name="updatedAt"
                    label="อัปเดตล่าสุด"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Field.Text
                    name="sourceUrl"
                    label="ลิงก์แหล่งข้อมูล"
                    placeholder="https://example.com/source"
                    sx={{ gridColumn: '1 / -1' }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ gridColumn: '1 / -1' }}
                  >
                    หน้าเว็บไซต์จะแสดงชื่อแหล่งข้อมูลแทน URL และผู้ชมสามารถคลิกเพื่อเปิดต้นทางได้
                  </Typography>
                </Box>
              </Stack>
              <Stack
                spacing={2.5}
                sx={{
                  p: { xs: 0, lg: 2.5 },
                  borderRadius: 2,
                  bgcolor: { lg: 'background.neutral' },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  ภาพและสีประจำวง
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'flex-start' }}
                >
                  <Box sx={{ width: 160, maxWidth: '100%' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      โลโก้หลัก
                    </Typography>
                    <ImageDropUpload
                      imageUrl={group.logoUrl}
                      alt={`โลโก้ ${group.name}`}
                      size={160}
                      uploading={uploadingImageKey === 'group-logo'}
                      onFile={(file) =>
                        uploadImage('group-logo', 'group-logos', file, (logoUrl) =>
                          setValue('logoUrl', logoUrl)
                        )
                      }
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      สีประจำวง
                    </Typography>
                    <Field.Text
                      type="color"
                      name="primaryColor"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {group.primaryColor}
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    ภาพปกวง
                  </Typography>
                  <ImageDropUpload
                    imageUrl={group.coverImageUrl}
                    alt={`ภาพปก ${group.name}`}
                    size="100%"
                    aspectRatio="16 / 9"
                    uploading={uploadingImageKey === 'group-cover'}
                    onFile={(file) =>
                      uploadImage('group-cover', 'group-covers', file, (coverImageUrl) =>
                        setValue('coverImageUrl', coverImageUrl)
                      )
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    ภาพแนวนอน 16:9 · ระบบย่อไฟล์อัตโนมัติให้ไม่เกิน 1 MB
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>

          <Card sx={{ overflow: 'hidden' }}>
            <SectionHeader
              title="2. บุคลากรและตำแหน่ง"
              subtitle="เพิ่มประวัติและกำหนดบทบาทของสมาชิกในวง"
            />
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      รายชื่อบุคลากร
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ทั้งหมด {group.personnel.length} คน
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() =>
                        setPositionDrafts(
                          group.positions.map((name) => ({
                            id: crypto.randomUUID(),
                            original: name,
                            name,
                          }))
                        )
                      }
                    >
                      จัดการตำแหน่ง
                    </Button>
                    <Button variant="outlined" onClick={() => setEditingPersonIndex('new')}>
                      + เพิ่มบุคลากร
                    </Button>
                  </Stack>
                </Stack>
                {personnelFieldArray.fields.length === 0 ? (
                  <Alert severity="info">ยังไม่มีข้อมูลบุคลากร</Alert>
                ) : null}
                {personnelFieldArray.fields.map((field, personIndex) => {
                  const person = group.personnel[personIndex] ?? field;
                  return (
                    <Card
                      key={field.id}
                      variant="outlined"
                      sx={{ p: 2, borderColor: 'divider', boxShadow: 'none' }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ sm: 'center' }}
                      >
                        <Avatar
                          src={person.imageUrl}
                          alt={person.fullName}
                          sx={{ width: 72, height: 72 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {personIndex + 1}. {person.fullName || 'ไม่ระบุชื่อ'}
                            {person.nickname ? ` (${person.nickname})` : ''}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {person.role || 'ไม่ระบุตำแหน่ง'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[
                              person.age ? `อายุ ${person.age} ปี` : '',
                              person.yearsWithGroup ? `อยู่กับวง ${person.yearsWithGroup} ปี` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            onClick={() => setEditingPersonIndex(personIndex)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            color="error"
                            onClick={() => personnelFieldArray.remove(personIndex)}
                          >
                            ลบ
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          </Card>

          <Card sx={{ overflow: 'hidden' }}>
            <SectionHeader
              title="3. ข้อมูลรายปี ผลงาน และรางวัล"
              subtitle="เปิดแก้ไขเฉพาะปีที่ต้องการ เพื่อลดความซับซ้อนของหน้า"
            />
            <Box sx={{ p: { xs: 2, md: 3 }, mb: 1 }}>
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      รายการข้อมูลรายปี
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ทั้งหมด {group.yearlyData.length} ปี
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setOrganizerDrafts(organizers.map((item) => ({ ...item })))}
                    >
                      จัดการผู้จัด
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() =>
                        yearlyFieldArray.append({
                          year: '',
                          note: '',
                          logoUrl: '',
                          organizerId: '',
                          organizerName: '',
                          organizerColor: '#637e69',
                          organizerLogoUrl: '',
                          contestEventIds: [],
                          contestCategoryIds: {},
                          contestResultIds: {},
                          contestSingerIds: {},
                          contestLeadPerformerIds: {},
                          details: '',
                          about: '',
                          storyTypes: [],
                          bookletUrl: '',
                          bookletName: '',
                          youtubeUrl: '',
                          singerIds: [],
                          leadPerformerIds: [],
                          performanceImages: [],
                          awards: [],
                        })
                      }
                    >
                      + เพิ่มปี
                    </Button>
                  </Stack>
                </Stack>

                {yearlyFieldArray.fields.length === 0 ? (
                  <Alert severity="info">ยังไม่มีข้อมูลรายปี</Alert>
                ) : null}
                {yearlyFieldArray.fields.map((field, yearIndex) => (
                  <Box key={field.id} pb={1}>
                    <YearRecordFields
                      control={control}
                      yearIndex={yearIndex}
                      primaryColor={group.primaryColor}
                      personnel={group.personnel}
                      organizers={organizers}
                      contestEvents={contestEvents}
                      onManageOrganizers={() =>
                        setOrganizerDrafts(organizers.map((item) => ({ ...item })))
                      }
                      uploadingImageKey={uploadingImageKey}
                      onUploadLogo={(file) =>
                        uploadImage(`year-logo-${yearIndex}`, 'yearly-logos', file, (logoUrl) =>
                          setValue(`yearlyData.${yearIndex}.logoUrl`, logoUrl)
                        )
                      }
                      onUploadPerformanceImages={(files) =>
                        uploadPerformanceImages(yearIndex, files)
                      }
                      onUploadBooklet={(file) =>
                        uploadImage(`booklet-${yearIndex}`, 'booklets', file, (bookletUrl) =>
                          setValue(`yearlyData.${yearIndex}.bookletUrl`, bookletUrl)
                        )
                      }
                      onSetBookletName={(name) =>
                        setValue(`yearlyData.${yearIndex}.bookletName`, name)
                      }
                      onRemove={() => yearlyFieldArray.remove(yearIndex)}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>

          <Card sx={{ overflow: 'hidden' }}>
            <SectionHeader
              title="4. การเผยแพร่และช่องทางติดต่อ"
              subtitle="ควบคุมการแสดงผลและข้อมูลสำหรับผู้สนใจติดต่อวง"
            />
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 0.7fr) minmax(0, 1.3fr)' },
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  สถานะ
                </Typography>
                <Field.Switch
                  name="isPublished"
                  label={group.isPublished ? 'เผยแพร่บนเว็บไซต์' : 'บันทึกเป็นฉบับร่าง'}
                />
                <Field.Switch name="isFeatured" label="วงแนะนำ" />
                <Field.Switch name="acceptsBookings" label="เปิดรับงาน/การติดต่อ" />
              </Stack>
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  ช่องทางติดต่อ
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Text name="contactPhone" label="เบอร์โทรศัพท์" />
                  <Field.Text type="email" name="contactEmail" label="อีเมล" />
                  <Field.Text name="lineUrl" label="ลิงก์ LINE" placeholder="https://line.me/..." />
                  <Field.Text
                    name="facebookUrl"
                    label="ลิงก์ Facebook"
                    placeholder="https://facebook.com/..."
                  />
                </Box>
                <Field.Text
                  name="youtubeUrl"
                  label="ช่อง YouTube ของวง"
                  placeholder="https://youtube.com/@..."
                />
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
            <LoadingButton
              type="submit"
              variant="contained"
              loading={save.isPending}
              disabled={query.isLoading}
            >
              {isEditing ? 'บันทึกการแก้ไข' : 'สร้างวง'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Form>

      <PersonDialog
        open={Boolean(editingPerson)}
        person={editingPerson}
        isNew={editingPersonIndex === 'new'}
        positions={group.positions}
        uploadingImageKey={uploadingImageKey}
        onUploadImage={(personId, file, onUploaded) =>
          uploadImage(`person-${personId}`, 'personnel', file, onUploaded)
        }
        onClose={() => setEditingPersonIndex(null)}
        onSave={savePersonnel}
      />

      <Dialog
        open={Boolean(positionDrafts)}
        onClose={() => setPositionDrafts(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>จัดการตำแหน่ง</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {positionDrafts?.length === 0 ? <Alert severity="info">ยังไม่มีตำแหน่ง</Alert> : null}
            {positionDrafts?.map((position, index) => (
              <Stack key={position.id} direction="row" spacing={1.5} alignItems="center">
                <TextField
                  fullWidth
                  required
                  label={`ตำแหน่งที่ ${index + 1}`}
                  value={position.name}
                  onChange={(event) =>
                    setPositionDrafts(
                      (current) =>
                        current?.map((item) =>
                          item.id === position.id ? { ...item, name: event.target.value } : item
                        ) ?? null
                    )
                  }
                />
                <Button
                  color="error"
                  onClick={() =>
                    setPositionDrafts(
                      (current) => current?.filter((item) => item.id !== position.id) ?? null
                    )
                  }
                >
                  ลบ
                </Button>
              </Stack>
            ))}
            <Button
              sx={{ alignSelf: 'flex-start' }}
              variant="outlined"
              onClick={() =>
                setPositionDrafts((current) => [
                  ...(current ?? []),
                  { id: crypto.randomUUID(), original: '', name: '' },
                ])
              }
            >
              + เพิ่มตำแหน่ง
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPositionDrafts(null)}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={savePositions}>
            บันทึกตำแหน่ง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(organizerDrafts)}
        onClose={() => setOrganizerDrafts(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>คลังผู้จัดส่วนกลาง</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="info">ผู้จัดในคลังนี้เลือกใช้ซ้ำได้ทุกปีและทุกวง</Alert>
            {organizerDrafts?.map((organizer) => (
              <OrganizerEditor
                key={organizer.id}
                organizer={organizer}
                uploading={uploadingImageKey === `organizer-${organizer.id}`}
                onChange={(next) =>
                  setOrganizerDrafts(
                    (current) => current?.map((item) => (item.id === next.id ? next : item)) ?? null
                  )
                }
                onDelete={() =>
                  setOrganizerDrafts(
                    (current) => current?.filter((item) => item.id !== organizer.id) ?? null
                  )
                }
                onUpload={(file) =>
                  uploadImage(`organizer-${organizer.id}`, 'yearly-organizers', file, (logoUrl) =>
                    setOrganizerDrafts(
                      (current) =>
                        current?.map((item) =>
                          item.id === organizer.id ? { ...item, logoUrl } : item
                        ) ?? null
                    )
                  )
                }
              />
            ))}
            <Button
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
              onClick={() =>
                setOrganizerDrafts((current) => [
                  ...(current ?? []),
                  { id: crypto.randomUUID(), name: '', color: '#637e69', logoUrl: '' },
                ])
              }
            >
              + เพิ่มผู้จัด
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOrganizerDrafts(null)}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={saveOrganizers}>
            บันทึกคลังผู้จัด
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function OrganizerEditor({
  organizer,
  uploading,
  onChange,
  onDelete,
  onUpload,
}: {
  organizer: Organizer;
  uploading: boolean;
  onChange: (organizer: Organizer) => void;
  onDelete: () => void;
  onUpload: (file: File | undefined) => void;
}) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', sm: '110px minmax(0, 1fr) auto' },
        }}
      >
        <ImageDropUpload
          imageUrl={organizer.logoUrl}
          alt={`โลโก้ ${organizer.name}`}
          size={96}
          uploading={uploading}
          onFile={onUpload}
        />
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            required
            label="ชื่อผู้จัด"
            value={organizer.name}
            onChange={(event) => onChange({ ...organizer, name: event.target.value })}
          />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              type="color"
              label="สีประจำผู้จัด"
              value={organizer.color}
              onChange={(event) => onChange({ ...organizer, color: event.target.value })}
              sx={{ width: 130 }}
            />
            <Typography variant="body2" color="text.secondary">
              {organizer.color}
            </Typography>
          </Stack>
        </Stack>
        <Button color="error" onClick={onDelete}>
          ลบ
        </Button>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: 2,
        bgcolor: 'background.neutral',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type PersonnelAutocompleteProps = {
  control: Control<GroupEntry>;
  name:
    | `yearlyData.${number}.singerIds`
    | `yearlyData.${number}.leadPerformerIds`
    | `yearlyData.${number}.contestSingerIds.${string}`
    | `yearlyData.${number}.contestLeadPerformerIds.${string}`;
  label: string;
  personnel: Personnel[];
};

function PersonnelAutocomplete({ control, name, label, personnel }: PersonnelAutocompleteProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          multiple
          options={personnel}
          value={personnel.filter((person) => (field.value ?? []).includes(person.id))}
          getOptionLabel={(person) =>
            person.nickname ? `${person.fullName} (${person.nickname})` : person.fullName
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, people) => field.onChange(people.map((person) => person.id))}
          renderInput={(params) => (
            <TextField {...params} label={label} placeholder="เลือกบุคลากรในวง" />
          )}
        />
      )}
    />
  );
}

// ----------------------------------------------------------------------

type YearRecordFieldsProps = {
  control: Control<GroupEntry>;
  yearIndex: number;
  primaryColor: string;
  personnel: Personnel[];
  organizers: Organizer[];
  contestEvents: ContestEvent[];
  onManageOrganizers: () => void;
  uploadingImageKey: string;
  onUploadLogo: (file: File | undefined) => void;
  onUploadPerformanceImages: (files: File[]) => void;
  onUploadBooklet: (file: File | undefined) => void;
  onSetBookletName: (name: string) => void;
  onRemove: () => void;
};

function YearRecordFields({
  control,
  yearIndex,
  primaryColor,
  personnel,
  organizers,
  contestEvents,
  onManageOrganizers,
  uploadingImageKey,
  onUploadLogo,
  onUploadPerformanceImages,
  onUploadBooklet,
  onSetBookletName,
  onRemove,
}: YearRecordFieldsProps) {
  const { setValue } = useFormContext<GroupEntry>();
  const record = useWatch({ control, name: `yearlyData.${yearIndex}` });
  const awardsFieldArray = useFieldArray({ control, name: `yearlyData.${yearIndex}.awards` });

  return (
    <Accordion
      defaultExpanded={false}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px !important',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        p: 3,
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
        sx={{ px: 2, minHeight: 68 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            variant="rounded"
            src={record.logoUrl}
            sx={{ width: 42, height: 42, bgcolor: primaryColor }}
          >
            {record.year ? record.year.slice(-2) : yearIndex + 1}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>
              {record.year ? `ปี ${record.year}` : `ข้อมูลปีใหม่ ${yearIndex + 1}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.performanceImages.length} ภาพ · {record.awards.length} รางวัล
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          p: { xs: 2, md: 2.5 },
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field.Text
              name={`yearlyData.${yearIndex}.year`}
              label="ปี"
              sx={{ width: { sm: 180 } }}
            />
            <Field.Text fullWidth name={`yearlyData.${yearIndex}.note`} label="หมายเหตุประจำปี" />
            <Button color="error" onClick={onRemove}>
              ลบปี
            </Button>
          </Stack>

          <Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    โลโก้ประจำปี
                  </Typography>
                  <ImageDropUpload
                    imageUrl={record.logoUrl}
                    alt={`โลโก้ปี ${record.year}`}
                    size={160}
                    uploading={uploadingImageKey === `year-logo-${yearIndex}`}
                    onFile={onUploadLogo}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, lg: 10 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  ผู้จัดประจำปี
                </Typography>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    เลือกจากคลังผู้จัดส่วนกลาง สามารถใช้ซ้ำได้ทุกปีและทุกวง
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                  >
                    <Field.Select
                      fullWidth
                      name={`yearlyData.${yearIndex}.organizerId`}
                      label="ผู้จัด"
                    >
                      <MenuItem value="">
                        <em>ไม่ระบุผู้จัด</em>
                      </MenuItem>
                      {organizers.map((organizer) => (
                        <MenuItem key={organizer.id} value={organizer.id}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              src={organizer.logoUrl}
                              sx={{ width: 28, height: 28, bgcolor: organizer.color }}
                            >
                              {organizer.name.slice(0, 1)}
                            </Avatar>
                            <Box>
                              <Typography component="span" variant="body2">
                                {organizer.name}
                              </Typography>
                              {organizer.id.startsWith('event-organizer-') && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ ml: 0.75 }}
                                >
                                  จากกิจกรรม
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Field.Select>
                    <Button
                      variant="outlined"
                      size="xLarge"
                      onClick={onManageOrganizers}
                      sx={{ flexShrink: 0 }}
                    >
                      จัดการผู้จัด
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>
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
              การประกวดที่เข้าร่วม
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              เลือกจากกิจกรรมที่เปิดเผยแพร่และระบุว่าเป็นการประกวด
            </Typography>
            <Controller
              name={`yearlyData.${yearIndex}.contestEventIds`}
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={contestEvents}
                  value={contestEvents.filter((eventItem) => field.value.includes(eventItem.id))}
                  getOptionLabel={(eventItem) => eventItem.title}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, selected) => {
                    const selectedIds = selected.map((eventItem) => eventItem.id);
                    field.onChange(selectedIds);
                    const currentCategories = record.contestCategoryIds ?? {};
                    setValue(
                      `yearlyData.${yearIndex}.contestCategoryIds`,
                      Object.fromEntries(
                        Object.entries(currentCategories).filter(([eventId]) =>
                          selectedIds.includes(eventId)
                        )
                      )
                    );
                    const currentResults = record.contestResultIds ?? {};
                    setValue(
                      `yearlyData.${yearIndex}.contestResultIds`,
                      Object.fromEntries(
                        Object.entries(currentResults).filter(([eventId]) =>
                          selectedIds.includes(eventId)
                        )
                      )
                    );
                    setValue(
                      `yearlyData.${yearIndex}.contestSingerIds`,
                      Object.fromEntries(
                        Object.entries(record.contestSingerIds ?? {}).filter(([eventId]) =>
                          selectedIds.includes(eventId)
                        )
                      )
                    );
                    setValue(
                      `yearlyData.${yearIndex}.contestLeadPerformerIds`,
                      Object.fromEntries(
                        Object.entries(record.contestLeadPerformerIds ?? {}).filter(([eventId]) =>
                          selectedIds.includes(eventId)
                        )
                      )
                    );
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="เลือกการประกวด" placeholder="ค้นหาชื่อกิจกรรม" />
                  )}
                />
              )}
            />
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {(record.contestEventIds ?? []).map((eventId) => {
                const selectedEvent = contestEvents.find((eventItem) => eventItem.id === eventId);
                const categories = selectedEvent?.contestCategories ?? [];
                const resultOptions = selectedEvent?.contestResultOptions ?? [];

                if (!selectedEvent) return null;

                return (
                  <Box
                    key={eventId}
                    sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    <Typography sx={{ mb: 1.5, fontWeight: 900 }}>{selectedEvent.title}</Typography>
                    <Stack spacing={1.5}>
                      {categories.length > 0 && (
                        <Field.Select
                          fullWidth
                          name={`yearlyData.${yearIndex}.contestCategoryIds.${eventId}`}
                          label="ประเภทที่เข้าร่วม"
                        >
                          <MenuItem value="">
                            <em>เลือกประเภทที่เข้าร่วม</em>
                          </MenuItem>
                          {categories.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                              {category.name}
                              {category.maxParticipants
                                ? ` (รับสูงสุด ${category.maxParticipants.toLocaleString('th-TH')} วง)`
                                : ''}
                            </MenuItem>
                          ))}
                        </Field.Select>
                      )}
                      {resultOptions.length > 0 && (
                        <Controller
                          name={`yearlyData.${yearIndex}.contestResultIds.${eventId}`}
                          control={control}
                          render={({ field }) => (
                            <Autocomplete
                              multiple
                              options={resultOptions}
                              value={resultOptions.filter((option) =>
                                (field.value ?? []).includes(option.id)
                              )}
                              getOptionLabel={(option) => option.name}
                              isOptionEqualToValue={(option, value) => option.id === value.id}
                              onChange={(_, selected) =>
                                field.onChange(selected.map((option) => option.id))
                              }
                              renderInput={(params) => (
                                <TextField {...params} label="ผลการแข่งขัน / รางวัล" />
                              )}
                            />
                          )}
                        />
                      )}
                      <Box
                        sx={{
                          pt: 1.5,
                          display: 'grid',
                          gap: 1.5,
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <PersonnelAutocomplete
                          control={control}
                          name={`yearlyData.${yearIndex}.contestSingerIds.${eventId}`}
                          label="นักร้องนำของรายการนี้"
                          personnel={personnel}
                        />
                        <PersonnelAutocomplete
                          control={control}
                          name={`yearlyData.${yearIndex}.contestLeadPerformerIds.${eventId}`}
                          label="นักแสดงนำของรายการนี้"
                          personnel={personnel}
                        />
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
            {!contestEvents.length && (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                ยังไม่มีกิจกรรมการประกวดที่เปิดใช้งาน
              </Alert>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              ภาพการแสดงประจำปี
            </Typography>

            <Button
              component="label"
              variant="outlined"
              disabled={uploadingImageKey === `performances-${yearIndex}`}
            >
              {uploadingImageKey === `performances-${yearIndex}`
                ? 'กำลังอัปโหลด...'
                : '+ เพิ่มภาพการแสดง'}
              <input
                hidden
                multiple
                type="file"
                accept="image/*"
                onChange={(event) =>
                  onUploadPerformanceImages(Array.from(event.target.files ?? []))
                }
              />
            </Button>
            {record.performanceImages.length ? (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                }}
              >
                {record.performanceImages.map((imageUrl, imageIndex) => (
                  <Box key={`${imageUrl}-${imageIndex}`} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={`ภาพการแสดง ${imageIndex + 1}`}
                      sx={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        objectFit: 'cover',
                        borderRadius: 1,
                      }}
                    />
                    <Button
                      size="small"
                      color="error"
                      sx={{ mt: 0.5 }}
                      onClick={() =>
                        setValue(
                          `yearlyData.${yearIndex}.performanceImages`,
                          record.performanceImages.filter((_, index) => index !== imageIndex)
                        )
                      }
                    >
                      ลบภาพ
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
          <Field.Text
            fullWidth
            multiline
            minRows={3}
            name={`yearlyData.${yearIndex}.details`}
            label="รายละเอียดการแสดง/ผลงาน"
          />
          <Field.Text fullWidth name={`yearlyData.${yearIndex}.about`} label="แสดงเกี่ยวกับอะไร" />
          <Controller
            name={`yearlyData.${yearIndex}.storyTypes`}
            control={control}
            render={({ field }) => (
              <TextField
                fullWidth
                label="ประเภทเรื่อง"
                helperText="หลายประเภทคั่นด้วย comma เช่น ตำนาน, วิถีชีวิต, ประวัติศาสตร์"
                value={field.value.join(', ')}
                onChange={(event) => field.onChange(parseList(event.target.value))}
              />
            )}
          />
          <PersonnelAutocomplete
            control={control}
            name={`yearlyData.${yearIndex}.singerIds`}
            label="ผู้ร้อง"
            personnel={personnel}
          />
          <PersonnelAutocomplete
            control={control}
            name={`yearlyData.${yearIndex}.leadPerformerIds`}
            label="นักแสดงนำ"
            personnel={personnel}
          />
          <Field.Text
            fullWidth
            name={`yearlyData.${yearIndex}.youtubeUrl`}
            label="ลิงก์วิดีโอ YouTube"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
          >
            <Button
              component="label"
              variant="outlined"
              disabled={uploadingImageKey === `booklet-${yearIndex}`}
            >
              {uploadingImageKey === `booklet-${yearIndex}`
                ? 'กำลังอัปโหลด...'
                : 'อัปโหลดสูจิบัตร PDF'}
              <input
                hidden
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  onSetBookletName(file?.name ?? 'สูจิบัตร');
                  onUploadBooklet(file);
                }}
              />
            </Button>
            {record.bookletUrl ? (
              <Button
                component="a"
                href={record.bookletUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {record.bookletName || 'เปิดสูจิบัตร'}
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">
                ไฟล์ PDF ไม่เกิน 10 MB
              </Typography>
            )}
          </Stack>
          <Divider />
          {awardsFieldArray.fields.map((awardField, awardIndex) => (
            <Stack key={awardField.id} direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Field.Text
                fullWidth
                name={`yearlyData.${yearIndex}.awards.${awardIndex}.title`}
                label="ชื่อรางวัล"
                onChange={(event) => {
                  setValue(
                    `yearlyData.${yearIndex}.awards.${awardIndex}.title`,
                    event.target.value
                  );
                  setValue(`yearlyData.${yearIndex}.awards.${awardIndex}.year`, record.year);
                }}
              />
              <Field.Text
                fullWidth
                name={`yearlyData.${yearIndex}.awards.${awardIndex}.description`}
                label="รายละเอียดรางวัล"
                onChange={(event) => {
                  setValue(
                    `yearlyData.${yearIndex}.awards.${awardIndex}.description`,
                    event.target.value
                  );
                  setValue(`yearlyData.${yearIndex}.awards.${awardIndex}.year`, record.year);
                }}
              />
              <Button color="error" onClick={() => awardsFieldArray.remove(awardIndex)}>
                ลบรางวัล
              </Button>
            </Stack>
          ))}
          <Button
            sx={{ alignSelf: 'flex-start' }}
            color="inherit"
            variant="outlined"
            onClick={() =>
              awardsFieldArray.append({ year: record.year, title: '', description: '' } as Award)
            }
          >
            + เพิ่มรางวัล
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// ----------------------------------------------------------------------

type PersonDialogProps = {
  open: boolean;
  person: Personnel | null;
  isNew: boolean;
  positions: string[];
  uploadingImageKey: string;
  onUploadImage: (
    personId: string,
    file: File | undefined,
    onUploaded: (url: string) => void
  ) => void;
  onClose: () => void;
  onSave: (values: Personnel) => void;
};

function PersonDialog({
  open,
  person,
  isNew,
  positions,
  uploadingImageKey,
  onUploadImage,
  onClose,
  onSave,
}: PersonDialogProps) {
  const methods = useForm<Personnel>({
    resolver: zodResolver(PersonnelSchema),
    defaultValues: person ?? createPersonnel(),
  });
  const { control, watch, setValue, handleSubmit, reset, formState } = methods;

  useEffect(() => {
    // Snapshot `person` only at the moment the dialog opens: `person` is a new
    // object reference on every parent re-render, and including it here would
    // wipe in-progress edits whenever the parent form re-renders while open.
    if (open) reset(person ?? createPersonnel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const draft = watch();
  const hasFormError = Boolean(formState.errors.fullName || formState.errors.role);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isNew ? 'เพิ่มบุคลากร' : 'แก้ไขบุคลากร'}</DialogTitle>
      <Form methods={methods} onSubmit={handleSubmit(onSave)}>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {hasFormError ? <Alert severity="error">กรุณากรอกชื่อจริงและตำแหน่ง</Alert> : null}
            <Stack spacing={1} alignItems="flex-start">
              <ImageDropUpload
                imageUrl={draft.imageUrl}
                alt={draft.fullName}
                uploading={uploadingImageKey === `person-${draft.id}`}
                onFile={(file) =>
                  onUploadImage(draft.id, file, (imageUrl) => setValue('imageUrl', imageUrl))
                }
              />
              <Typography variant="caption" color="text.secondary">
                แนะนำรูปสัดส่วน 1:1 · ขนาดไม่เกิน 2 MB
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text required name="fullName" label="ชื่อจริง-นามสกุล" />
              <Field.Text name="nickname" label="ชื่อเล่น" />
              <Controller
                name="role"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    select
                    required
                    label="ตำแหน่ง/บทบาท"
                    error={!!error}
                    helperText={error?.message}
                  >
                    {field.value && !positions.includes(field.value) ? (
                      <MenuItem value={field.value}>{field.value}</MenuItem>
                    ) : null}
                    {positions.map((position) => (
                      <MenuItem key={position} value={position}>
                        {position}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Field.Text type="number" name="age" label="อายุ (ปี)" />
              <Field.Text type="number" name="yearsWithGroup" label="อยู่กับวงมาแล้ว (ปี)" />
              <Field.Text name="education" label="จบการศึกษาจาก" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ข้อมูลอื่น ๆ
              </Typography>
              <Field.Editor
                name="otherDetails"
                placeholder="กรอกประวัติ ผลงาน ความสามารถ หรือข้อมูลเพิ่มเติม..."
                sx={{ minHeight: 220 }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained">
            บันทึกบุคลากร
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

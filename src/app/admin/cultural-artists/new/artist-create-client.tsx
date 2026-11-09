'use client';

import type { CulturalArtist } from 'src/server/cultural-artists';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';
import {
  culturalArtistFormSchema,
  type CulturalArtistFormValues,
} from 'src/lib/cultural-artist-form';

import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

const TYPES: Record<string, string> = {
  national_artist: 'ทำเนียบศิลปินแห่งชาติ',
  contemporary_artist: 'ศิลปินร่วมสมัย',
  silpathorn_artist: 'ศิลปินศิลปาธร',
  folk_artist: 'ศิลปินพื้นบ้าน',
  local_artist: 'ศิลปินท้องถิ่น',
  performing_artist: 'ศิลปินนักร้อง/นักดนตรี',
};
const RELATIONSHIPS: Record<string, string> = {
  birthplace: 'จังหวัดเกิด',
  origin: 'ภูมิลำเนา',
  work_area: 'พื้นที่ทำงาน',
  learning_site: 'บ้านศิลปิน/แหล่งเรียนรู้',
  cultural_legacy: 'มรดกผลงานวัฒนธรรม',
};

export function ArtistCreateClient({ artist }: { artist?: CulturalArtist }) {
  const { user } = useAuthContext();
  const [error, setError] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const methods = useForm<CulturalArtistFormValues>({
    resolver: zodResolver(culturalArtistFormSchema),
    defaultValues: {
      name: artist?.name ?? '',
      aliases: artist?.aliases.join(', ') ?? '',
      types: artist?.types ?? ['local_artist'],
      fields: artist?.fields.join(', ') ?? '',
      genres: artist?.genres.join(', ') ?? '',
      birthDate: artist?.birthDate ?? null,
      sourceUrl: artist?.sources[0]?.url ?? '',
      provinceCode: artist?.provinceAssociations[0]?.provinceCode ?? '',
      relationship: artist?.provinceAssociations[0]?.relationship ?? 'origin',
      provinceSourceUrl: artist?.provinceAssociations[0]?.sourceUrl ?? '',
      image: artist?.image?.url ?? null,
      credit: artist?.image?.credit ?? '',
      imageSourceUrl: artist?.image?.sourceUrl ?? '',
    },
  });
  const {
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { isSubmitting: saving },
  } = methods;
  const imageValue = watch('image');
  const provinceCode = watch('provinceCode');
  const [uploadError, setUploadError] = useState('');
  return (
    <DashboardContent maxWidth="xl">
      <Form
        methods={methods}
        onSubmit={handleSubmit(async (data) => {
          const value = (key: keyof CulturalArtistFormValues) => String(data[key] ?? '').trim();
          const list = (key: keyof CulturalArtistFormValues) => [
            ...new Set(
              value(key)
                .split(/[,\n]/)
                .map((item) => item.trim())
                .filter(Boolean)
            ),
          ];
          setError('');
          try {
            const token = user?.accessToken ?? user?.access_token;
            const response = await fetch('/api/admin/cultural-artists/', {
              method: artist ? 'PATCH' : 'POST',
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: (() => {
                const body = new FormData();
                body.set(
                  'data',
                  JSON.stringify({
                    id: artist?.id,
                    removeImage: !data.image,
                    name: value('name'),
                    aliases: list('aliases'),
                    types: data.types,
                    birthDate: data.birthDate ?? '',
                    fields: list('fields'),
                    genres: list('genres'),
                    sourceUrl: value('sourceUrl'),
                    provinceCode,
                    relationship: value('relationship') || 'origin',
                    provinceSourceUrl: value('provinceSourceUrl'),
                  })
                );
                if (data.image instanceof File) body.set('file', data.image);
                body.set('credit', value('credit'));
                body.set('imageSourceUrl', value('imageSourceUrl'));
                return body;
              })(),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message ?? 'บันทึกข้อมูลไม่สำเร็จ');
            await queryClient.invalidateQueries({ queryKey: ['admin', 'cultural-artists'] });
            router.push(`/admin/cultural-artists/?q=${encodeURIComponent(result.data.name)}`);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'บันทึกข้อมูลไม่สำเร็จ');
          }
        })}
      >
        <Button
          component={Link}
          href="/admin/cultural-artists/"
          color="inherit"
          size="small"
          sx={{ mb: 2, alignSelf: 'flex-start' }}
          disabled={saving}
        >
          ← กลับหน้ารายการศิลปิน
        </Button>
        <Typography component="h1" variant="h4">
          {artist ? 'แก้ไขข้อมูลศิลปิน' : 'เพิ่มข้อมูลศิลปิน'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          กรอกข้อมูลศิลปิน พร้อมรูปภาพและแหล่งอ้างอิง
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Box component="fieldset" disabled={saving} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 340px) minmax(0, 1fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Card sx={{ p: 3, display: 'grid', gap: 2.5 }}>
              <Box>
                <Typography variant="h6">รูปศิลปิน</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  เพิ่มรูปเพื่อให้จดจำศิลปินได้ง่ายขึ้น (ไม่บังคับ)
                </Typography>
              </Box>
              <Field.Upload
                name="image"
                disabled={saving}
                accept={{
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                  'image/webp': ['.webp'],
                }}
                maxSize={2 * 1024 * 1024}
                minSize={1}
                multiple={false}
                hideFilesRejected
                error={!!uploadError}
                onDrop={(accepted, rejected) => {
                  if (rejected.length) {
                    setUploadError(
                      'กรุณาเลือกครั้งละ 1 รูป รองรับ JPG, PNG หรือ WebP ไม่เกิน 2 MB'
                    );
                    return;
                  }
                  if (accepted[0]) {
                    setValue('image', accepted[0], { shouldValidate: true, shouldDirty: true });
                    setUploadError('');
                  }
                }}
                onDelete={
                  saving
                    ? undefined
                    : () => {
                        setValue('image', null, { shouldValidate: true, shouldDirty: true });
                        setUploadError('');
                      }
                }
                helperText={uploadError || 'JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB'}
                sx={{
                  minHeight: 260,
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 3,
                  },
                  ...(imageValue ? { height: 300 } : {}),
                }}
              />
              {imageValue instanceof File && (
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {imageValue.name}
                </Typography>
              )}
              {imageValue && (
                <>
                  <Field.Text
                    required
                    name="credit"
                    label="เครดิตภาพ / เจ้าของภาพ"
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                  <Field.Text
                    type="url"
                    name="imageSourceUrl"
                    label="ลิงก์แหล่งภาพ (ถ้ามี)"
                    helperText="ใช้ลิงก์ https://"
                  />
                </>
              )}
            </Card>
            <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
              <Card sx={{ p: 3, display: 'grid', gap: 2.5 }}>
                <Typography variant="h6">ข้อมูลศิลปิน</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2.5,
                  }}
                >
                  <Field.Text
                    required
                    name="name"
                    label="ชื่อศิลปิน"
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                  <Field.Text
                    name="aliases"
                    label="ชื่อที่ใช้แสดง / ชื่ออื่น"
                    helperText="แยกหลายชื่อด้วยเครื่องหมายจุลภาค (,)"
                  />
                  <Field.Text
                    select
                    required
                    name="types"
                    label="ประเภทศิลปิน"
                    slotProps={{ select: { multiple: true } }}
                  >
                    {Object.entries(TYPES).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Field.Text>
                  <Field.Text
                    required
                    name="fields"
                    label="สาขา"
                    helperText="เช่น ดนตรี, ศิลปะการแสดง (แยกด้วยจุลภาค)"
                  />
                  <Field.DatePicker
                    name="birthDate"
                    label="วันเกิด (ถ้ามี)"
                    disableFuture
                    format="DD/MM/YYYY"
                  />
                  <Field.Text
                    name="genres"
                    label="แนวการแสดง"
                    helperText="เช่น หมอลำ, ลูกทุ่ง (แยกด้วยจุลภาค)"
                  />
                </Box>
                <Field.Text
                  required
                  type="url"
                  name="sourceUrl"
                  label="ลิงก์แหล่งอ้างอิงข้อมูลศิลปิน"
                />
              </Card>
              <Card sx={{ p: 3, display: 'grid', gap: 2.5 }}>
                <Box>
                  <Typography variant="h6">ความเกี่ยวข้องกับจังหวัด</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    ระบุจังหวัดเมื่อมีหลักฐานอ้างอิงความเกี่ยวข้อง
                  </Typography>
                </Box>
                <Controller
                  name="provinceCode"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      options={provinces}
                      getOptionLabel={(item) => item.name}
                      value={provinces.find((item) => item.code === field.value) ?? null}
                      onBlur={field.onBlur}
                      onChange={(_event, item) => field.onChange(item?.code ?? '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          inputRef={field.ref}
                          label="จังหวัด (ถ้ามีหลักฐาน)"
                          error={!!fieldState.error}
                          helperText={
                            fieldState.error?.message ??
                            'ไม่เลือกจังหวัด จะบันทึกเป็นรอยืนยันจังหวัด'
                          }
                        />
                      )}
                    />
                  )}
                />
                {provinceCode && (
                  <>
                    <Field.Text select name="relationship" label="ความเกี่ยวข้องกับจังหวัด">
                      {Object.entries(RELATIONSHIPS).map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ))}
                    </Field.Text>
                    <Field.Text
                      required
                      type="url"
                      name="provinceSourceUrl"
                      label="ลิงก์หลักฐานความเกี่ยวข้องกับจังหวัด"
                    />
                  </>
                )}
              </Card>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button component={Link} href="/admin/cultural-artists/" disabled={saving}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="contained" loading={saving}>
                  บันทึกข้อมูล
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Form>
    </DashboardContent>
  );
}

'use client';

import type { HeritageRecord } from 'src/server/cultural-heritage';
import type { CommunityGroupKey } from 'src/lib/cultural-data-groups';
import type { CommunityHeritageFormValues } from 'src/lib/community-heritage-form';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';
import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';
import { communityHeritageFormSchema } from 'src/lib/community-heritage-form';

import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

export function CommunityHeritageForm({
  group,
  record,
}: {
  group: CommunityGroupKey;
  record?: HeritageRecord;
}) {
  const { user } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const back = `/admin/cultural-heritage/group/${group}/`;
  const label = COMMUNITY_GROUPS.find((item) => item.key === group)!.label;
  const methods = useForm<CommunityHeritageFormValues>({
    resolver: zodResolver(communityHeritageFormSchema),
    defaultValues: {
      id: record?.id,
      group,
      name: record?.name ?? '',
      province: record?.province ?? '',
      practice: record?.practice ?? '',
      description: record?.description ?? '',
      technique: record?.technique ?? '',
      lifestyle: record?.lifestyle ?? '',
      organization: record?.organization ?? '',
      sourceUrl: record?.sourceUrl ?? '',
      image: record?.image?.url ?? null,
      imageCredit: record?.image?.credit ?? '',
      imageSourceUrl: record?.image?.sourceUrl ?? '',
    },
  });
  const [uploadError, setUploadError] = useState('');
  const image = methods.watch('image');
  const saving = methods.formState.isSubmitting;
  return (
    <DashboardContent maxWidth="lg">
      <Button
        component={Link}
        href={back}
        color="inherit"
        sx={{ alignSelf: 'flex-start', mb: 2 }}
        disabled={saving}
      >
        ← กลับหน้ารายการ
      </Button>
      <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
        {record ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'} · {label}
      </Typography>
      <Form
        methods={methods}
        onSubmit={methods.handleSubmit(async (values) => {
          setError('');
          try {
            const { image: picked, ...data } = values;
            const body = new FormData();
            body.set('data', JSON.stringify({ ...data, removeImage: !picked }));
            if (picked instanceof File) body.set('file', picked);
            await adminApiRequest('/api/admin/cultural-heritage/', {
              method: record ? 'PATCH' : 'POST',
              accessToken: user?.accessToken ?? user?.access_token ?? '',
              body,
            });
            await queryClient.invalidateQueries({ queryKey: ['cultural-heritage'] });
            router.push(back);
            router.refresh();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'บันทึกข้อมูลไม่สำเร็จ');
          }
        })}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Box component="fieldset" disabled={saving} sx={{ p: 0, m: 0, border: 0, minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Card sx={{ p: 3, display: 'grid', gap: 2.5 }}>
              <Typography variant="h6">รูปภาพ</Typography>
              <Field.Upload
                name="image"
                disabled={saving}
                accept={{
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                  'image/webp': ['.webp'],
                }}
                multiple={false}
                maxSize={2 * 1024 * 1024}
                minSize={1}
                hideFilesRejected
                onDrop={(accepted, rejected) => {
                  if (rejected.length) {
                    setUploadError('เลือกครั้งละ 1 รูป JPG, PNG หรือ WebP ไม่เกิน 2 MB');
                    return;
                  }
                  if (accepted[0]) {
                    methods.setValue('image', accepted[0], {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setUploadError('');
                  }
                }}
                onDelete={
                  saving
                    ? undefined
                    : () => {
                        methods.setValue('image', null, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setUploadError('');
                      }
                }
                helperText={
                  uploadError || 'ลากวางหรือคลิกเลือกรูป JPG, PNG, WebP ไม่เกิน 2 MB (ไม่บังคับ)'
                }
                error={!!uploadError || !!methods.formState.errors.image}
                sx={{
                  minHeight: 260,
                  ...(image ? { height: 280 } : {}),
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                }}
              />
              {image instanceof File && (
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {image.name}
                </Typography>
              )}
              {image && (
                <>
                  <Field.Text name="imageCredit" label="เครดิตภาพ / เจ้าของภาพ" required />
                  <Field.Text
                    name="imageSourceUrl"
                    label="ลิงก์ที่มาของภาพ"
                    helperText="ลิงก์หน้าเว็บไซต์ต้นทางของภาพ (ถ้ามี)"
                  />
                </>
              )}
            </Card>
            <Card sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 3 }}>
              <Typography variant="h6">ข้อมูลรายการ</Typography>
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
              >
                <Field.Text name="name" label="ชื่อรายการ" required />
                <Field.Select name="province" label="จังหวัด" required>
                  <MenuItem value="">เลือกจังหวัด</MenuItem>
                  {provinces.map((province) => (
                    <MenuItem key={province.code} value={province.name}>
                      {province.name}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Box>
              <Field.Text name="practice" label="พื้นที่ปฏิบัติ / ชุมชน" />
              <Field.Text name="description" label="เรื่องราว" multiline minRows={4} required />
              <Field.Text name="technique" label="เทคนิคและภูมิปัญญา" multiline minRows={3} />
              <Field.Text name="lifestyle" label="ความสัมพันธ์กับวิถีชีวิต" multiline minRows={3} />
              <Typography variant="h6">แหล่งอ้างอิง</Typography>
              <Field.Text name="organization" label="ผู้เผยแพร่ข้อมูล" required />
              <Field.Text name="sourceUrl" label="ลิงก์แหล่งข้อมูล" required />
            </Card>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button component={Link} href={back} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saving}>
              บันทึกข้อมูล
            </Button>
          </Box>
        </Box>
      </Form>
    </DashboardContent>
  );
}

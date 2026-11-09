'use client';

import type { Developer } from 'src/lib/contact-developers';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Box,
  Chip,
  Stack,
  Alert,
  Avatar,
  Button,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import { developersSchema, DEVELOPERS_SECTION_KEY } from 'src/lib/contact-developers';

import { useAuthContext } from 'src/auth/hooks';

export default function DevelopersPage() {
  const { user } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const queryClient = useQueryClient();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const queryKey = ['admin-contact-developers', accessToken];
  const query = useQuery({
    queryKey,
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const result = await adminApiRequest<{ data: { content?: unknown } | null }>(
        `/api/admin/home-content?sectionKey=${DEVELOPERS_SECTION_KEY}`,
        { accessToken }
      );
      const parsed = developersSchema.safeParse(result.data?.content ?? { developers: [] });
      if (!parsed.success) throw new Error('ข้อมูลนักพัฒนาที่บันทึกไว้ไม่ถูกต้อง');
      return { data: { content: parsed.data } };
    },
  });
  useEffect(() => {
    if (query.data && !dirty) {
      const parsed = developersSchema.safeParse(query.data.data?.content ?? { developers: [] });
      if (parsed.success) setDevelopers(parsed.data.developers);
    }
  }, [query.data, dirty]);
  const save = useMutation({
    mutationFn: async () => {
      const parsed = developersSchema.safeParse({ developers });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      return adminApiRequest('/api/admin/home-content', {
        accessToken,
        method: 'PUT',
        body: { sectionKey: DEVELOPERS_SECTION_KEY, content: parsed.data },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setDirty(false);
      setMessage('บันทึกข้อมูลนักพัฒนาแล้ว');
      await queryClient.invalidateQueries({ queryKey: ['contact-developers'] });
    },
  });
  function update(id: string, patch: Partial<Developer>) {
    setDirty(true);
    setMessage('');
    setDevelopers((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
  const disabled = !accessToken || query.isPending || query.isError || save.isPending;
  return (
    <DashboardContent>
      <Stack spacing={3} sx={{ maxWidth: 1180, width: 1, mx: 'auto', pb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
        >
          <Box>
            <Typography component="h1" variant="h4">
              ข้อมูลนักพัฒนา
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 14 }}>
              จัดการโปรไฟล์และช่องทางติดต่อที่แสดงในหน้าเกี่ยวกับเรา
            </Typography>
          </Box>
          <Button
            variant="outlined"
            href="/about-us/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flexShrink: 0 }}
          >
            ดูหน้าเกี่ยวกับเรา ↗
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`ทั้งหมด ${developers.length} คน`} variant="outlined" />
          <Chip
            label={`เผยแพร่ ${developers.filter((item) => item.isPublished).length} คน`}
            color="success"
            variant="soft"
          />
          {dirty && <Chip label="มีการแก้ไขที่ยังไม่บันทึก" color="warning" variant="soft" />}
        </Stack>
        {query.isPending && <Typography>กำลังโหลดข้อมูล…</Typography>}
        {query.isError && (
          <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
            {query.error.message}
          </Alert>
        )}
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        {message && (
          <Alert severity="success" onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}
        {!query.isPending && !query.isError && !developers.length && (
          <Box
            sx={{
              p: 5,
              textAlign: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography fontWeight={600}>ยังไม่มีข้อมูลนักพัฒนา</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, fontSize: 14 }}>
              เพิ่มโปรไฟล์แรก แล้วเปิดเผยแพร่เมื่อกรอกข้อมูลพร้อมแล้ว
            </Typography>
          </Box>
        )}
        {developers.map((developer, index) => (
          <Box
            component="fieldset"
            disabled={disabled}
            key={developer.id}
            sx={{
              m: 0,
              p: 0,
              minWidth: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Box
              component="legend"
              sx={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clipPath: 'inset(50%)',
              }}
            >
              นักพัฒนา {index + 1}
            </Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{
                px: { xs: 2, md: 3 },
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600 }}>
                  โปรไฟล์นักพัฒนา {index + 1}
                </Typography>
              </Box>
              <Button
                color="error"
                size="small"
                onClick={() => {
                  setDevelopers((items) => items.filter((item) => item.id !== developer.id));
                  setDirty(true);
                  setMessage('');
                }}
              >
                ลบรายการ
              </Button>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '260px minmax(0, 1fr)' },
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, md: 3 },
                  bgcolor: 'background.neutral',
                  borderRight: { md: '1px solid' },
                  borderColor: { md: 'divider' },
                  minWidth: 0,
                }}
              >
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 2 }}>
                  ตัวอย่างโปรไฟล์
                </Typography>
                <Avatar
                  src={/^https?:\/\//.test(developer.imageUrl) ? developer.imageUrl : undefined}
                  alt={developer.name}
                  sx={{
                    width: 72,
                    height: 72,
                    mb: 2,
                    bgcolor: '#e3eae0',
                    color: '#4e6658',
                    fontSize: 28,
                  }}
                >
                  {developer.name.slice(0, 1) || '?'}
                </Avatar>
                <Typography sx={{ fontWeight: 600, fontSize: 18, overflowWrap: 'anywhere' }}>
                  {developer.name || 'ชื่อผู้พัฒนา'}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5, fontSize: 13, overflowWrap: 'anywhere' }}
                >
                  {developer.role || 'ตำแหน่ง / บทบาท'}
                </Typography>
                {developer.bio && (
                  <Typography
                    sx={{
                      mt: 2,
                      fontSize: 13,
                      lineHeight: 1.8,
                      whiteSpace: 'pre-line',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {developer.bio}
                  </Typography>
                )}
                <FormControlLabel
                  sx={{ mt: 2, mx: 0 }}
                  control={
                    <Switch
                      checked={developer.isPublished}
                      onChange={(_, checked) => update(developer.id, { isPublished: checked })}
                    />
                  }
                  label="เผยแพร่โปรไฟล์"
                />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                  การเปลี่ยนแปลงจะแสดงหลังบันทึกข้อมูล
                </Typography>
              </Box>
              <Stack
                spacing={2.5}
                sx={{ p: { xs: 2, md: 3 }, minWidth: 0, '& .MuiTextField-root': { minWidth: 0 } }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>ข้อมูลโปรไฟล์</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  <TextField
                    size="small"
                    label="ชื่อผู้พัฒนา"
                    required
                    value={developer.name}
                    onChange={(event) => update(developer.id, { name: event.target.value })}
                  />
                  <TextField
                    size="small"
                    label="ตำแหน่ง / บทบาท"
                    value={developer.role}
                    onChange={(event) => update(developer.id, { role: event.target.value })}
                  />
                </Box>
                <TextField
                  size="small"
                  label="แนะนำตัว"
                  multiline
                  minRows={3}
                  value={developer.bio}
                  onChange={(event) => update(developer.id, { bio: event.target.value })}
                />
                <TextField
                  size="small"
                  label="URL รูปโปรไฟล์"
                  placeholder="https://…"
                  value={developer.imageUrl}
                  onChange={(event) => update(developer.id, { imageUrl: event.target.value })}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: 14,
                    pt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  ช่องทางติดต่อ
                </Typography>
                <TextField
                  size="small"
                  label="อีเมลติดต่อสาธารณะ"
                  type="email"
                  value={developer.email}
                  onChange={(event) => update(developer.id, { email: event.target.value })}
                />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  <TextField
                    size="small"
                    label="เว็บไซต์"
                    placeholder="https://…"
                    value={developer.website}
                    onChange={(event) => update(developer.id, { website: event.target.value })}
                  />
                  <TextField
                    size="small"
                    label="GitHub"
                    placeholder="https://github.com/…"
                    value={developer.github}
                    onChange={(event) => update(developer.id, { github: event.target.value })}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
        ))}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          sx={{
            position: 'sticky',
            bottom: 16,
            zIndex: 2,
            p: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <Button
            variant="outlined"
            disabled={disabled || developers.length >= 30}
            onClick={() => {
              setDevelopers((items) => [
                ...items,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  role: '',
                  bio: '',
                  imageUrl: '',
                  email: '',
                  website: '',
                  github: '',
                  isPublished: false,
                },
              ]);
              setDirty(true);
              setMessage('');
            }}
          >
            เพิ่มนักพัฒนา
          </Button>
          <Button
            variant="contained"
            disabled={disabled || !dirty}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            บันทึกข้อมูล
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}

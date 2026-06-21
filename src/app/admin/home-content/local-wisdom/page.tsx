'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { DashboardContent } from 'src/layouts/dashboard';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type LocalWisdomContent = {
  title: string;
  body: string;
  quote: string;
  caption: string;
  mediaUrl: string;
  coverUrl: string;
};

type HomeContentResponse = {
  data?: { content?: unknown } | null;
  message?: string;
};

const SECTION_KEY = 'local-wisdom';

const DEFAULT_CONTENT: LocalWisdomContent = {
  title: 'ข้อมูลพื้นที่และภูมิปัญญาท้องถิ่น',
  body: 'ระบบรวบรวมข้อมูลจากหลายแหล่ง แล้วจัดให้เชื่อมโยงกับจังหวัด อำเภอ หมวดวัฒนธรรม และพิกัดที่ใช้งานได้จริง ข้อมูลที่ระบุพื้นที่ชัดเจนจะถูกนำไปแสดงบนแผนที่ ส่วนข้อมูลระดับจังหวัดยังคงอยู่ในรายการเพื่อให้ค้นหาและอ่านรายละเอียดต่อได้',
  quote: '"เริ่มจากพื้นที่ แล้วค่อยเห็นเรื่องราวของผู้คน"',
  caption: 'มองวัฒนธรรมผ่านข้อมูล พิกัด และบริบทของแต่ละจังหวัด',
  mediaUrl: 'https://www.youtube.com/watch?v=76jSHW8-Sug&t=5s',
  coverUrl: 'https://img.youtube.com/vi/76jSHW8-Sug/maxresdefault.jpg',
};

function isValidStoredContent(value: unknown): value is LocalWisdomContent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const content = value as Partial<Record<keyof LocalWisdomContent, unknown>>;

  return (
    typeof content.title === 'string' &&
    typeof content.body === 'string' &&
    typeof content.quote === 'string' &&
    typeof content.caption === 'string' &&
    typeof content.mediaUrl === 'string' &&
    typeof content.coverUrl === 'string'
  );
}

export default function LocalWisdomContentPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<LocalWisdomContent>(DEFAULT_CONTENT);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const contentQuery = useQuery({
    queryKey: ['admin-home-content', SECTION_KEY, accessToken],
    enabled: !!accessToken,
    queryFn: () => {
      const params = new URLSearchParams({ sectionKey: SECTION_KEY });

      return adminApiRequest<HomeContentResponse>(`/api/admin/home-content?${params.toString()}`, {
        accessToken,
      });
    },
  });

  useEffect(() => {
    if (isValidStoredContent(contentQuery.data?.data?.content)) {
      setContent(contentQuery.data.data.content);
    }
  }, [contentQuery.data]);

  useEffect(() => {
    if (
      contentQuery.error &&
      contentQuery.error instanceof AdminApiError &&
      contentQuery.error.status === 401
    ) {
      checkUserSession?.();
    }
  }, [checkUserSession, contentQuery.error]);

  const saveContentMutation = useMutation({
    mutationFn: () =>
      adminApiRequest<{ message?: string }>('/api/admin/home-content', {
        method: 'PUT',
        accessToken,
        body: { sectionKey: SECTION_KEY, content },
      }),
    onSuccess: async () => {
      setMessage('บันทึก section ภูมิปัญญาท้องถิ่นลง database แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-home-content', SECTION_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    },
  });

  const handleSaveDraft = async () => {
    setError('');
    setMessage('');
    await saveContentMutation.mutateAsync().catch(() => undefined);
  };

  const handleReset = () => {
    setContent(DEFAULT_CONTENT);
    setMessage('คืนค่าเริ่มต้นแล้ว กดบันทึก draft เพื่ออัปเดต database');
    setError('');
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              ภูมิปัญญาท้องถิ่น
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              แก้ content section “ข้อมูลพื้นที่และภูมิปัญญาท้องถิ่น” ในหน้า home-view
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href="/admin/home-content" color="inherit" variant="outlined">
              กลับ Home Content
            </Button>
            <Button color="inherit" variant="outlined" size="small" onClick={handleReset}>
              คืนค่าเริ่มต้น
            </Button>
            <LoadingButton
              variant="contained"
              loading={saveContentMutation.isPending}
              onClick={handleSaveDraft}
            >
              บันทึก
            </LoadingButton>
          </Stack>
        </Stack>

        {(error || contentQuery.error) && (
          <Alert severity="error">
            {error ||
              (contentQuery.error instanceof Error
                ? contentQuery.error.message
                : 'โหลดข้อมูลไม่สำเร็จ')}
          </Alert>
        )}
        {message && <Alert severity="success">{message}</Alert>}

        <Alert severity="info">
          หน้านี้อ่านและบันทึกข้อมูลผ่าน database table home_content_sections
        </Alert>

        {contentQuery.isLoading && <Alert severity="info">กำลังโหลดข้อมูลจาก database...</Alert>}

        <Box
          sx={{
            gap: 3,
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.05fr' },
          }}
        >
          <Card sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                แก้ข้อความและสื่อ
              </Typography>

              <TextField
                fullWidth
                label="หัวข้อหลัก"
                value={content.title}
                onChange={(event) => setContent({ ...content, title: event.target.value })}
              />

              <TextField
                fullWidth
                multiline
                minRows={5}
                label="คำอธิบาย"
                value={content.body}
                onChange={(event) => setContent({ ...content, body: event.target.value })}
              />

              <TextField
                fullWidth
                label="Quote"
                value={content.quote}
                onChange={(event) => setContent({ ...content, quote: event.target.value })}
              />

              <TextField
                fullWidth
                label="Caption ใต้ quote"
                value={content.caption}
                onChange={(event) => setContent({ ...content, caption: event.target.value })}
              />

              <Divider />

              <TextField
                fullWidth
                label="Video/Media URL"
                value={content.mediaUrl}
                onChange={(event) => setContent({ ...content, mediaUrl: event.target.value })}
              />

              <TextField
                fullWidth
                label="Cover URL"
                value={content.coverUrl}
                onChange={(event) => setContent({ ...content, coverUrl: event.target.value })}
              />
            </Stack>
          </Card>

          <Card sx={{ overflow: 'hidden' }}>
            <Box
              sx={{
                p: { xs: 2.5, md: 4 },
                color: '#f8f6ee',
                minHeight: 540,
                backgroundImage:
                  'linear-gradient(135deg, rgba(111,135,144,0.72), rgba(143,124,92,0.84))',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.2,
                  pointerEvents: 'none',
                  backgroundImage:
                    'repeating-linear-gradient(18deg, transparent 0 34px, rgba(255,255,255,0.22) 35px 36px)',
                },
              }}
            >
              <Box
                sx={{
                  gap: 3,
                  display: 'grid',
                  alignItems: 'center',
                  gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(248,246,238,0.1)',
                    border: '1px solid rgba(248,246,238,0.22)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                  }}
                >
                  <Box
                    sx={{
                      width: 1,
                      height: { xs: 220, md: 320 },
                      overflow: 'hidden',
                      borderRadius: 1,
                      bgcolor: '#2a3736',
                      position: 'relative',
                    }}
                  >
                    {content.coverUrl ? (
                      <Box
                        component="img"
                        src={content.coverUrl}
                        alt={content.title}
                        sx={{ width: 1, height: 1, objectFit: 'cover' }}
                      />
                    ) : null}

                    <Box
                      sx={{
                        inset: 0,
                        display: 'grid',
                        position: 'absolute',
                        placeItems: 'center',
                        bgcolor: content.coverUrl ? 'rgba(42,55,54,0.22)' : 'transparent',
                      }}
                    >
                      <Iconify icon="solar:play-circle-bold" width={54} />
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography
                    component="h2"
                    sx={{
                      maxWidth: 520,
                      fontSize: { xs: 38, md: 58 },
                      fontWeight: 900,
                      lineHeight: 1.15,
                    }}
                  >
                    {content.title}
                  </Typography>

                  <Typography sx={{ mt: 3, maxWidth: 430, color: 'rgba(248,246,238,0.82)' }}>
                    {content.body}
                  </Typography>

                  <Typography variant="h4" sx={{ mt: 3, fontStyle: 'italic', fontWeight: 900 }}>
                    {content.quote}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}
                  >
                    {content.caption}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>
        </Box>
      </Stack>
    </DashboardContent>
  );
}

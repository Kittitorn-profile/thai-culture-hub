'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { DashboardContent } from 'src/layouts/dashboard';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type HomeStoryContent = {
  eyebrow: string;
  title: string;
  actionLabel: string;
  body: string;
};

type HomeMediaItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  coverUrl: string;
  icon: IconifyName;
  color: string;
  isActive: boolean;
};

type EditingMediaItem = HomeMediaItem & {
  isNew?: boolean;
};

type StoredMediaItem = HomeMediaItem & {
  type?: 'image' | 'video';
};

const SECTION_KEY = 'story-media';

const DEFAULT_STORY_CONTENT: HomeStoryContent = {
  eyebrow: 'เปิดดูรายละเอียด',
  title: 'เรื่องเล่า ภาพ และสื่อประกอบ',
  actionLabel: 'เปิดดูรายละเอียด',
  body:
    'รายการวัฒนธรรมไม่ได้มีแค่ชื่อและพิกัด แต่ยังมีคำอธิบาย ไฮไลต์ หมวดหมู่ และลิงก์แหล่งข้อมูลต้นทาง เพื่อให้การสำรวจบนหน้าเว็บต่อยอดไปสู่การเรียนรู้จริงได้',
};

const DEFAULT_MEDIA_ITEMS: HomeMediaItem[] = [
  {
    id: 'culture-video-music',
    title: 'ดนตรีพื้นบ้านและการแสดงร่วมสมัย',
    description: 'วิดีโอประกอบ section เรื่องเล่า ภาพ และสื่อประกอบ',
    url: 'https://www.youtube.com/watch?v=hZB0LIYLSgM&list=RDhZB0LIYLSgM&start_radio=1',
    coverUrl: 'https://img.youtube.com/vi/hZB0LIYLSgM/maxresdefault.jpg',
    icon: 'solar:play-circle-bold',
    color: '#7B8476',
    isActive: true,
  },
  {
    id: 'culture-video-youth',
    title: 'เวทีวัฒนธรรมและพลังของเยาวชน',
    description: 'วิดีโอประกอบ section เรื่องเล่า ภาพ และสื่อประกอบ',
    url: 'https://www.youtube.com/watch?v=S1twzNXRbCY&list=RDS1twzNXRbCY&start_radio=1&t=1076s',
    coverUrl: 'https://img.youtube.com/vi/S1twzNXRbCY/maxresdefault.jpg',
    icon: 'solar:play-circle-bold',
    color: '#8F7C5C',
    isActive: true,
  },
];

const EMPTY_MEDIA_ITEM: EditingMediaItem = {
  id: '',
  title: '',
  description: '',
  url: '',
  coverUrl: '',
  icon: 'solar:play-circle-bold',
  color: '#7B8476',
  isActive: true,
  isNew: true,
};

function createId() {
  return `home-video-${Date.now()}`;
}

function isValidStoredContent(value: unknown): value is {
  story: HomeStoryContent;
  mediaItems: StoredMediaItem[];
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const content = value as { story?: unknown; mediaItems?: unknown };

  return !!content.story && Array.isArray(content.mediaItems);
}

function normalizeStoredMediaItems(mediaItems: StoredMediaItem[]): HomeMediaItem[] {
  return mediaItems
    .filter((mediaItem) => !mediaItem.type || mediaItem.type === 'video')
    .map(({ type, ...mediaItem }) => mediaItem);
}

export default function HomeContentAdminPage() {
  const { user, checkUserSession } = useAuthContext();
  const [story, setStory] = useState<HomeStoryContent>(DEFAULT_STORY_CONTENT);
  const [mediaItems, setMediaItems] = useState<HomeMediaItem[]>(DEFAULT_MEDIA_ITEMS);
  const [editingItem, setEditingItem] = useState<EditingMediaItem | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadContent() {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ sectionKey: SECTION_KEY });
        const response = await fetch(`/api/admin/home-content?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          data?: { content?: unknown } | null;
          message?: string;
        };

        if (!response.ok) {
          if (response.status === 401) {
            await checkUserSession?.();
          }

          throw new Error(data.message ?? 'โหลดข้อมูลไม่สำเร็จ');
        }

        if (isValidStoredContent(data.data?.content)) {
          setStory(data.data.content.story);
          setMediaItems(normalizeStoredMediaItems(data.data.content.mediaItems));
        }
      } catch (caughtError) {
        if (!(caughtError instanceof Error && caughtError.name === 'AbortError')) {
          setError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลไม่สำเร็จ');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();

    return () => controller.abort();
  }, [accessToken, checkUserSession]);

  const stats = useMemo(
    () => ({
      total: mediaItems.length,
      active: mediaItems.filter((mediaItem) => mediaItem.isActive).length,
      hidden: mediaItems.filter((mediaItem) => !mediaItem.isActive).length,
    }),
    [mediaItems]
  );

  const handleSaveDraft = async () => {
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/home-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sectionKey: SECTION_KEY,
          content: { story, mediaItems },
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        if (response.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(data.message ?? 'บันทึกไม่สำเร็จ');
      }

      setMessage('บันทึกข้อมูลหน้า Home Content ลง database แล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStory(DEFAULT_STORY_CONTENT);
    setMediaItems(DEFAULT_MEDIA_ITEMS);
    setEditingItem(null);
    setMessage('คืนค่าเริ่มต้นแล้ว กดบันทึก draft เพื่ออัปเดต database');
    setError('');
  };

  const startAdd = () => {
    setEditingItem({
      ...EMPTY_MEDIA_ITEM,
      id: createId(),
    });
  };

  const saveMediaItem = () => {
    if (!editingItem) {
      return;
    }

    if (!editingItem.title.trim()) {
      setError('กรุณากรอกชื่อรายการ');
      return;
    }

    if (!editingItem.url.trim()) {
      setError('กรุณากรอก Video URL');
      return;
    }

    const nextItem: HomeMediaItem = {
      id: editingItem.id,
      title: editingItem.title.trim(),
      description: editingItem.description.trim(),
      url: editingItem.url.trim(),
      coverUrl: editingItem.coverUrl.trim() || editingItem.url.trim(),
      icon: editingItem.icon,
      color: editingItem.color.trim() || '#608D8C',
      isActive: editingItem.isActive,
    };

    setMediaItems((currentItems) =>
      editingItem.isNew
        ? [nextItem, ...currentItems]
        : currentItems.map((mediaItem) => (mediaItem.id === nextItem.id ? nextItem : mediaItem))
    );
    setEditingItem(null);
    setError('');
    setMessage('อัปเดตรายการแล้ว อย่าลืมกดบันทึก draft');
  };

  const deleteMediaItem = (itemId: string) => {
    setMediaItems((currentItems) => currentItems.filter((mediaItem) => mediaItem.id !== itemId));
    setMessage('ลบรายการแล้ว อย่าลืมกดบันทึก draft');
    setError('');
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Home Content
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการ content ของหน้า home-view section เรื่องเล่า ภาพ และสื่อประกอบ
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button color="inherit" variant="outlined" onClick={handleReset}>
              คืนค่าเริ่มต้น
            </Button>
            <LoadingButton variant="contained" loading={isSaving} onClick={handleSaveDraft}>
              บันทึก draft
            </LoadingButton>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Alert severity="info">
          หน้านี้อ่านและบันทึกข้อมูลผ่าน database table home_content_sections
        </Alert>

        {isLoading && <Alert severity="info">กำลังโหลดข้อมูลจาก database...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                ข้อมูลพื้นที่และภูมิปัญญาท้องถิ่น
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                แก้ section ก่อนหน้าเรื่องเล่า ที่มีกล่องสื่อและข้อความภูมิปัญญาท้องถิ่น
              </Typography>
            </Box>

            <Button
              component="a"
              href="/admin/home-content/local-wisdom"
              variant="outlined"
              endIcon={<Iconify icon="solar:pen-bold" />}
            >
              แก้ section นี้
            </Button>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                สำรวจวัฒนธรรมไทยผ่านหมวดข้อมูล
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                แก้ section การ์ดหมวดข้อมูล 8 ใบ พร้อมรูป ไอคอน สี และคำอธิบาย
              </Typography>
            </Box>

            <Button
              component="a"
              href="/admin/home-content/culture-categories"
              variant="outlined"
              endIcon={<Iconify icon="solar:pen-bold" />}
            >
              แก้ section นี้
            </Button>
          </Stack>
        </Card>

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          }}
        >
          {[
            { label: 'วิดีโอทั้งหมด', value: stats.total },
            { label: 'เผยแพร่', value: stats.active },
            { label: 'ซ่อนอยู่', value: stats.hidden },
          ].map((item) => (
            <Card key={item.label} sx={{ p: 2.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.label}</Typography>
              <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 900 }}>
                {item.value}
              </Typography>
            </Card>
          ))}
        </Box>

        <Card sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              เนื้อหา section
            </Typography>

            <TextField
              fullWidth
              label="หัวข้อหลัก"
              value={story.title}
              onChange={(event) => setStory({ ...story, title: event.target.value })}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Eyebrow"
                value={story.eyebrow}
                onChange={(event) => setStory({ ...story, eyebrow: event.target.value })}
              />
              <TextField
                fullWidth
                label="ข้อความปุ่ม/CTA"
                value={story.actionLabel}
                onChange={(event) => setStory({ ...story, actionLabel: event.target.value })}
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={4}
              label="คำอธิบาย"
              value={story.body}
              onChange={(event) => setStory({ ...story, body: event.target.value })}
            />
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                เพิ่มวิดีโอ
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                เพิ่มสื่อวิดีโอสำหรับ section เรื่องเล่า ภาพ และสื่อประกอบ
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={startAdd}
            >
              เพิ่มวิดีโอ
            </Button>
          </Stack>
        </Card>

        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 2.5, pb: 0 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                จัดการวิดีโอใน section
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                แก้ไขรายละเอียด เปลี่ยนภาพปก ซ่อน/แสดง หรือลบวิดีโอที่ใช้ในหน้า home-view
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <Box
            sx={{
              p: 2.5,
              gap: 2,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
            }}
          >
            {mediaItems.map((mediaItem) => (
              <Card key={mediaItem.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ position: 'relative' }}>
                  <Image
                    alt={mediaItem.title}
                    src={mediaItem.coverUrl || mediaItem.url}
                    ratio="16/9"
                    sx={{ bgcolor: 'background.neutral' }}
                  />

                  <Box
                    sx={{
                      top: 12,
                      left: 12,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      position: 'absolute',
                      color: 'common.white',
                      bgcolor: mediaItem.color,
                      typography: 'caption',
                      fontWeight: 800,
                    }}
                  >
                    VIDEO
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        display: 'grid',
                        borderRadius: '50%',
                        color: 'common.white',
                        placeItems: 'center',
                        bgcolor: mediaItem.color,
                      }}
                    >
                      <Iconify icon={mediaItem.icon} width={22} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 900 }}>
                        {mediaItem.title}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {mediaItem.isActive ? 'เผยแพร่' : 'ซ่อนอยู่'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography sx={{ color: 'text.secondary', fontSize: 13, minHeight: 40 }}>
                    {mediaItem.description || 'ไม่มีคำอธิบาย'}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => setEditingItem({ ...mediaItem })}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => deleteMediaItem(mediaItem.id)}
                    >
                      ลบ
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}

            {!mediaItems.length && (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                ยังไม่มีวิดีโอใน section นี้
              </Box>
            )}
          </Box>
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        slotProps={{
          paper: {
            sx: { width: { xs: 1, sm: 520 } },
          },
        }}
      >
        {editingItem && (
          <Stack sx={{ height: 1 }}>
            <Stack spacing={0.5} sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {editingItem.isNew ? 'เพิ่มรายการใหม่' : 'แก้ไขรายการ'}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                วิดีโอ • {editingItem.id}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              <TextField
                fullWidth
                label="ชื่อรายการ"
                value={editingItem.title}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, title: event.target.value })
                }
              />

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="คำอธิบาย"
                value={editingItem.description}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, description: event.target.value })
                }
              />

              <TextField
                fullWidth
                label="Video URL"
                value={editingItem.url}
                onChange={(event) => setEditingItem({ ...editingItem, url: event.target.value })}
              />

              <TextField
                fullWidth
                label="Cover URL"
                value={editingItem.coverUrl}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, coverUrl: event.target.value })
                }
              />

              {(editingItem.coverUrl || editingItem.url) && (
                <Box
                  component="img"
                  src={editingItem.coverUrl || editingItem.url}
                  alt={editingItem.title || 'Media preview'}
                  sx={{
                    width: 1,
                    height: 180,
                    borderRadius: 1,
                    objectFit: 'cover',
                    bgcolor: 'background.neutral',
                  }}
                />
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Iconify icon"
                  value={editingItem.icon}
                  onChange={(event) =>
                    setEditingItem({
                      ...editingItem,
                      icon: event.target.value as IconifyName,
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="สี"
                  value={editingItem.color}
                  onChange={(event) =>
                    setEditingItem({ ...editingItem, color: event.target.value })
                  }
                />
              </Stack>

              <TextField
                select
                fullWidth
                label="สถานะ"
                SelectProps={{ native: true }}
                value={editingItem.isActive ? 'active' : 'hidden'}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, isActive: event.target.value === 'active' })
                }
              >
                <option value="active">เผยแพร่</option>
                <option value="hidden">ซ่อน</option>
              </TextField>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ p: 2.5 }}>
              <Button fullWidth variant="contained" onClick={saveMediaItem}>
                บันทึกรายการ
              </Button>
              <Button fullWidth color="inherit" onClick={() => setEditingItem(null)}>
                ยกเลิก
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

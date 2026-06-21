'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { getCategoriesAction } from '../../categories/actions';

// ----------------------------------------------------------------------

type CultureCategoriesContent = {
  title: string;
  description: string;
};

type CultureCategoryItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  icon: IconifyName;
  color: string;
  isActive: boolean;
};

type EditingCategoryItem = CultureCategoryItem & {
  isNew?: boolean;
};

type SyncedCategory = {
  category_key: string;
  label: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  image_url?: string | null;
  source_label?: string | null;
  count?: number | null;
  is_active?: boolean | null;
};

type HomeContentResponse = {
  data?: { content?: unknown } | null;
  message?: string;
};

const SECTION_KEY = 'culture-categories';

const DEFAULT_CONTENT: CultureCategoriesContent = {
  title: 'สำรวจวัฒนธรรมไทยผ่านหมวดข้อมูล',
  description:
    'ข้อมูลแต่ละรายการถูกจัดให้อ่านง่ายขึ้นตามหมวดวัฒนธรรมและพื้นที่ เพื่อช่วยให้เห็นทั้งสถานที่ท่องเที่ยว แหล่งเรียนรู้ อาหารพื้นบ้าน งานช่าง การแสดง ประเพณี และภูมิปัญญาที่กระจายอยู่ในแต่ละจังหวัด',
};

const DEFAULT_CATEGORY_ITEMS: CultureCategoryItem[] = [
  {
    id: 'culture-category-attraction',
    title: 'สถานที่ท่องเที่ยว',
    description: 'แหล่งท่องเที่ยว วัด เมืองเก่า และจุดหมายสำคัญทางวัฒนธรรม',
    icon: 'custom:location-fill',
    imageUrl: '/assets/background/akhahas-sri-1.jpg',
    color: '#608D8C',
    isActive: true,
  },
  {
    id: 'culture-category-food',
    title: 'อาหารพื้นบ้าน',
    description: 'รสชาติท้องถิ่น วัตถุดิบตามฤดูกาล และครัวชุมชนไทย',
    icon: 'solar:tea-cup-bold',
    imageUrl: '/assets/background/akhahas-sri-2.jpg',
    color: '#D19F46',
    isActive: true,
  },
  {
    id: 'culture-category-performance',
    title: 'ศิลปะการแสดง',
    description: 'นาฏศิลป์ ดนตรีไทย การแสดงพื้นบ้านที่งดงามและทรงคุณค่า',
    icon: 'solar:palette-bold',
    imageUrl: '/assets/background/akhahas-sri-3.jpg',
    color: '#CE7B48',
    isActive: true,
  },
  {
    id: 'culture-category-tradition',
    title: 'ประเพณีท้องถิ่น',
    description: 'เทศกาล งานบุญ และขนบธรรมเนียมที่สืบทอดในแต่ละพื้นที่',
    icon: 'solar:confetti-minimalistic-outline',
    imageUrl: '/assets/background/akhahas-sri-4.jpg',
    color: '#947488',
    isActive: true,
  },
  {
    id: 'culture-category-wisdom',
    title: 'ภูมิปัญญาชุมชน',
    description: 'ความรู้ท้องถิ่น วิธีคิด และทักษะที่เกิดจากชีวิตในชุมชน',
    icon: 'solar:notebook-bold-duotone',
    imageUrl: '/assets/background/akhahas-sri-5.jpg',
    color: '#7E9578',
    isActive: true,
  },
  {
    id: 'culture-category-craft',
    title: 'งานช่างฝีมือ',
    description: 'งานจักสาน ผ้าทอ เครื่องปั้น และฝีมือช่างพื้นถิ่น',
    icon: 'solar:settings-bold',
    imageUrl: '/assets/background/akhahas-sri-6.jpg',
    color: '#5B7B91',
    isActive: true,
  },
  {
    id: 'culture-category-folk-art',
    title: 'ศิลปะพื้นบ้าน',
    description: 'ลวดลาย สีสัน เครื่องแต่งกาย และงานศิลป์จากชุมชน',
    icon: 'solar:gallery-wide-bold',
    imageUrl: '/assets/background/akhahas-sri-7.jpg',
    color: '#AB8395',
    isActive: true,
  },
  {
    id: 'culture-category-ritual',
    title: 'พิธีกรรม',
    description: 'ความเชื่อ พิธีบูชา และเรื่องเล่าศักดิ์สิทธิ์ของท้องถิ่น',
    icon: 'solar:shield-check-bold',
    imageUrl: '/assets/akhahas-sri/hero-1.jpg',
    color: '#B2865A',
    isActive: true,
  },
];

const CATEGORY_ICON_MAP: Partial<Record<string, IconifyName>> = {
  tourist_attraction: 'custom:location-fill',
  cultural_attraction: 'custom:location-fill',
  local_food: 'solar:tea-cup-bold',
  food: 'solar:tea-cup-bold',
  performing_art: 'solar:palette-bold',
  local_tradition: 'solar:confetti-minimalistic-outline',
  festival: 'solar:confetti-minimalistic-outline',
  community_wisdom: 'solar:notebook-bold-duotone',
  craftsmanship: 'solar:settings-bold',
  craft: 'solar:settings-bold',
  folk_art: 'solar:gallery-wide-bold',
  ritual: 'solar:shield-check-bold',
  heritage: 'solar:shield-check-bold',
  temple: 'custom:location-fill',
  museum: 'solar:gallery-wide-bold',
  learning_center: 'solar:notebook-bold-duotone',
  moral_community: 'solar:notebook-bold-duotone',
};

const CATEGORY_IMAGE_MAP: Partial<Record<string, string>> = {
  tourist_attraction: '/assets/background/akhahas-sri-1.jpg',
  cultural_attraction: '/assets/background/akhahas-sri-1.jpg',
  local_food: '/assets/background/akhahas-sri-2.jpg',
  food: '/assets/background/akhahas-sri-2.jpg',
  performing_art: '/assets/background/akhahas-sri-3.jpg',
  local_tradition: '/assets/background/akhahas-sri-4.jpg',
  festival: '/assets/background/akhahas-sri-4.jpg',
  community_wisdom: '/assets/background/akhahas-sri-5.jpg',
  craftsmanship: '/assets/background/akhahas-sri-6.jpg',
  craft: '/assets/background/akhahas-sri-6.jpg',
  folk_art: '/assets/background/akhahas-sri-7.jpg',
  ritual: '/assets/akhahas-sri/hero-1.jpg',
};

const EMPTY_CATEGORY_ITEM: EditingCategoryItem = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  icon: 'solar:gallery-wide-bold',
  color: '#608D8C',
  isActive: true,
  isNew: true,
};

function createId() {
  return `culture-category-${Date.now()}`;
}

function getCategoryId(categoryKey: string) {
  return `culture-category-${categoryKey}`;
}

function getCategoryDescription(category: SyncedCategory) {
  const sourceText = category.source_label ? ` จาก ${category.source_label}` : '';
  const countText =
    typeof category.count === 'number' ? ` (${category.count.toLocaleString('th-TH')} รายการ)` : '';

  return category.description ?? `หมวด ${category.label}${sourceText}${countText}`;
}

function createSystemCategoryItem(
  category: SyncedCategory,
  currentItem?: CultureCategoryItem
): CultureCategoryItem {
  return {
    id: getCategoryId(category.category_key),
    title: category.label,
    description: currentItem?.description ?? getCategoryDescription(category),
    imageUrl:
      currentItem?.imageUrl ??
      category.image_url ??
      CATEGORY_IMAGE_MAP[category.category_key] ??
      '/assets/background/akhahas-sri-1.jpg',
    icon:
      currentItem?.icon ??
      (category.icon as IconifyName | null) ??
      CATEGORY_ICON_MAP[category.category_key] ??
      'solar:gallery-wide-bold',
    color: currentItem?.color ?? category.color ?? '#608D8C',
    isActive: currentItem?.isActive ?? category.is_active ?? true,
  };
}

function isValidStoredContent(value: unknown): value is {
  content: CultureCategoriesContent;
  items: CultureCategoryItem[];
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const storedValue = value as { content?: unknown; items?: unknown };

  return !!storedValue.content && Array.isArray(storedValue.items);
}

export default function CultureCategoriesContentPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<CultureCategoriesContent>(DEFAULT_CONTENT);
  const [items, setItems] = useState<CultureCategoryItem[]>(DEFAULT_CATEGORY_ITEMS);
  const [editingItem, setEditingItem] = useState<EditingCategoryItem | null>(null);
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
      setContent(contentQuery.data.data.content.content);
      setItems(contentQuery.data.data.content.items);
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
        body: { sectionKey: SECTION_KEY, content: { content, items } },
      }),
    onSuccess: async () => {
      setMessage('บันทึก section หมวดข้อมูลลง database แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-home-content', SECTION_KEY] });
    },
    onError: (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    },
  });

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      hidden: items.filter((item) => !item.isActive).length,
    }),
    [items]
  );

  const handleSaveDraft = async () => {
    setError('');
    setMessage('');
    await saveContentMutation.mutateAsync().catch(() => undefined);
  };

  const handleReset = () => {
    setContent(DEFAULT_CONTENT);
    setItems(DEFAULT_CATEGORY_ITEMS);
    setEditingItem(null);
    setMessage('คืนค่าเริ่มต้นแล้ว กดบันทึก draft เพื่ออัปเดต database');
    setError('');
  };

  const startAdd = () => {
    setEditingItem({ ...EMPTY_CATEGORY_ITEM, id: createId() });
  };

  const syncSystemCategories = async () => {
    const currentItemMap = new Map(items.map((item) => [item.id, item]));
    const result = await getCategoriesAction(accessToken);

    if (!result.ok) {
      if (result.status === 401) {
        await checkUserSession?.();
      }

      setError(result.message);
      setMessage('');
      return;
    }

    const categories = result.data;
    const systemItems = categories.map((category) =>
      createSystemCategoryItem(category, currentItemMap.get(getCategoryId(category.category_key)))
    );

    setItems(systemItems);
    setMessage(`ดึงหมวดชุดเดียวกับ /admin/categories แล้ว ${systemItems.length} หมวด`);
    setError('');
  };

  const saveItem = () => {
    if (!editingItem) {
      return;
    }

    if (!editingItem.title.trim()) {
      setError('กรุณากรอกชื่อหมวด');
      return;
    }

    if (!editingItem.imageUrl.trim()) {
      setError('กรุณากรอก Image URL');
      return;
    }

    const nextItem: CultureCategoryItem = {
      id: editingItem.id,
      title: editingItem.title.trim(),
      description: editingItem.description.trim(),
      imageUrl: editingItem.imageUrl.trim(),
      icon: editingItem.icon,
      color: editingItem.color.trim() || '#608D8C',
      isActive: editingItem.isActive,
    };

    setItems((currentItems) =>
      editingItem.isNew
        ? [nextItem, ...currentItems]
        : currentItems.map((item) => (item.id === nextItem.id ? nextItem : item))
    );
    setEditingItem(null);
    setError('');
    setMessage('อัปเดตรายการแล้ว อย่าลืมกดบันทึก draft');
  };

  const deleteItem = (itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setMessage('ลบรายการแล้ว อย่าลืมกดบันทึก draft');
    setError('');
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              หมวดวัฒนธรรม
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              แก้ content section “สำรวจวัฒนธรรมไทยผ่านหมวดข้อมูล” ในหน้า home-view
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href="/admin/home-content" color="inherit" variant="outlined">
              กลับ Home Content
            </Button>
            <Button color="inherit" variant="outlined" onClick={handleReset}>
              คืนค่าเริ่มต้น
            </Button>
            <LoadingButton
              variant="contained"
              loading={saveContentMutation.isPending}
              onClick={handleSaveDraft}
            >
              บันทึก draft
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
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          {[
            { label: 'หมวดทั้งหมด', value: stats.total },
            { label: 'เผยแพร่', value: stats.active },
            { label: 'ซ่อนอยู่', value: stats.hidden },
          ].map((stat) => (
            <Card key={stat.label} sx={{ p: 2.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{stat.label}</Typography>
              <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 900 }}>
                {stat.value}
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
              value={content.title}
              onChange={(event) => setContent({ ...content, title: event.target.value })}
            />

            <TextField
              fullWidth
              multiline
              minRows={4}
              label="คำอธิบาย"
              value={content.description}
              onChange={(event) => setContent({ ...content, description: event.target.value })}
            />
          </Stack>
        </Card>

        <Card sx={{ overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 2.5, pb: 0 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                จัดการการ์ดหมวดข้อมูล {items?.length} รายการ
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                เพิ่ม แก้ไข ลบ หรือซ่อนหมวดที่แสดงใน grid หน้าแรก
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:download-bold" />}
                onClick={syncSystemCategories}
              >
                ดึงหมวดจาก Cultural Places
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold" />}
                onClick={startAdd}
              >
                เพิ่มหมวด
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ mt: 2.5 }} />

          <Box
            sx={{
              p: 2.5,
              gap: 2,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {items.map((item) => (
              <Card key={item.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box
                  sx={{
                    p: 2,
                    minHeight: 210,
                    display: 'flex',
                    overflow: 'hidden',
                    position: 'relative',
                    color: 'common.white',
                    bgcolor: item.color,
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    backgroundImage: `
                      radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
                      radial-gradient(circle at 16% 74%, rgba(255,255,255,0.13) 0 1px, transparent 1.5px),
                      linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 44%)
                    `,
                    backgroundSize: '22px 22px, 28px 28px, 100% 100%',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.2,
                      background:
                        'repeating-linear-gradient(160deg, transparent 0 22px, rgba(255,255,255,0.5) 23px 24px, transparent 25px 48px)',
                    },
                    '&::after': {
                      content: '""',
                      right: -34,
                      bottom: -44,
                      width: 132,
                      height: 132,
                      borderRadius: '50%',
                      position: 'absolute',
                      border: '1px solid rgba(255,255,255,0.24)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      top: 18,
                      right: 18,
                      zIndex: 1,
                      opacity: 0.72,
                      position: 'absolute',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    <Iconify icon={item.icon} width={86} />
                  </Box>

                  <Stack spacing={1} sx={{ zIndex: 1, maxWidth: '78%' }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 900, lineHeight: 1.2 }}>
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{ color: 'rgba(255,255,255,0.84)', fontSize: 12, lineHeight: 1.5 }}
                    >
                      {item.description || 'ไม่มีคำอธิบาย'}
                    </Typography>
                  </Stack>
                </Box>

                <Stack spacing={1.25} alignItems="center" sx={{ px: 2, py: 2 }}>
                  <Typography
                    sx={{
                      color: item.isActive ? 'success.main' : 'text.disabled',
                      fontSize: 12,
                    }}
                  >
                    {item.isActive ? 'เผยแพร่' : 'ซ่อนอยู่'}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => setEditingItem({ ...item })}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => deleteItem(item.id)}
                    >
                      ลบ
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}

            {!items.length && (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                ยังไม่มีหมวดข้อมูลใน section นี้
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
                {editingItem.isNew ? 'เพิ่มหมวดใหม่' : 'แก้ไขหมวด'}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                {editingItem.id}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              <TextField
                fullWidth
                label="ชื่อหมวด"
                value={editingItem.title}
                onChange={(event) => setEditingItem({ ...editingItem, title: event.target.value })}
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
                label="Image URL"
                value={editingItem.imageUrl}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, imageUrl: event.target.value })
                }
              />

              <Box
                sx={{
                  p: 2,
                  minHeight: 180,
                  display: 'flex',
                  overflow: 'hidden',
                  borderRadius: 1,
                  position: 'relative',
                  color: 'common.white',
                  bgcolor: editingItem.color,
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  backgroundImage: `
                    radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
                    radial-gradient(circle at 16% 74%, rgba(255,255,255,0.13) 0 1px, transparent 1.5px),
                    linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 44%)
                  `,
                  backgroundSize: '22px 22px, 28px 28px, 100% 100%',
                }}
              >
                <Box
                  sx={{
                    top: 18,
                    right: 18,
                    opacity: 0.72,
                    position: 'absolute',
                    color: 'rgba(255,255,255,0.92)',
                  }}
                >
                  <Iconify icon={editingItem.icon} width={82} />
                </Box>

                <Stack spacing={1} sx={{ zIndex: 1, maxWidth: '78%' }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 900, lineHeight: 1.2 }}>
                    {editingItem.title || 'ชื่อหมวด'}
                  </Typography>
                  <Typography
                    sx={{ color: 'rgba(255,255,255,0.84)', fontSize: 12, lineHeight: 1.5 }}
                  >
                    {editingItem.description || 'คำอธิบายหมวด'}
                  </Typography>
                </Stack>
              </Box>

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
              <Button fullWidth variant="contained" onClick={saveItem}>
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

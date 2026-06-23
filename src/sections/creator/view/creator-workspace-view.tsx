'use client';

import type { CreatorArticle, CreatorProfile } from '../types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';
import {
  getCreatorProfile,
  getCreatorArticles,
  saveCreatorArticle,
  getCreatorCategories,
  updateCreatorProfile,
  type CreatorCategory,
} from '../creator-api';

type Props = {
  view: 'articles' | 'write' | 'profile';
};

const emptyArticle = {
  id: '',
  categoryKey: '',
  categoryLabel: '',
  title: '',
  excerpt: '',
  coverImageUrl: '',
  contentHtml: '',
};

function getStatusColor(status: string) {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending' || status === 'pending_review') return 'warning';
  return 'default';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    draft: 'ฉบับร่าง',
    pending_review: 'รอตรวจบทความ',
    published: 'เผยแพร่แล้ว',
  };

  return labels[status] ?? status;
}

function getPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CreatorWorkspaceView({ view }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [articles, setArticles] = useState<CreatorArticle[]>([]);
  const [categories, setCategories] = useState<CreatorCategory[]>([]);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    phone: '',
    websiteUrl: '',
    facebookUrl: '',
    avatarUrl: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editId = searchParams.get('id') ?? '';
  const isApproved = profile?.status === 'approved';
  const selectedCategory = categories.find((category) => category.key === articleForm.categoryKey);
  const articleWordCount = getPlainText(articleForm.contentHtml).split(' ').filter(Boolean).length;
  const articleStats = useMemo(
    () => ({
      total: articles.length,
      draft: articles.filter((article) => article.status === 'draft').length,
      review: articles.filter((article) => article.status === 'pending_review').length,
      published: articles.filter((article) => article.status === 'published').length,
      rejected: articles.filter((article) => article.status === 'rejected').length,
    }),
    [articles]
  );
  const writeChecklist = [
    { label: 'ตั้งชื่อบทความ', done: Boolean(articleForm.title.trim()) },
    { label: 'เลือกหมวดหมู่', done: Boolean(articleForm.categoryKey) },
    { label: 'เขียนคำโปรย', done: Boolean(articleForm.excerpt.trim()) },
    { label: 'มีเนื้อหาบทความ', done: articleWordCount > 0 },
  ];

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const [profileResult, articlesResult, categoriesResult] = await Promise.all([
        getCreatorProfile(accessToken),
        getCreatorArticles(accessToken),
        getCreatorCategories(),
      ]);

      setProfile(profileResult.data);
      setArticles(articlesResult.data);
      setCategories(categoriesResult.data);
      setProfileForm({
        displayName: profileResult.data.displayName,
        bio: profileResult.data.bio,
        phone: profileResult.data.phone,
        websiteUrl: profileResult.data.websiteUrl,
        facebookUrl: profileResult.data.facebookUrl,
        avatarUrl: profileResult.data.avatarUrl,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace('/creator/sign-in');
      return;
    }

    if (!loading && accessToken && !isCreatorUser(user)) {
      router.replace(getRoleHomePath(user));
      return;
    }

    loadData();
  }, [accessToken, loadData, loading, router, user]);

  const editingArticle = useMemo(
    () => articles.find((article) => article.id === editId),
    [articles, editId]
  );

  useEffect(() => {
    if (editingArticle && view === 'write') {
      setArticleForm({
        id: editingArticle.id,
        categoryKey: editingArticle.categoryKey,
        categoryLabel: editingArticle.categoryLabel,
        title: editingArticle.title,
        excerpt: editingArticle.excerpt,
        coverImageUrl: editingArticle.coverImageUrl,
        contentHtml: editingArticle.contentHtml,
      });
    }
  }, [editingArticle, view]);

  const saveArticle = async (action: 'draft' | 'submit') => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await saveCreatorArticle(accessToken, {
        ...articleForm,
        categoryLabel: selectedCategory?.label ?? articleForm.categoryLabel,
        action,
      });
      setMessage(action === 'submit' ? 'ส่งบทความให้ admin review แล้ว' : 'บันทึกฉบับร่างแล้ว');
      setArticleForm({
        id: result.data.id,
        categoryKey: result.data.categoryKey,
        categoryLabel: result.data.categoryLabel,
        title: result.data.title,
        excerpt: result.data.excerpt,
        coverImageUrl: result.data.coverImageUrl,
        contentHtml: result.data.contentHtml,
      });
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกบทความไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveProfile = async () => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await updateCreatorProfile(accessToken, profileForm);
      setProfile(result.data);
      setMessage('บันทึกโปรไฟล์แล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateArticleCategory = (categoryKey: string) => {
    const nextCategory = categories.find((category) => category.key === categoryKey);

    setArticleForm((current) => ({
      ...current,
      categoryKey,
      categoryLabel: nextCategory?.label ?? '',
    }));
  };

  const renderHeader = (creatorProfile: CreatorProfile | null) => (
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
      <Box>
        <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            พื้นที่ Creator
          </Typography>
        </Stack>
        <Typography sx={{ mt: 0.5 }}>
          เขียน บันทึก และส่งบทความวัฒนธรรมให้ทีมงานตรวจสอบก่อนเผยแพร่
        </Typography>
      </Box>
    </Stack>
  );

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
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 1180, position: 'relative', zIndex: 1 }}>
        {renderHeader(profile)}
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        {view === 'articles' && (
          <Stack spacing={3}>
            <Card
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 2,
                color: creatorTone.deep,
                bgcolor: 'rgba(248,246,238,0.92)',
                boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#6f8790',
                      bgcolor: 'rgba(111,135,144,0.14)',
                    }}
                  >
                    <Iconify icon="solar:notebook-bold-duotone" width={30} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 950 }}>
                      งานเขียนของฉัน
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                      ติดตามฉบับร่าง บทความที่ส่งตรวจ และงานที่เผยแพร่แล้วในที่เดียว
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  component={RouterLink}
                  href="/creator/write"
                  variant="contained"
                  startIcon={<Iconify icon="solar:pen-bold" />}
                >
                  เขียนบทความใหม่
                </Button>
              </Stack>
            </Card>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(5, minmax(0, 1fr))',
                },
              }}
            >
              {[
                { label: 'ทั้งหมด', value: articleStats.total, icon: 'solar:file-text-bold' },
                {
                  label: 'ฉบับร่าง',
                  value: articleStats.draft,
                  icon: 'solar:archive-down-minimlistic-bold',
                },
                { label: 'รอตรวจ', value: articleStats.review, icon: 'solar:clock-circle-bold' },
                {
                  label: 'เผยแพร่แล้ว',
                  value: articleStats.published,
                  icon: 'solar:check-circle-bold',
                },
                {
                  label: 'ต้องแก้ไข',
                  value: articleStats.rejected,
                  icon: 'solar:info-circle-bold',
                },
              ].map((item) => (
                <Card
                  key={item.label}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(248,246,238,0.9)',
                    color: creatorTone.deep,
                    boxShadow: '0 16px 44px rgba(32,42,43,0.12)',
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        borderRadius: 1.25,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#6f8790',
                        bgcolor: 'rgba(111,135,144,0.14)',
                      }}
                    >
                      <Iconify icon={item.icon as any} width={21} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Box>

            {!articles.length && !isLoading ? (
              <Card
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 2,
                  textAlign: 'center',
                  color: creatorTone.deep,
                  bgcolor: 'rgba(248,246,238,0.94)',
                  boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
                }}
              >
                <Box
                  sx={{
                    mx: 'auto',
                    mb: 2,
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#6f8790',
                    bgcolor: 'rgba(111,135,144,0.14)',
                  }}
                >
                  <Iconify icon="solar:file-text-bold" width={38} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  ยังไม่มีบทความ
                </Typography>
                <Typography sx={{ mt: 1, mx: 'auto', maxWidth: 520, color: 'text.secondary' }}>
                  เริ่มจากเรื่องเล่าท้องถิ่น สถานที่ ประเพณี หรือภูมิปัญญาที่คุณอยากแบ่งปัน
                  แล้วบันทึกเป็นฉบับร่างก่อนส่งตรวจได้
                </Typography>
                <Button
                  component={RouterLink}
                  href="/creator/write"
                  variant="contained"
                  startIcon={<Iconify icon="solar:pen-bold" />}
                  sx={{ mt: 3 }}
                >
                  เริ่มเขียนบทความ
                </Button>
              </Card>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {articles.map((article) => (
                  <Card
                    key={article.id}
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 2,
                      color: creatorTone.deep,
                      bgcolor: 'rgba(248,246,238,0.94)',
                      boxShadow: '0 20px 60px rgba(32,42,43,0.14)',
                      border: '1px solid rgba(248,246,238,0.45)',
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 1, flexWrap: 'wrap' }}
                          >
                            <Chip
                              size="small"
                              label={article.categoryLabel || article.categoryKey || 'ไม่ระบุหมวด'}
                              sx={{
                                bgcolor: 'rgba(96,141,140,0.14)',
                                color: '#2a3736',
                                fontWeight: 800,
                              }}
                            />
                            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                              อัปเดต {fDateTime(article.updatedAt)}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 20, fontWeight: 950, lineHeight: 1.3 }}>
                            {article.title || 'ยังไม่มีชื่อบทความ'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={getStatusLabel(article.status)}
                          color={getStatusColor(article.status) as any}
                          sx={{ flexShrink: 0, fontWeight: 800 }}
                        />
                      </Stack>

                      <Typography
                        sx={{
                          color: 'text.secondary',
                          fontSize: 14,
                          lineHeight: 1.65,
                          minHeight: 46,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {article.excerpt || 'ยังไม่มีคำโปรยสำหรับบทความนี้'}
                      </Typography>

                      {article.rejectReason && (
                        <Alert severity="error">{article.rejectReason}</Alert>
                      )}

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        {article.status === 'published' && article.slug && (
                          <Button
                            size="small"
                            component={RouterLink}
                            href={`/creator-stories/${encodeURIComponent(article.slug)}`}
                            variant="outlined"
                            startIcon={<Iconify icon="solar:eye-bold" />}
                          >
                            ดูบทความ
                          </Button>
                        )}
                        <Button
                          size="small"
                          component={RouterLink}
                          href={`/creator/write?id=${article.id}`}
                          variant="contained"
                          startIcon={<Iconify icon="solar:pen-bold" />}
                        >
                          แก้ไข
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        )}

        {view === 'write' && (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Card
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 2,
                color: creatorTone.deep,
                bgcolor: 'rgba(248,246,238,0.92)',
                boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#6f8790',
                      bgcolor: 'rgba(111,135,144,0.14)',
                    }}
                  >
                    <Iconify icon="solar:pen-bold" width={28} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 950 }}>
                      {articleForm.id ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                      เล่าเรื่องให้ครบ ใส่หมวดหมู่ แล้วบันทึกฉบับร่างหรือส่งให้ทีมงานตรวจ
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" gap={2}>
                  <Chip
                    icon={
                      <Iconify
                        icon={isApproved ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'}
                      />
                    }
                    label={isApproved ? 'พร้อมส่งตรวจ' : 'รออนุมัติ Creator'}
                    color={isApproved ? 'success' : 'warning'}
                    sx={{ fontWeight: 800 }}
                  />
                  <Button
                    component={RouterLink}
                    href="/creator/articles/"
                    variant="contained"
                    startIcon={<Iconify icon="solar:pen-bold" />}
                  >
                    รายการทั้งหมด
                  </Button>
                </Stack>
              </Stack>
            </Card>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
                alignItems: 'start',
              }}
            >
              <Card
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 2,
                  bgcolor: 'rgba(248,246,238,0.94)',
                  boxShadow: '0 24px 80px rgba(32,42,43,0.18)',
                }}
              >
                <Stack spacing={2.5}>
                  {!isApproved && (
                    <Alert severity="warning">
                      ต้องรอ admin approve บัญชี creator ก่อนจึงจะบันทึกบทความได้
                    </Alert>
                  )}

                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Iconify icon="solar:file-text-bold" width={24} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        เนื้อหาหลัก
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        ชื่อเรื่อง คำโปรย และบทความฉบับเต็ม
                      </Typography>
                    </Box>
                  </Stack>

                  <TextField
                    label="ชื่อบทความ"
                    placeholder="เช่น วิถีชุมชนและรสชาติอาหารพื้นบ้าน..."
                    value={articleForm.title}
                    onChange={(event) =>
                      setArticleForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                  <TextField
                    multiline
                    minRows={3}
                    label="คำโปรย"
                    placeholder="สรุปสั้น ๆ ให้ผู้อ่านรู้ว่าบทความนี้เล่าเรื่องอะไร"
                    value={articleForm.excerpt}
                    onChange={(event) =>
                      setArticleForm((current) => ({ ...current, excerpt: event.target.value }))
                    }
                  />
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography sx={{ fontWeight: 800 }}>เนื้อหา</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                        ประมาณ {articleWordCount.toLocaleString('th-TH')} คำ
                      </Typography>
                    </Stack>
                    <Editor
                      fullItem
                      value={articleForm.contentHtml}
                      sx={{ minHeight: 540, bgcolor: 'background.paper' }}
                      onChange={(value) =>
                        setArticleForm((current) => ({ ...current, contentHtml: value }))
                      }
                      placeholder="เขียนเรื่องราว วัฒนธรรม ประเพณี หรือภูมิปัญญาท้องถิ่น..."
                    />
                  </Box>
                </Stack>
              </Card>

              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(248,246,238,0.92)',
                    borderColor: 'rgba(248,246,238,0.38)',
                  }}
                >
                  <Stack spacing={2.25}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Iconify icon="solar:settings-bold" width={22} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          ส่งบทความ
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          ตั้งค่าก่อนบันทึกหรือส่งตรวจ
                        </Typography>
                      </Box>
                    </Stack>

                    <TextField
                      select
                      label="หมวดหมู่"
                      value={articleForm.categoryKey}
                      helperText={
                        selectedCategory?.description || 'เลือกหมวดหมู่จากฐานข้อมูลของเว็บไซต์'
                      }
                      onChange={(event) => updateArticleCategory(event.target.value)}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.key} value={category.key}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: category.color,
                              }}
                            />
                            <span>{category.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    {selectedCategory && (
                      <Chip
                        label={selectedCategory.label}
                        sx={{
                          alignSelf: 'flex-start',
                          color: '#2a3736',
                          bgcolor: `${selectedCategory.color}33`,
                          border: `1px solid ${selectedCategory.color}66`,
                        }}
                      />
                    )}

                    <TextField
                      label="Cover image URL"
                      placeholder="https://..."
                      value={articleForm.coverImageUrl}
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          coverImageUrl: event.target.value,
                        }))
                      }
                    />

                    {articleForm.coverImageUrl && (
                      <Box
                        component="img"
                        src={articleForm.coverImageUrl}
                        alt={articleForm.title || 'cover'}
                        sx={{
                          width: 1,
                          height: 180,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          bgcolor: 'grey.200',
                        }}
                      />
                    )}

                    <Divider />

                    <Box>
                      <Typography sx={{ mb: 1.25, fontWeight: 900 }}>เช็กก่อนส่ง</Typography>
                      <Stack spacing={1}>
                        {writeChecklist.map((item) => (
                          <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                            <Iconify
                              icon={
                                item.done ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'
                              }
                              width={18}
                              sx={{ color: item.done ? 'success.main' : 'text.disabled' }}
                            />
                            <Typography
                              sx={{
                                color: item.done ? 'text.primary' : 'text.secondary',
                                fontSize: 13,
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>

                    <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
                      บทความที่ส่งตรวจจะยังไม่เผยแพร่ทันที
                      ทีมงานจะอ่านและเปลี่ยนสถานะเมื่อพร้อมเผยแพร่
                    </Alert>

                    <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5}>
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled={!isApproved || isSubmitting}
                        loading={isSubmitting}
                        onClick={() => saveArticle('draft')}
                      >
                        บันทึกฉบับร่าง
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!isApproved || isSubmitting}
                        loading={isSubmitting}
                        onClick={() => saveArticle('submit')}
                      >
                        ส่งให้ Admin Review
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Box>
        )}

        {view === 'profile' && (
          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <TextField
                label="ชื่อที่แสดง"
                value={profileForm.displayName}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
              <TextField
                multiline
                minRows={3}
                label="แนะนำตัว"
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, bio: event.target.value }))
                }
              />
              <Divider />
              <TextField
                label="เบอร์โทร"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <TextField
                label="Website URL"
                value={profileForm.websiteUrl}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, websiteUrl: event.target.value }))
                }
              />
              <TextField
                label="Facebook URL"
                value={profileForm.facebookUrl}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, facebookUrl: event.target.value }))
                }
              />
              <TextField
                label="Avatar URL"
                value={profileForm.avatarUrl}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))
                }
              />
              <Button
                variant="contained"
                loading={isSubmitting}
                onClick={saveProfile}
                sx={{ alignSelf: 'flex-start' }}
              >
                บันทึกโปรไฟล์
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>
    </Box>
  );
}

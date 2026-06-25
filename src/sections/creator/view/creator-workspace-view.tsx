'use client';

import type { ChangeEvent } from 'react';
import type { CreatorArticle, CreatorProfile } from '../types';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider as RHFForm } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { Upload } from 'src/components/upload';
import { Iconify } from 'src/components/iconify';
import { Form, RHFEditor, RHFSelect, RHFTextField } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/supabase';
import { isCreatorUser, getRoleHomePath } from 'src/auth/utils/role-redirect';

import { creatorTone, creatorPosterPattern, creatorPageBackground } from '../creator-theme';
import {
  getInitials,
  getPlainText,
  getStatusColor,
  getStatusLabel,
  notifyCreatorProfileUpdated,
} from './creator-workspace-utils';
import {
  getCreatorProfile,
  getCreatorArticles,
  saveCreatorArticle,
  uploadCreatorAvatar,
  getCreatorCategories,
  updateCreatorProfile,
  type CreatorCategory,
  changeCreatorPassword,
  uploadCreatorArticleCoverImage,
} from '../creator-api';
import {
  emptyArticleValues,
  emptyProfileValues,
  emptyPasswordValues,
  CreatorArticleSchema,
  CreatorProfileSchema,
  CreatorPasswordSchema,
  type CreatorArticleFormValues,
  type CreatorProfileFormValues,
  type CreatorPasswordFormValues,
} from './creator-workspace-schemas';

type Props = {
  view: 'articles' | 'write' | 'profile';
};

const MAX_ARTICLE_COVER_IMAGE_SIZE = 2 * 1024 * 1024;

function isPublishedArticleStatus(status: string) {
  return status === 'published' || status === 'approved';
}

export function CreatorWorkspaceView({ view }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [articles, setArticles] = useState<CreatorArticle[]>([]);
  const [categories, setCategories] = useState<CreatorCategory[]>([]);
  const [showPasswordFields, setShowPasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingArticleCover, setIsUploadingArticleCover] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');
  const [articleCoverFile, setArticleCoverFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const articleMethods = useForm<CreatorArticleFormValues>({
    resolver: zodResolver(CreatorArticleSchema),
    defaultValues: emptyArticleValues,
    mode: 'onChange',
  });
  const profileMethods = useForm<CreatorProfileFormValues>({
    resolver: zodResolver(CreatorProfileSchema),
    defaultValues: emptyProfileValues,
    mode: 'onChange',
  });
  const passwordMethods = useForm<CreatorPasswordFormValues>({
    resolver: zodResolver(CreatorPasswordSchema),
    defaultValues: emptyPasswordValues,
    mode: 'onChange',
  });

  const editId = searchParams.get('id') ?? '';
  const isApproved = profile?.status === 'approved';
  const articleForm = articleMethods.watch();
  const profileForm = profileMethods.watch();
  const passwordForm = passwordMethods.watch();
  const selectedCategory = categories.find((category) => category.key === articleForm.categoryKey);
  const articleWordCount = getPlainText(articleForm.contentHtml).split(' ').filter(Boolean).length;
  const articleStats = useMemo(
    () => ({
      total: articles.length,
      draft: articles.filter((article) => article.status === 'draft').length,
      review: articles.filter((article) => article.status === 'pending_review').length,
      published: articles.filter((article) => isPublishedArticleStatus(article.status)).length,
      inactive: articles.filter((article) => !article.isActive).length,
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

  useEffect(
    () => () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
    },
    [pendingAvatarPreview]
  );

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
      profileMethods.reset({
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
  }, [accessToken, checkUserSession, profileMethods]);

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
  const isEditingPublishedArticle = isPublishedArticleStatus(editingArticle?.status ?? '');
  const writeStatus = editingArticle?.status ?? profile?.status ?? '';
  const writeStatusLabel = editingArticle
    ? getStatusLabel(editingArticle.status)
    : isApproved
      ? 'บัญชี Creator อนุมัติแล้ว'
      : 'รออนุมัติ Creator';
  const writeStatusColor = editingArticle
    ? getStatusColor(editingArticle.status)
    : isApproved
      ? 'success'
      : 'warning';
  const writeStatusIcon =
    isPublishedArticleStatus(writeStatus)
      ? 'solar:check-circle-bold'
      : writeStatus === 'rejected'
        ? 'solar:info-circle-bold'
        : 'solar:clock-circle-bold';

  useEffect(() => {
    if (editingArticle && view === 'write') {
      articleMethods.reset({
        id: editingArticle.id,
        categoryKey: editingArticle.categoryKey,
        categoryLabel: editingArticle.categoryLabel,
        title: editingArticle.title,
        excerpt: editingArticle.excerpt,
        coverImageUrl: editingArticle.coverImageUrl,
        contentHtml: editingArticle.contentHtml,
      });
      setArticleCoverFile(null);
    }
  }, [articleMethods, editingArticle, view]);

  const saveArticle = async (action: 'draft' | 'submit') => {
    if (!accessToken) return;

    const isValid = await articleMethods.trigger();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const values = articleMethods.getValues();
      let coverImageUrl = values.coverImageUrl;

      if (articleCoverFile) {
        setIsUploadingArticleCover(true);
        const uploadResult = await uploadCreatorArticleCoverImage(accessToken, articleCoverFile);
        coverImageUrl = uploadResult.data.url ?? coverImageUrl;
        articleMethods.setValue('coverImageUrl', coverImageUrl, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      const result = await saveCreatorArticle(accessToken, {
        ...values,
        coverImageUrl,
        categoryLabel: selectedCategory?.label ?? values.categoryLabel,
        action,
      });
      setMessage(
        isEditingPublishedArticle
          ? 'บันทึกบทความที่เผยแพร่แล้ว'
          : action === 'submit'
            ? 'ส่งบทความให้ admin review แล้ว'
            : 'บันทึกฉบับร่างแล้ว'
      );
      setArticleCoverFile(null);
      articleMethods.reset({
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
      setIsUploadingArticleCover(false);
      setIsSubmitting(false);
    }
  };

  const saveProfile = async () => {
    if (!accessToken) return;

    const isValid = await profileMethods.trigger();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await updateCreatorProfile(accessToken, profileMethods.getValues());
      setProfile(result.data);
      notifyCreatorProfileUpdated(result.data);
      setMessage('บันทึกโปรไฟล์แล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearPendingAvatar = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(null);
    setPendingAvatarPreview('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const selectAvatarFile = (file: File | undefined) => {
    if (!file) return;

    setError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
      clearPendingAvatar();
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setError('รูปภาพต้องมีขนาดไม่เกิน 1 MB');
      clearPendingAvatar();
      return;
    }

    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setMessage('เลือกรูปแล้ว ตรวจ preview แล้วกดยืนยันอัปโหลดเพื่อบันทึก');
  };

  const uploadAvatar = async () => {
    if (!accessToken || !pendingAvatarFile) return;

    setIsUploadingAvatar(true);
    setError('');
    setMessage('');

    try {
      const result = await uploadCreatorAvatar(accessToken, pendingAvatarFile);
      setProfile(result.data);
      notifyCreatorProfileUpdated(result.data);
      profileMethods.setValue('avatarUrl', result.data.avatarUrl, { shouldValidate: true });
      clearPendingAvatar();
      setMessage('อัปโหลดรูปส่วนตัวแล้ว');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const togglePasswordField = (field: keyof typeof showPasswordFields) => {
    setShowPasswordFields((current) => ({ ...current, [field]: !current[field] }));
  };

  const changePassword = async () => {
    if (!accessToken) return;

    const isValid = await passwordMethods.trigger();

    if (!isValid) {
      return;
    }

    setIsChangingPassword(true);
    setError('');
    setMessage('');

    try {
      await changeCreatorPassword(accessToken, passwordMethods.getValues());
      passwordMethods.reset(emptyPasswordValues);
      await signOut();
      await checkUserSession?.();
      router.replace(
        `/creator/sign-in?message=${encodeURIComponent(
          'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่เพื่อความปลอดภัย'
        )}`
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateArticleCategory = (categoryKey: string) => {
    const nextCategory = categories.find((category) => category.key === categoryKey);

    articleMethods.setValue('categoryKey', categoryKey, { shouldValidate: true });
    articleMethods.setValue('categoryLabel', nextCategory?.label ?? '', { shouldValidate: true });
  };

  const previewArticleCover = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) {
      return;
    }

    setArticleCoverFile(file);
    setError('');
    setMessage('เลือกภาพปกแล้ว ตรวจ preview แล้วกดบันทึกหรือส่ง review เพื่ออัปโหลด');
  };

  const clearArticleCover = () => {
    setArticleCoverFile(null);
    articleMethods.setValue('coverImageUrl', '', { shouldDirty: true, shouldValidate: true });
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
                          label={article.isActive ? getStatusLabel(article.status) : 'ปิดใช้งาน'}
                          color={(article.isActive ? getStatusColor(article.status) : 'default') as any}
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

                      {article.status === 'pending_review' && article.approvalRequiredCount > 1 && (
                        <Alert severity="info">
                          รออนุมัติ {article.approvalReviews.length}/
                          {article.approvalRequiredCount} คน
                        </Alert>
                      )}

                      {!article.isActive && (
                        <Alert severity="warning">
                          บทความนี้ถูกปิดใช้งาน ไม่แสดงบนหน้าบ้าน
                          {article.inactiveReason ? `: ${article.inactiveReason}` : ''}
                        </Alert>
                      )}

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        {article.isActive && isPublishedArticleStatus(article.status) && article.slug && (
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
          <Form methods={articleMethods}>
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
                      icon={<Iconify icon={writeStatusIcon} />}
                      label={writeStatusLabel}
                      color={writeStatusColor as any}
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

                    <RHFTextField
                      name="title"
                      label="ชื่อบทความ"
                      placeholder="เช่น วิถีชุมชนและรสชาติอาหารพื้นบ้าน..."
                    />
                    <RHFTextField
                      name="excerpt"
                      multiline
                      minRows={3}
                      label="คำโปรย"
                      placeholder="สรุปสั้น ๆ ให้ผู้อ่านรู้ว่าบทความนี้เล่าเรื่องอะไร"
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
                      <RHFEditor
                        name="contentHtml"
                        fullItem
                        sx={{ minHeight: 540, bgcolor: 'background.paper' }}
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

                      <RHFSelect
                        name="categoryKey"
                        select
                        label="หมวดหมู่"
                        onChange={(event) => updateArticleCategory(event.target.value)}
                        SelectProps={{
                          renderValue: (selectedValue) => {
                            const category = categories.find((item) => item.key === selectedValue);

                            if (!category) {
                              return 'เลือกหมวดหมู่';
                            }

                            return (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box
                                  component="span"
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: category.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <Box component="span">{category.label}</Box>
                                <Box
                                  component="span"
                                  sx={{ ml: 'auto', color: 'text.secondary', fontSize: 12 }}
                                >
                                  {category.usageCount.toLocaleString('th-TH')} รายการ
                                </Box>
                              </Stack>
                            );
                          },
                        }}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.key} value={category.key}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1.2}
                              sx={{ width: 1 }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: category.color,
                                  border: '1px solid rgba(42,55,54,0.18)',
                                  flexShrink: 0,
                                }}
                              />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 800 }} noWrap>
                                  {category.label}
                                </Typography>
                                {category.description && (
                                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }} noWrap>
                                    {category.description}
                                  </Typography>
                                )}
                              </Box>
                              <Chip
                                size="small"
                                label={`${category.usageCount.toLocaleString('th-TH')} รายการ`}
                                sx={{
                                  height: 24,
                                  color: '#2a3736',
                                  bgcolor: `${category.color}24`,
                                  border: `1px solid ${category.color}55`,
                                  '& .MuiChip-label': { px: 1 },
                                }}
                              />
                            </Stack>
                          </MenuItem>
                        ))}
                      </RHFSelect>

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

                      <Stack spacing={1.25}>
                        <Typography sx={{ fontWeight: 900 }}>ภาพปกบทความ</Typography>
                        <Upload
                          value={articleCoverFile ?? articleForm.coverImageUrl ?? null}
                          accept={{ 'image/*': [] }}
                          maxSize={MAX_ARTICLE_COVER_IMAGE_SIZE}
                          loading={isUploadingArticleCover}
                          disabled={!isApproved || isUploadingArticleCover}
                          helperText={
                            isApproved
                              ? 'วาง/เลือกไฟล์รูปภาพ ขนาดไม่เกิน 2 MB เพื่อตรวจ preview ก่อน ระบบจะอัปโหลดเมื่อกดบันทึกหรือส่ง review'
                              : 'ต้องรอ admin approve ก่อนจึงจะอัปโหลดภาพปกได้'
                          }
                          onDrop={previewArticleCover}
                          onDelete={clearArticleCover}
                          slotProps={{
                            wrapper: {
                              sx: {
                                '& .upload__default': {
                                  minHeight: 180,
                                },
                              },
                            },
                          }}
                        />
                      </Stack>

                      <RHFTextField
                        name="coverImageUrl"
                        label="Cover image URL"
                        placeholder="https://..."
                        helperText="ใช้ช่องนี้ได้หากต้องการวาง URL รูปจากแหล่งอื่น"
                      />

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

                      <Alert
                        severity={isEditingPublishedArticle ? 'success' : 'info'}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        {isEditingPublishedArticle
                          ? 'บทความนี้เผยแพร่แล้ว การบันทึกจะคงสถานะเผยแพร่ไว้'
                          : 'บทความที่ส่งตรวจจะยังไม่เผยแพร่ทันที ทีมงานจะอ่านและเปลี่ยนสถานะเมื่อพร้อมเผยแพร่'}
                      </Alert>

                      <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5}>
                        <Button
                          fullWidth
                          variant="outlined"
                          disabled={!isApproved || isSubmitting}
                          loading={isSubmitting}
                          onClick={() => saveArticle('draft')}
                        >
                          {isEditingPublishedArticle ? 'บันทึกการแก้ไข' : 'บันทึกฉบับร่าง'}
                        </Button>
                        {!isEditingPublishedArticle && (
                          <Button
                            fullWidth
                            variant="contained"
                            disabled={!isApproved || isSubmitting}
                            loading={isSubmitting}
                            onClick={() => saveArticle('submit')}
                          >
                            ส่งให้ Admin Review
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Stack>
              </Box>
            </Box>
          </Form>
        )}

        {view === 'profile' && (
          <RHFForm {...profileMethods}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
                alignItems: 'start',
              }}
            >
              <Card
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 2,
                  color: creatorTone.deep,
                  textAlign: 'center',
                  bgcolor: 'rgba(248,246,238,0.94)',
                  boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
                }}
              >
                <Stack spacing={2.25} alignItems="center">
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      ref={avatarInputRef}
                      component="input"
                      type="file"
                      accept="image/*"
                      sx={{ display: 'none' }}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        selectAvatarFile(event.target.files?.[0])
                      }
                    />
                    <Avatar
                      src={pendingAvatarPreview || profileForm.avatarUrl || undefined}
                      alt={profileForm.displayName || 'Creator'}
                      sx={{
                        width: 132,
                        height: 132,
                        mx: 'auto',
                        fontSize: 42,
                        fontWeight: 900,
                        color: '#f8f6ee',
                        bgcolor: '#6f8790',
                        border: '4px solid rgba(248,246,238,0.9)',
                        boxShadow: '0 18px 48px rgba(32,42,43,0.2)',
                      }}
                    >
                      {getInitials(profileForm.displayName)}
                    </Avatar>
                    <Box
                      sx={{
                        right: 2,
                        bottom: 2,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#2a3736',
                        bgcolor: 'rgba(234,215,161,0.95)',
                        position: 'absolute',
                        border: '2px solid rgba(248,246,238,0.95)',
                      }}
                    >
                      <Iconify icon="solar:camera-add-bold" width={20} />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                      รูปส่วนตัว
                    </Typography>
                  <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                    อัปโหลดรูปเพื่อใช้แสดงบนโปรไฟล์และบทความของคุณ
                  </Typography>
                  <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: 12 }}>
                    รองรับไฟล์ต้นฉบับไม่เกิน 1 MB และระบบจะย่อ/บีบอัดให้เหลือไม่เกิน 0.5 MB
                    ก่อนบันทึกลง storage
                  </Typography>
                </Box>

                  <Button
                    fullWidth
                    variant={pendingAvatarFile ? 'outlined' : 'contained'}
                    disabled={isUploadingAvatar}
                    startIcon={<Iconify icon="solar:camera-add-bold" />}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {pendingAvatarFile ? 'เลือกรูปใหม่' : 'เลือกรูป'}
                  </Button>

                  {pendingAvatarFile && (
                    <Stack spacing={1} sx={{ width: 1 }}>
                      <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
                        ตรวจรูป preview ก่อนกดยืนยัน รูปจะยังไม่ถูกบันทึกลง storage จนกว่าจะกดยืนยันอัปโหลด
                      </Alert>
                      <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          loading={isUploadingAvatar}
                          onClick={uploadAvatar}
                        >
                          ยืนยันอัปโหลด
                        </Button>
                        <Button
                          fullWidth
                          color="inherit"
                          variant="outlined"
                          disabled={isUploadingAvatar}
                          onClick={clearPendingAvatar}
                        >
                          ยกเลิก
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  <RHFTextField
                    name="avatarUrl"
                    fullWidth
                    label="Avatar URL"
                    placeholder="https://..."
                    autoComplete="off"
                  />

                  <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={!profileForm.avatarUrl}
                      onClick={() =>
                        profileMethods.setValue('avatarUrl', '', { shouldValidate: true })
                      }
                    >
                      ล้างรูป
                    </Button>
                    <Button
                      fullWidth
                      component={profileForm.avatarUrl ? 'a' : 'button'}
                      href={profileForm.avatarUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      disabled={!profileForm.avatarUrl}
                    >
                      ดูรูป
                    </Button>
                  </Stack>
                </Stack>
              </Card>
              <Stack spacing={3}>
                <Card
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                    color: creatorTone.deep,
                    bgcolor: 'rgba(248,246,238,0.94)',
                    boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
                  }}
                >
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 950 }}>
                        ข้อมูลโปรไฟล์
                      </Typography>
                      <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                        ข้อมูลนี้ช่วยให้ทีมงานและผู้อ่านรู้จักตัวตนของคุณมากขึ้น
                      </Typography>
                    </Box>

                    <RHFTextField name="displayName" label="ชื่อที่แสดง" />
                    <RHFTextField name="bio" multiline minRows={3} label="แนะนำตัว" />
                    <Divider />
                    <RHFTextField name="phone" label="เบอร์โทร" autoComplete="off" />
                    <RHFTextField name="websiteUrl" label="Website URL" autoComplete="off" />
                    <RHFTextField name="facebookUrl" label="Facebook URL" autoComplete="off" />
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

                <Card
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                    color: creatorTone.deep,
                    bgcolor: 'rgba(248,246,238,0.94)',
                    gridColumn: { xs: 'auto', md: '1 / -1' },
                    boxShadow: '0 24px 80px rgba(32,42,43,0.16)',
                  }}
                >
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:lock-password-outline" width={24} />
                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                          เปลี่ยนรหัสผ่าน
                        </Typography>
                      </Stack>
                      <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
                        หลังเปลี่ยนรหัสผ่าน ระบบจะออกจากบัญชีนี้และให้เข้าสู่ระบบใหม่อีกครั้ง
                      </Typography>
                    </Box>

                    <RHFForm {...passwordMethods}>
                      <Box
                        sx={{
                          display: 'grid',
                          gap: 2,
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        }}
                      >
                        <RHFTextField
                          name="currentPassword"
                          label="รหัสผ่านเดิม"
                          type={showPasswordFields.currentPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    edge="end"
                                    onClick={() => togglePasswordField('currentPassword')}
                                  >
                                    <Iconify
                                      icon={
                                        showPasswordFields.currentPassword
                                          ? 'solar:eye-bold'
                                          : 'solar:eye-closed-bold'
                                      }
                                    />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                        <RHFTextField
                          name="newPassword"
                          label="รหัสผ่านใหม่"
                          type={showPasswordFields.newPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    edge="end"
                                    onClick={() => togglePasswordField('newPassword')}
                                  >
                                    <Iconify
                                      icon={
                                        showPasswordFields.newPassword
                                          ? 'solar:eye-bold'
                                          : 'solar:eye-closed-bold'
                                      }
                                    />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                        <RHFTextField
                          name="confirmPassword"
                          label="ยืนยันรหัสผ่านใหม่"
                          type={showPasswordFields.confirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    edge="end"
                                    onClick={() => togglePasswordField('confirmPassword')}
                                  >
                                    <Iconify
                                      icon={
                                        showPasswordFields.confirmPassword
                                          ? 'solar:eye-bold'
                                          : 'solar:eye-closed-bold'
                                      }
                                    />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Box>
                    </RHFForm>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        ใช้รหัสอย่างน้อย 6 ตัวอักษร และไม่ซ้ำกับรหัสเดิม
                      </Typography>
                      <Button
                        variant="contained"
                        color="warning"
                        loading={isChangingPassword}
                        disabled={
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword
                        }
                        onClick={changePassword}
                        sx={{ minWidth: 180 }}
                      >
                        เปลี่ยนรหัสผ่าน
                      </Button>
                    </Stack>
                  </Stack>
                </Card>
              </Stack>
            </Box>
          </RHFForm>
        )}
      </Stack>
    </Box>
  );
}

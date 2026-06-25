'use client';

import type { CreatorArticle, CreatorArticleStatus } from 'src/sections/creator/types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import OutlinedInput from '@mui/material/OutlinedInput';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { Markdown } from 'src/components/markdown';
import { TruncatedTypography } from 'src/components/typography';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import {
  getAdminCreatorArticles,
  reviewAdminCreatorArticle,
  type AdminArticleReviewer,
  configureAdminCreatorArticleApproval,
} from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';

const TABLE_HEAD = [
  { id: 'updatedAt', label: 'อัปเดต', width: 100 },
  { id: 'title', label: 'บทความ', width: 300 },
  { id: 'category', label: 'หมวดหมู่', width: 180 },
  { id: 'creator', label: 'ผู้เขียน', width: 220 },
  { id: 'status', label: 'สถานะ', width: 100 },
  { id: 'score', label: 'คะแนน', width: 130 },
  { id: 'active', label: 'การแสดงผล', width: 110 },
  { id: 'actions', label: '', width: 130 },
];

const STATUS_OPTIONS: Array<{ value: 'all' | CreatorArticleStatus; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'pending_review', label: 'รอตรวจ' },
  { value: 'published', label: 'เผยแพร่' },
  { value: 'approved', label: 'อนุมัติ' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

type ArticleReviewSettings = {
  scoreThresholds: {
    approveMinScore: number;
    publishMinScore: number;
    rejectBelowScore: number;
  };
  scoreWeights: {
    title: number;
    coverImage: number;
    source: number;
    category: number;
    excerpt: number;
    contentLength: number;
  };
  reviewPolicy: {
    requireScoreBeforeApprove: boolean;
    requireSourceForPublish: boolean;
    minimumWordCount: number;
    maximumMinorIssueCount: number;
  };
};

type ArticleReviewSettingsResponse = {
  data?: ArticleReviewSettings;
  updatedAt?: string;
  needsMigration?: boolean;
  message?: string;
};

const DEFAULT_ARTICLE_REVIEW_SETTINGS: ArticleReviewSettings = {
  scoreThresholds: {
    approveMinScore: 70,
    publishMinScore: 85,
    rejectBelowScore: 50,
  },
  scoreWeights: {
    title: 15,
    coverImage: 15,
    source: 20,
    category: 10,
    excerpt: 15,
    contentLength: 25,
  },
  reviewPolicy: {
    requireScoreBeforeApprove: true,
    requireSourceForPublish: true,
    minimumWordCount: 300,
    maximumMinorIssueCount: 3,
  },
};

function statusColor(status: string) {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending_review') return 'warning';
  return 'default';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'ฉบับร่าง',
    pending_review: 'รอตรวจ',
    approved: 'อนุมัติ',
    rejected: 'ไม่อนุมัติ',
    published: 'เผยแพร่',
  };

  return labels[status] ?? status;
}

function getScoreColor(score: number, settings: ArticleReviewSettings) {
  if (score >= settings.scoreThresholds.publishMinScore) return 'success';
  if (score >= settings.scoreThresholds.approveMinScore) return 'primary';
  if (score < settings.scoreThresholds.rejectBelowScore) return 'error';

  return 'warning';
}

function getArticleApprovalCount(article: CreatorArticle) {
  if (!article.approvalReviewerIds.length) {
    return article.approvalReviews.length;
  }

  return article.approvalReviews.filter((review) =>
    article.approvalReviewerIds.includes(review.userId)
  ).length;
}

function numberValue(value: string, fallback = 0) {
  const nextValue = Number(value);

  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function getTotalScoreWeight(settings: ArticleReviewSettings) {
  return Object.values(settings.scoreWeights).reduce(
    (total, value) => total + Number(value || 0),
    0
  );
}

function getPlainArticleText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasArticleSource(article: CreatorArticle) {
  const text = `${article.contentHtml} ${article.excerpt}`.toLowerCase();

  return (
    /https?:\/\//i.test(text) ||
    text.includes('href=') ||
    text.includes('แหล่งที่มา') ||
    text.includes('อ้างอิง') ||
    text.includes('ที่มา:')
  );
}

function calculateArticleScore(article: CreatorArticle, settings: ArticleReviewSettings) {
  const plainText = getPlainArticleText(article.contentHtml);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const checks = [
    {
      key: 'title',
      label: 'มีชื่อบทความ',
      passed: Boolean(article.title.trim()),
      weight: settings.scoreWeights.title,
    },
    {
      key: 'coverImage',
      label: 'มีรูปปก',
      passed: Boolean(article.coverImageUrl),
      weight: settings.scoreWeights.coverImage,
    },
    {
      key: 'source',
      label: 'มีแหล่งที่มา/ลิงก์อ้างอิง',
      passed: hasArticleSource(article),
      weight: settings.scoreWeights.source,
    },
    {
      key: 'category',
      label: 'เลือกหมวดหมู่',
      passed: Boolean(article.categoryKey || article.categoryLabel),
      weight: settings.scoreWeights.category,
    },
    {
      key: 'excerpt',
      label: 'มีคำโปรย',
      passed: Boolean(article.excerpt.trim()),
      weight: settings.scoreWeights.excerpt,
    },
    {
      key: 'contentLength',
      label: `เนื้อหาอย่างน้อย ${settings.reviewPolicy.minimumWordCount.toLocaleString('th-TH')} คำ`,
      passed: wordCount >= settings.reviewPolicy.minimumWordCount,
      weight: settings.scoreWeights.contentLength,
    },
  ];
  const totalWeight = checks.reduce((total, check) => total + Number(check.weight || 0), 0);
  const earnedWeight = checks.reduce(
    (total, check) => total + (check.passed ? Number(check.weight || 0) : 0),
    0
  );
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    checks,
    score,
    wordCount,
    totalWeight,
    earnedWeight,
  };
}

function getArticlePublicPath(article: CreatorArticle) {
  return `/creator-stories/${encodeURIComponent(article.slug || article.id)}`;
}

export function AdminCreatorArticlesClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<CreatorArticle[]>([]);
  const [reviewers, setReviewers] = useState<AdminArticleReviewer[]>([]);
  const [selected, setSelected] = useState<CreatorArticle | null>(null);
  const [previewArticle, setPreviewArticle] = useState<CreatorArticle | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [inactiveReason, setInactiveReason] = useState('');
  const [articleIsActive, setArticleIsActive] = useState(true);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [policyRequiredCount, setPolicyRequiredCount] = useState(1);
  const [policyReviewerIds, setPolicyReviewerIds] = useState<string[]>([]);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [articleReviewSettings, setArticleReviewSettings] = useState<ArticleReviewSettings>(
    DEFAULT_ARTICLE_REVIEW_SETTINGS
  );
  const [articleReviewSettingsUpdatedAt, setArticleReviewSettingsUpdatedAt] = useState('');
  const [articleReviewSettingsNeedsMigration, setArticleReviewSettingsNeedsMigration] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreatorArticleStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPolicy, setIsApplyingPolicy] = useState(false);
  const [isSavingScoreSettings, setIsSavingScoreSettings] = useState(false);
  const scoreWeightTotal = getTotalScoreWeight(articleReviewSettings);
  const selectedScore = selected ? calculateArticleScore(selected, articleReviewSettings) : null;

  const reviewableItems = useMemo(() => items.filter((item) => item.status !== 'draft'), [items]);

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, string>();

    reviewableItems.forEach((item) => {
      const value = item.categoryKey || item.categoryLabel;

      if (value) {
        categoryMap.set(value, item.categoryLabel || item.categoryKey || value);
      }
    });

    return [
      { value: 'all', label: 'ทุกหมวดหมู่' },
      ...Array.from(categoryMap, ([value, label]) => ({ value, label })).sort((first, second) =>
        first.label.localeCompare(second.label, 'th')
      ),
    ];
  }, [reviewableItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return reviewableItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (
        categoryFilter !== 'all' &&
        item.categoryKey !== categoryFilter &&
        item.categoryLabel !== categoryFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.title,
        item.excerpt,
        item.slug,
        item.categoryKey,
        item.categoryLabel,
        item.creatorName,
        item.creatorEmail,
        item.inactiveReason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categoryFilter, reviewableItems, searchQuery, statusFilter]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredItems, page, rowsPerPage]
  );

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getAdminCreatorArticles(accessToken);
      setItems(result.data);
      setReviewers(result.reviewers ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดบทความไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  const loadArticleReviewSettings = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await adminApiRequest<ArticleReviewSettingsResponse>(
        '/api/admin/creator-articles/settings',
        {
          accessToken,
        }
      );

      setArticleReviewSettings(result.data ?? DEFAULT_ARTICLE_REVIEW_SETTINGS);
      setArticleReviewSettingsUpdatedAt(result.updatedAt ?? '');
      setArticleReviewSettingsNeedsMigration(result.needsMigration === true);

      if (result.message) {
        setMessage(result.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'โหลดเกณฑ์คะแนนบทความไม่สำเร็จ'
      );
    }
  }, [accessToken]);

  useEffect(() => {
    loadItems();
    loadArticleReviewSettings();
  }, [loadArticleReviewSettings, loadItems]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredItems.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredItems.length, page, rowsPerPage]);

  useEffect(() => {
    if (!selected) {
      setRejectReason('');
      setInactiveReason('');
      setArticleIsActive(true);
      return;
    }

    setRejectReason(selected.rejectReason);
    setInactiveReason(selected.inactiveReason);
    setArticleIsActive(selected.isActive);
  }, [selected]);

  const openPolicyDialog = () => {
    const firstConfiguredArticle = items.find((item) => item.approvalReviewerIds.length > 0);

    setPolicyRequiredCount(firstConfiguredArticle?.approvalRequiredCount || 1);
    setPolicyReviewerIds(
      firstConfiguredArticle?.approvalReviewerIds.length
        ? firstConfiguredArticle.approvalReviewerIds
        : user?.id
          ? [user.id]
          : []
    );
    setPolicyDialogOpen(true);
  };

  const applyApprovalPolicy = async () => {
    if (!accessToken) return;

    setIsApplyingPolicy(true);
    setError('');
    setMessage('');

    try {
      await configureAdminCreatorArticleApproval(accessToken, {
        approvalRequiredCount: policyRequiredCount,
        approvalReviewerIds: policyReviewerIds,
      });
      setMessage('ตั้งค่าผู้อนุมัติสำหรับทุกบทความแล้ว');
      setPolicyDialogOpen(false);
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ตั้งค่าผู้อนุมัติไม่สำเร็จ');
    } finally {
      setIsApplyingPolicy(false);
    }
  };

  const updateScoreThreshold = (
    field: keyof ArticleReviewSettings['scoreThresholds'],
    value: string
  ) => {
    setArticleReviewSettings((current) => ({
      ...current,
      scoreThresholds: {
        ...current.scoreThresholds,
        [field]: numberValue(value),
      },
    }));
  };

  const updateScoreWeight = (field: keyof ArticleReviewSettings['scoreWeights'], value: string) => {
    setArticleReviewSettings((current) => ({
      ...current,
      scoreWeights: {
        ...current.scoreWeights,
        [field]: numberValue(value),
      },
    }));
  };

  const updateReviewPolicy = (
    field: keyof ArticleReviewSettings['reviewPolicy'],
    value: string | number | boolean
  ) => {
    setArticleReviewSettings((current) => ({
      ...current,
      reviewPolicy: {
        ...current.reviewPolicy,
        [field]: value,
      },
    }));
  };

  const saveArticleReviewSettings = async () => {
    if (!accessToken) return;

    setIsSavingScoreSettings(true);
    setError('');
    setMessage('');

    try {
      const result = await adminApiRequest<ArticleReviewSettingsResponse>(
        '/api/admin/creator-articles/settings',
        {
          method: 'PUT',
          accessToken,
          body: { settings: articleReviewSettings },
        }
      );

      setArticleReviewSettings(result.data ?? articleReviewSettings);
      setArticleReviewSettingsUpdatedAt(result.updatedAt ?? '');
      setArticleReviewSettingsNeedsMigration(false);
      setScoreDialogOpen(false);
      setMessage('บันทึกเกณฑ์คะแนนบทความแล้ว');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'บันทึกเกณฑ์คะแนนบทความไม่สำเร็จ'
      );
    } finally {
      setIsSavingScoreSettings(false);
    }
  };

  const reviewArticle = async (status: 'approved' | 'rejected' | 'published') => {
    if (!selected || !accessToken) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await reviewAdminCreatorArticle(accessToken, {
        id: selected.id,
        status,
        rejectReason,
        isActive: articleIsActive,
        inactiveReason,
        approvalRequiredCount: selected.approvalRequiredCount || 1,
        approvalReviewerIds: selected.approvalReviewerIds,
      });
      setMessage('บันทึกผลตรวจบทความแล้ว');
      setSelected(null);
      setRejectReason('');
      setInactiveReason('');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ตรวจบทความไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              จัดการบทความ
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตรวจบทความที่ผู้สร้างส่งเข้ามาก่อนเผยแพร่
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignSelf: { md: 'flex-start' } }}
          >
            <Button variant="outlined" onClick={() => setScoreDialogOpen(true)}>
              ตั้งค่าคะแนนบทความ
            </Button>
            <Button variant="contained" onClick={openPolicyDialog}>
              ตั้งค่าผู้อนุมัติ
            </Button>
            <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {articleReviewSettingsNeedsMigration && (
          <Alert severity="warning">
            ยังไม่มีตารางเกณฑ์คะแนนบทความ กรุณารัน docs/supabase-creators.sql ก่อนบันทึก
          </Alert>
        )}
        {isLoading && <Alert severity="info">กำลังโหลดบทความ...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหาบทความ"
              placeholder="ชื่อบทความ, ผู้เขียน, อีเมล, slug"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(0);
              }}
            />
            <TextField
              select
              fullWidth
              label="สถานะ"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | CreatorArticleStatus);
                setPage(0);
              }}
              sx={{ maxWidth: { md: 220 } }}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="หมวดหมู่"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(0);
              }}
              sx={{ maxWidth: { md: 260 } }}
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
            แสดง {filteredItems.length.toLocaleString('th-TH')} จาก{' '}
            {reviewableItems.length.toLocaleString('th-TH')} บทความ
          </Typography>
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedItems.map((item) => {
                  const articleScore = calculateArticleScore(item, articleReviewSettings);
                  const passedCheckCount = articleScore.checks.filter(
                    (check) => check.passed
                  ).length;

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="subtitle2">
                          {fDateTime(item.updatedAt, 'YYYY/MM/DD')}
                        </Typography>
                        <Typography variant="caption">
                          {fDateTime(item.updatedAt, 'HH:MM:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TruncatedTypography line={1} variant="subtitle2">
                          {item.title}
                        </TruncatedTypography>
                        <TruncatedTypography line={1} variant="caption">
                          {item.excerpt || '-'}
                        </TruncatedTypography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.categoryLabel || item.categoryKey || '-'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{item.creatorName || '-'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.creatorEmail || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(item.status)}
                          color={statusColor(item.status) as any}
                        />
                        {item.approvalRequiredCount > 1 && (
                          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12 }}>
                            อนุมัติ {getArticleApprovalCount(item)}/{item.approvalRequiredCount}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Chip
                            size="small"
                            label={`${articleScore.score}/100`}
                            color={getScoreColor(articleScore.score, articleReviewSettings)}
                            variant="soft"
                          />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            ผ่าน {passedCheckCount}/{articleScore.checks.length} เกณฑ์
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            size="small"
                            label={item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            color={item.isActive ? 'success' : 'default'}
                            variant={item.isActive ? 'soft' : 'outlined'}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                          {!item.isActive && item.inactiveReason && (
                            <Typography sx={{ color: 'text.secondary', fontSize: 12 }} noWrap>
                              {item.inactiveReason}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => setPreviewArticle(item)}
                          >
                            ดูตัวอย่าง
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => setSelected(item)}>
                            จัดการ
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!filteredItems.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={filteredItems.length}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="จำนวนต่อหน้า:"
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
          />
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: 1, md: 780 }, maxWidth: 1 } }}
      >
        {selected && (
          <Stack sx={{ height: 1, bgcolor: 'background.default' }}>
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {selected.title}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={statusLabel(selected.status)}
                      color={statusColor(selected.status) as any}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={selected.categoryLabel || selected.categoryKey || 'ไม่ระบุหมวดหมู่'}
                    />
                    <Chip
                      size="small"
                      variant={selected.isActive ? 'soft' : 'outlined'}
                      color={selected.isActive ? 'success' : 'default'}
                      label={selected.isActive ? 'เปิดแสดงหน้าบ้าน' : 'ปิดแสดงหน้าบ้าน'}
                    />
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button color="inherit" onClick={() => setPreviewArticle(selected)}>
                    ดูตัวอย่าง
                  </Button>
                  <Button color="inherit" onClick={() => setSelected(null)}>
                    ปิด
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>ข้อมูลบทความ</Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <Typography sx={{ minWidth: 110, color: 'text.secondary', fontSize: 14 }}>
                      ผู้เขียน
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{selected.creatorName || '-'}</Typography>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <Typography sx={{ minWidth: 110, color: 'text.secondary', fontSize: 14 }}>
                      อีเมล
                    </Typography>
                    <Typography>{selected.creatorEmail || '-'}</Typography>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <Typography sx={{ minWidth: 110, color: 'text.secondary', fontSize: 14 }}>
                      นโยบายอนุมัติ
                    </Typography>
                    <Typography>
                      ต้องอนุมัติ {selected.approvalRequiredCount || 1} คน จาก{' '}
                      {selected.approvalReviewerIds.length || reviewers.length} ผู้อนุมัติ
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              {!selected.isActive && (
                <Alert severity="warning">
                  ปิดแสดงหน้าบ้านอยู่{selected.inactiveReason ? `: ${selected.inactiveReason}` : ''}
                </Alert>
              )}
              {selected.approvalRequiredCount > 1 && (
                <Alert
                  severity={
                    getArticleApprovalCount(selected) >= selected.approvalRequiredCount
                      ? 'success'
                      : 'info'
                  }
                >
                  อนุมัติแล้ว {getArticleApprovalCount(selected)}/{selected.approvalRequiredCount}{' '}
                  คน
                </Alert>
              )}

              {selected.coverImageUrl && (
                <Box
                  component="img"
                  src={selected.coverImageUrl}
                  alt={selected.title}
                  sx={{ width: 1, borderRadius: 1, maxHeight: 300, objectFit: 'cover' }}
                />
              )}

              {selected.excerpt && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography sx={{ mb: 1, fontWeight: 900 }}>คำโปรย</Typography>
                  <Typography sx={{ color: 'text.secondary' }}>{selected.excerpt}</Typography>
                </Box>
              )}

              {selectedScore && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={1.5}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>คะแนนบทความอัตโนมัติ</Typography>
                      <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                        คำนวณจากเกณฑ์ที่ตั้งไว้ เช่น ชื่อ รูปปก แหล่งที่มา หมวดหมู่ คำโปรย
                        และความยาวเนื้อหา
                      </Typography>
                    </Box>
                    <Chip
                      label={`${selectedScore.score}/100`}
                      color={
                        selectedScore.score >= articleReviewSettings.scoreThresholds.publishMinScore
                          ? 'success'
                          : selectedScore.score >=
                              articleReviewSettings.scoreThresholds.approveMinScore
                            ? 'primary'
                            : selectedScore.score <
                                articleReviewSettings.scoreThresholds.rejectBelowScore
                              ? 'error'
                              : 'warning'
                      }
                      variant="soft"
                      sx={{ alignSelf: { sm: 'flex-start' }, fontWeight: 900 }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {selectedScore.checks.map((check) => (
                      <Chip
                        key={check.key}
                        size="small"
                        label={`${check.label} (${check.weight})`}
                        color={check.passed ? 'success' : 'default'}
                        variant={check.passed ? 'soft' : 'outlined'}
                      />
                    ))}
                  </Stack>
                  <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
                    จำนวนคำประมาณ {selectedScore.wordCount.toLocaleString('th-TH')} คำ ·
                    อนุมัติขั้นต่ำ {articleReviewSettings.scoreThresholds.approveMinScore} ·
                    เผยแพร่ขั้นต่ำ {articleReviewSettings.scoreThresholds.publishMinScore}
                  </Typography>
                  {selectedScore.score < articleReviewSettings.scoreThresholds.rejectBelowScore && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>
                      คะแนนต่ำกว่าเกณฑ์ไม่อนุมัติที่ตั้งไว้
                    </Alert>
                  )}
                  {articleReviewSettings.reviewPolicy.requireSourceForPublish &&
                    !hasArticleSource(selected) && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        นโยบายกำหนดให้มีแหล่งที่มาก่อนเผยแพร่
                      </Alert>
                    )}
                </Box>
              )}

              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ mb: 2, fontWeight: 900 }}>เนื้อหาบทความ</Typography>
                <Markdown children={selected.contentHtml} />
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ mb: 2, fontWeight: 900 }}>การตัดสินและการแสดงผล</Typography>
                <Stack spacing={2}>
                  <TextField
                    multiline
                    minRows={3}
                    label="เหตุผลกรณีไม่อนุมัติ"
                    placeholder="ระบุเหตุผลเพื่อให้ผู้เขียนแก้ไขได้ตรงจุด"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                  <TextField
                    select
                    fullWidth
                    label="การแสดงผลหน้าบ้าน"
                    value={articleIsActive ? 'active' : 'inactive'}
                    onChange={(event) => setArticleIsActive(event.target.value === 'active')}
                    helperText="ปิดใช้งานแล้วบทความจะไม่แสดงในหน้าบ้าน แต่ผู้เขียนยังเห็นในพื้นที่ทำงาน"
                  >
                    <MenuItem value="active">เปิดใช้งาน</MenuItem>
                    <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                  </TextField>
                  <TextField
                    multiline
                    minRows={3}
                    label="เหตุผลการปิดใช้งาน"
                    placeholder="เช่น ข้อมูลผิด หรือมีถ้อยคำไม่เหมาะสม กรุณาแก้ไขก่อนเปิดใช้งาน"
                    value={inactiveReason}
                    onChange={(event) => setInactiveReason(event.target.value)}
                    disabled={articleIsActive}
                  />
                </Stack>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Button
                variant="contained"
                color="success"
                loading={isSubmitting}
                onClick={() => reviewArticle('approved')}
              >
                อนุมัติ
              </Button>
              <Button
                variant="contained"
                color="primary"
                loading={isSubmitting}
                onClick={() => reviewArticle('published')}
              >
                เผยแพร่
              </Button>
              <Button
                variant="contained"
                color="error"
                loading={isSubmitting}
                onClick={() => reviewArticle('rejected')}
              >
                ไม่อนุมัติ
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>

      <Dialog
        fullWidth
        maxWidth="lg"
        open={!!previewArticle}
        onClose={() => setPreviewArticle(null)}
        PaperProps={{ sx: { overflow: 'hidden' } }}
      >
        {previewArticle && (
          <>
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900 }}>ตัวอย่างบทความฝั่งผู้ใช้งาน</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }} noWrap>
                  แสดงตัวอย่างใกล้เคียงหน้าจริงก่อนเผยแพร่ โดยไม่บันทึกยอดเข้าชม
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                {(previewArticle.status === 'published' || previewArticle.status === 'approved') &&
                  previewArticle.isActive && (
                    <Button
                      href={getArticlePublicPath(previewArticle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                    >
                      เปิดหน้าจริง
                    </Button>
                  )}
                <Button color="inherit" onClick={() => setPreviewArticle(null)}>
                  ปิด
                </Button>
              </Stack>
            </Box>

            <Box
              sx={{
                maxHeight: { xs: 'calc(100vh - 120px)', md: '82vh' },
                overflow: 'auto',
                px: { xs: 2, sm: 3, md: 5 },
                py: { xs: 3, md: 5 },
                color: '#f8f6ee',
                bgcolor: '#2a3736',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: { xs: -80, md: -120 },
                  opacity: 0.18,
                  pointerEvents: 'none',
                  backgroundImage: `
                    repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
                    repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px)
                  `,
                  transform: 'rotate(-4deg)',
                },
              }}
            >
              <Stack
                spacing={3}
                sx={{ mx: 'auto', maxWidth: 960, position: 'relative', zIndex: 1 }}
              >
                <Box
                  sx={{
                    borderRadius: 1.5,
                    color: '#2a3736',
                    bgcolor: 'rgba(250,244,232,0.96)',
                    border: '1px solid rgba(255,255,255,0.62)',
                    boxShadow: '0 24px 70px rgba(32,42,43,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <Stack spacing={2.25} sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.25}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar
                          src={previewArticle.creatorAvatarUrl || undefined}
                          alt={previewArticle.creatorName || 'Creator'}
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: 'rgba(123,132,118,0.32)',
                            color: '#2a3736',
                            fontWeight: 900,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ color: '#3b2f24', fontSize: 15, fontWeight: 950 }}
                            noWrap
                          >
                            {previewArticle.creatorName || previewArticle.creatorEmail || 'Creator'}
                          </Typography>
                          <Typography sx={{ color: 'rgba(75,53,35,0.58)', fontSize: 12 }}>
                            {fDateTime(
                              previewArticle.publishedAt ||
                                previewArticle.reviewedAt ||
                                previewArticle.updatedAt
                            )}{' '}
                            · ผู้สร้าง
                          </Typography>
                        </Box>
                      </Stack>

                      <Chip
                        label={
                          previewArticle.categoryLabel || previewArticle.categoryKey || 'บทความ'
                        }
                        sx={{
                          flexShrink: 0,
                          color: '#4b3523',
                          fontWeight: 900,
                          bgcolor: 'rgba(234,215,161,0.7)',
                        }}
                      />
                    </Stack>

                    <Box>
                      <Typography
                        component="h1"
                        sx={{
                          color: '#3b2f24',
                          fontSize: { xs: 30, md: 42 },
                          fontWeight: 950,
                          lineHeight: 1.18,
                        }}
                      >
                        {previewArticle.title}
                      </Typography>

                      {previewArticle.excerpt && (
                        <Typography
                          sx={{
                            mt: 1.2,
                            color: 'rgba(75,53,35,0.74)',
                            fontSize: { xs: 16, md: 18 },
                            lineHeight: 1.75,
                          }}
                        >
                          {previewArticle.excerpt}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {previewArticle.coverImageUrl ? (
                    <Box
                      sx={{
                        overflow: 'hidden',
                        borderTop: '1px solid rgba(75,53,35,0.08)',
                        borderBottom: '1px solid rgba(75,53,35,0.08)',
                        bgcolor: 'rgba(42,55,54,0.12)',
                        aspectRatio: '16 / 9',
                      }}
                    >
                      <Box
                        component="img"
                        src={previewArticle.coverImageUrl}
                        alt={previewArticle.title}
                        sx={{ width: 1, height: 1, display: 'block', objectFit: 'cover' }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: { xs: 220, md: 360 },
                        display: 'grid',
                        placeItems: 'center',
                        color: 'rgba(75,53,35,0.68)',
                        borderTop: '1px solid rgba(75,53,35,0.08)',
                        borderBottom: '1px solid rgba(75,53,35,0.08)',
                        backgroundImage: `
                          radial-gradient(circle at 24% 18%, rgba(234,215,161,0.5), transparent 30%),
                          linear-gradient(135deg, rgba(96,141,140,0.42), rgba(143,124,92,0.36))
                        `,
                      }}
                    >
                      <Typography sx={{ fontWeight: 900 }}>ยังไม่มีรูปปก</Typography>
                    </Box>
                  )}

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{
                      px: { xs: 2, sm: 2.5, md: 3 },
                      py: 1.75,
                      borderBottom: '1px solid rgba(75,53,35,0.1)',
                    }}
                  >
                    <Chip
                      size="small"
                      label="ถูกใจ 0"
                      sx={{ color: '#4b3523', bgcolor: 'rgba(75,53,35,0.08)', fontWeight: 800 }}
                    />
                    <Chip
                      size="small"
                      label="เข้าชม 0"
                      sx={{ color: '#4b3523', bgcolor: 'rgba(75,53,35,0.08)', fontWeight: 800 }}
                    />
                    <Chip
                      size="small"
                      label="แชร์"
                      sx={{ color: '#4b3523', bgcolor: 'rgba(75,53,35,0.08)', fontWeight: 800 }}
                    />
                  </Stack>

                  <Box sx={{ p: { xs: 2.5, md: 4 } }}>
                    <Markdown sx={{ color: 'inherit' }}>
                      {previewArticle.contentHtml || '<p>ยังไม่มีเนื้อหาบทความ</p>'}
                    </Markdown>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </>
        )}
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="md"
        open={scoreDialogOpen}
        onClose={() => setScoreDialogOpen(false)}
      >
        <DialogTitle>ตั้งค่าเกณฑ์คะแนนบทความ</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="info">
              ใช้เป็นเกณฑ์กลางสำหรับตรวจบทความที่ผู้สร้างส่งเข้ามา
              และช่วยให้ผู้ตรวจให้คะแนนไปในทิศทางเดียวกัน
            </Alert>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="คะแนนขั้นต่ำเพื่ออนุมัติ"
                value={articleReviewSettings.scoreThresholds.approveMinScore}
                onChange={(event) => updateScoreThreshold('approveMinScore', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="คะแนนขั้นต่ำเพื่อเผยแพร่"
                value={articleReviewSettings.scoreThresholds.publishMinScore}
                onChange={(event) => updateScoreThreshold('publishMinScore', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="คะแนนต่ำกว่านี้ควรปฏิเสธ"
                value={articleReviewSettings.scoreThresholds.rejectBelowScore}
                onChange={(event) => updateScoreThreshold('rejectBelowScore', event.target.value)}
              />
            </Box>

            <Divider />

            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>น้ำหนักคะแนน</Typography>
                <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                  ผลรวมควรเท่ากับ 100 เพื่อให้อ่านคะแนนรวมได้ง่าย
                </Typography>
              </Box>
              <Chip
                label={`รวม ${scoreWeightTotal}`}
                color={scoreWeightTotal === 100 ? 'success' : 'warning'}
                variant="soft"
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: มีชื่อบทความ"
                value={articleReviewSettings.scoreWeights.title}
                onChange={(event) => updateScoreWeight('title', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: มีรูปปก"
                value={articleReviewSettings.scoreWeights.coverImage}
                onChange={(event) => updateScoreWeight('coverImage', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: มีแหล่งที่มา/ลิงก์อ้างอิง"
                value={articleReviewSettings.scoreWeights.source}
                onChange={(event) => updateScoreWeight('source', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: เลือกหมวดหมู่"
                value={articleReviewSettings.scoreWeights.category}
                onChange={(event) => updateScoreWeight('category', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: มีคำโปรย"
                value={articleReviewSettings.scoreWeights.excerpt}
                onChange={(event) => updateScoreWeight('excerpt', event.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="น้ำหนัก: ความยาวเนื้อหาถึงขั้นต่ำ"
                value={articleReviewSettings.scoreWeights.contentLength}
                onChange={(event) => updateScoreWeight('contentLength', event.target.value)}
              />
            </Box>

            <Divider />

            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900 }}>นโยบายการตรวจ</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={articleReviewSettings.reviewPolicy.requireScoreBeforeApprove}
                    onChange={(event) =>
                      updateReviewPolicy('requireScoreBeforeApprove', event.target.checked)
                    }
                  />
                }
                label="ต้องให้คะแนนก่อนอนุมัติ"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={articleReviewSettings.reviewPolicy.requireSourceForPublish}
                    onChange={(event) =>
                      updateReviewPolicy('requireSourceForPublish', event.target.checked)
                    }
                  />
                }
                label="ต้องมีแหล่งอ้างอิงก่อนเผยแพร่"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="จำนวนคำขั้นต่ำ"
                  value={articleReviewSettings.reviewPolicy.minimumWordCount}
                  onChange={(event) =>
                    updateReviewPolicy('minimumWordCount', numberValue(event.target.value))
                  }
                />
                <TextField
                  fullWidth
                  type="number"
                  label="จำนวนประเด็นย่อยที่ยอมรับได้"
                  value={articleReviewSettings.reviewPolicy.maximumMinorIssueCount}
                  onChange={(event) =>
                    updateReviewPolicy('maximumMinorIssueCount', numberValue(event.target.value))
                  }
                />
              </Stack>
            </Stack>

            {articleReviewSettingsUpdatedAt && (
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                อัปเดตล่าสุด {fDateTime(articleReviewSettingsUpdatedAt)}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScoreDialogOpen(false)}>ยกเลิก</Button>
          <Button
            color="inherit"
            onClick={() => setArticleReviewSettings(DEFAULT_ARTICLE_REVIEW_SETTINGS)}
          >
            คืนค่าเริ่มต้น
          </Button>
          <Button
            variant="contained"
            loading={isSavingScoreSettings}
            onClick={saveArticleReviewSettings}
          >
            บันทึกเกณฑ์คะแนน
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
      >
        <DialogTitle>ตั้งค่าผู้อนุมัติทุกบทความ</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="info">
              ระบบจะใช้จำนวนการอนุมัติและรายชื่อผู้อนุมัตินี้กับทุกบทความของผู้สร้าง
            </Alert>
            <TextField
              fullWidth
              type="number"
              label="จำนวนการอนุมัติที่ต้องการ"
              value={policyRequiredCount}
              onChange={(event) =>
                setPolicyRequiredCount(Math.max(1, Math.trunc(Number(event.target.value) || 1)))
              }
              inputProps={{ min: 1, max: 10 }}
            />
            <FormControl fullWidth>
              <InputLabel>ผู้อนุมัติ</InputLabel>
              <Select
                multiple
                value={policyReviewerIds}
                input={<OutlinedInput label="ผู้อนุมัติ" />}
                renderValue={(selectedIds) =>
                  selectedIds
                    .map((reviewerId) => {
                      const reviewer = reviewers.find((item) => item.id === reviewerId);

                      return reviewer?.displayName || reviewer?.email || reviewerId;
                    })
                    .join(', ')
                }
                onChange={(event) => setPolicyReviewerIds(event.target.value as string[])}
              >
                {reviewers.map((reviewer) => (
                  <MenuItem key={reviewer.id} value={reviewer.id}>
                    <Checkbox checked={policyReviewerIds.includes(reviewer.id)} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {reviewer.displayName || reviewer.email}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {reviewer.role}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
              เลือกได้เฉพาะผู้ตรวจสอบที่ยืนยันแล้วและมีสิทธิ์อนุมัติหรือเผยแพร่
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            loading={isApplyingPolicy}
            disabled={policyReviewerIds.length < policyRequiredCount}
            onClick={applyApprovalPolicy}
          >
            ใช้กับทุกบทความ
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

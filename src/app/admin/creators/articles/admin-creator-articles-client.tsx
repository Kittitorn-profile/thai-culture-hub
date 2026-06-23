'use client';

import type { CreatorArticle } from 'src/sections/creator/types';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Markdown } from 'src/components/markdown';
import { TableNoData, TableHeadCustom } from 'src/components/table';

import {
  getAdminCreatorArticles,
  reviewAdminCreatorArticle,
} from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';

const TABLE_HEAD = [
  { id: 'updatedAt', label: 'อัปเดต', width: 180 },
  { id: 'title', label: 'บทความ' },
  { id: 'category', label: 'หมวดหมู่', width: 180 },
  { id: 'creator', label: 'Creator', width: 220 },
  { id: 'status', label: 'สถานะ', width: 140 },
  { id: 'actions', label: '', width: 120 },
];

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

export function AdminCreatorArticlesClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<CreatorArticle[]>([]);
  const [selected, setSelected] = useState<CreatorArticle | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getAdminCreatorArticles(accessToken);
      setItems(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดบทความไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
      });
      setMessage('บันทึกผล review บทความแล้ว');
      setSelected(null);
      setRejectReason('');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Review บทความไม่สำเร็จ');
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
              Creator Articles
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              Review บทความที่ creator ส่งเข้ามาก่อนเผยแพร่
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดบทความ...</Alert>}

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(item.updatedAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.excerpt || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.categoryLabel || item.categoryKey || '-'} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{item.creatorName || '-'}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.creatorEmail || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel(item.status)} color={statusColor(item.status) as any} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setSelected(item)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!items.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: 1, md: 720 } } }}
      >
        {selected && (
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {selected.title}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {selected.creatorName || '-'} · {selected.categoryLabel || selected.categoryKey || '-'} ·{' '}
                {statusLabel(selected.status)}
              </Typography>
            </Box>
            <Chip label={statusLabel(selected.status)} color={statusColor(selected.status) as any} sx={{ alignSelf: 'flex-start' }} />
            {selected.coverImageUrl && (
              <Box
                component="img"
                src={selected.coverImageUrl}
                alt={selected.title}
                sx={{ width: 1, borderRadius: 1, maxHeight: 280, objectFit: 'cover' }}
              />
            )}
            <Typography sx={{ color: 'text.secondary' }}>{selected.excerpt}</Typography>
            <Divider />
            <Markdown children={selected.contentHtml} />
            <Divider />
            <TextField
              multiline
              minRows={3}
              label="เหตุผลกรณี reject"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" color="success" loading={isSubmitting} onClick={() => reviewArticle('approved')}>
                Approve
              </Button>
              <Button variant="contained" color="primary" loading={isSubmitting} onClick={() => reviewArticle('published')}>
                Publish
              </Button>
              <Button variant="contained" color="error" loading={isSubmitting} onClick={() => reviewArticle('rejected')}>
                Reject
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

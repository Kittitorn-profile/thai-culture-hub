'use client';

import type { CreatorProfile } from 'src/sections/creator/types';

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

import { TableNoData, TableHeadCustom } from 'src/components/table';

import { getAdminCreators, reviewAdminCreator } from 'src/sections/creator/creator-api';

import { useAuthContext } from 'src/auth/hooks';

const TABLE_HEAD = [
  { id: 'createdAt', label: 'วันที่สมัคร', width: 180 },
  { id: 'creator', label: 'Creator' },
  { id: 'contact', label: 'ติดต่อ', width: 220 },
  { id: 'status', label: 'สถานะ', width: 140 },
  { id: 'actions', label: '', width: 120 },
];

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

export function AdminCreatorsClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<CreatorProfile[]>([]);
  const [selected, setSelected] = useState<CreatorProfile | null>(null);
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
      const result = await getAdminCreators(accessToken);
      setItems(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลด creator ไม่สำเร็จ');
      await checkUserSession?.();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const reviewCreator = async (status: 'approved' | 'rejected') => {
    if (!selected || !accessToken) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await reviewAdminCreator(accessToken, {
        id: selected.id,
        status,
        rejectReason,
      });
      setMessage(status === 'approved' ? 'Approve creator แล้ว' : 'Reject creator แล้ว');
      setSelected(null);
      setRejectReason('');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Review creator ไม่สำเร็จ');
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
              Creator Registrations
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              จัดการ user ที่ลงทะเบียนเป็น creator และ approve / reject ก่อนให้เขียนบทความ
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลด creator...</Alert>}

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{item.displayName}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.bio || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{item.email}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{item.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.status} color={statusColor(item.status) as any} />
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

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)} PaperProps={{ sx: { width: { xs: 1, sm: 460 } } }}>
        {selected && (
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {selected.displayName}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{selected.email}</Typography>
            </Box>
            <Chip label={selected.status} color={statusColor(selected.status) as any} sx={{ alignSelf: 'flex-start' }} />
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.bio || 'ไม่มีข้อมูลแนะนำตัว'}</Typography>
            <Divider />
            <TextField
              multiline
              minRows={3}
              label="เหตุผลกรณี reject"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="success" loading={isSubmitting} onClick={() => reviewCreator('approved')}>
                Approve
              </Button>
              <Button variant="contained" color="error" loading={isSubmitting} onClick={() => reviewCreator('rejected')}>
                Reject
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

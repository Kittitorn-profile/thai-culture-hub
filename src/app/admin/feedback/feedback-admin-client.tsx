'use client';

import type { FeedbackItem, FeedbackStatus } from './types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { getFeedbackAction } from './actions';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'createdAt', label: 'วันที่', width: 180 },
  { id: 'message', label: 'ความคิดเห็น' },
  { id: 'sender', label: 'ผู้ส่ง', width: 220 },
  { id: 'path', label: 'หน้าเว็บ', width: 220 },
  { id: 'status', label: 'สถานะ', width: 120 },
];

const STATUS_OPTIONS: Array<{ value: 'all' | FeedbackStatus; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'new', label: 'ใหม่' },
  { value: 'reviewed', label: 'อ่านแล้ว' },
  { value: 'archived', label: 'เก็บถาวร' },
];

function getStatusLabel(status: FeedbackItem['status']) {
  if (status === 'reviewed') {
    return 'อ่านแล้ว';
  }

  if (status === 'archived') {
    return 'เก็บถาวร';
  }

  return 'ใหม่';
}

export function FeedbackAdminClient() {
  const { user, checkUserSession } = useAuthContext();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [item.message, item.name, item.contact, item.path, item.userAgent]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [items, searchQuery, statusFilter]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredItems, page, rowsPerPage]
  );

  const loadFeedback = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await getFeedbackAction(accessToken);

      if (!result.ok) {
        if (result.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(result.message);
      }

      setItems(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดความคิดเห็นไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredItems.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredItems.length, page, rowsPerPage]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Feedback
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ความคิดเห็นที่ผู้ใช้ส่งจากปุ่มมุมขวาล่างของเว็บไซต์
            </Typography>
          </Box>

          <Button variant="outlined" onClick={loadFeedback} disabled={isLoading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดความคิดเห็น...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหา feedback"
              placeholder="ข้อความ, ผู้ส่ง, ติดต่อ, path"
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
                setStatusFilter(event.target.value as 'all' | FeedbackStatus);
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
          </Stack>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
            แสดง {filteredItems.length.toLocaleString('th-TH')} จาก{' '}
            {items.length.toLocaleString('th-TH')} feedback
          </Typography>
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {item.createdAt ? fDateTime(item.createdAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ whiteSpace: 'pre-wrap', fontWeight: 700 }}>
                        {item.message}
                      </Typography>
                      {item.userAgent && (
                        <Typography sx={{ mt: 0.75, color: 'text.disabled', fontSize: 12 }}>
                          {item.userAgent}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{item.name || 'ไม่ระบุชื่อ'}</Typography>
                      <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
                        {item.contact || 'ไม่มีช่องทางติดต่อ'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                        {item.path || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusLabel(item.status)}
                        color={item.status === 'new' ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!filteredItems.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={filteredItems.length}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="Page size:"
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
          />
        </Card>
      </Stack>
    </DashboardContent>
  );
}

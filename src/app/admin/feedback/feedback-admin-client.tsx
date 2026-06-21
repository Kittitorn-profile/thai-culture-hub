'use client';

import type { FeedbackItem } from './types';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { TableNoData, TableHeadCustom } from 'src/components/table';

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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

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

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {items.map((item) => (
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
                <TableNoData notFound={!items.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

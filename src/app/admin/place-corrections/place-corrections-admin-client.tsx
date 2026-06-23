'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

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
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';

import { TableNoData, TableHeadCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

type PlaceCorrection = {
  id: string;
  placeId: string;
  provinceCode: string;
  placeName: string;
  requesterEmail: string;
  requesterName: string;
  reason: string;
  originalSnapshot: Record<string, unknown>;
  suggestedPayload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt: string;
  reviewerEmail: string;
  reviewerName: string;
  reviewNote: string;
  appliedAt: string;
  createdAt: string;
};

type PlaceCorrectionsResponse = {
  data?: PlaceCorrection[];
  message?: string;
};

const TABLE_HEAD = [
  { id: 'createdAt', label: 'วันที่ส่ง', width: 180 },
  { id: 'place', label: 'สถานที่' },
  { id: 'requester', label: 'ผู้ขอแก้', width: 220 },
  { id: 'status', label: 'สถานะ', width: 130 },
  { id: 'actions', label: '', width: 180 },
];

function getStatusColor(status: PlaceCorrection['status']) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

function getStatusLabel(status: PlaceCorrection['status']) {
  if (status === 'approved') return 'อนุมัติแล้ว';
  if (status === 'rejected') return 'ไม่อนุมัติ';
  return 'รอตรวจ';
}

function getPayloadEntries(payload: Record<string, unknown>) {
  const labels: Record<string, string> = {
    name: 'ชื่อสถานที่',
    district: 'อำเภอ',
    lat: 'Latitude',
    lng: 'Longitude',
    mapUrl: 'Map URL',
    imageUrl: 'Image URL',
    description: 'คำอธิบาย',
    detail: 'รายละเอียด',
  };

  return Object.entries(payload)
    .filter(([key]) => key !== 'category')
    .map(([key, value]) => ({ key, label: labels[key] ?? key, value: `${value ?? ''}`.trim() }))
    .filter((item) => item.value);
}

function getTimeValue(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function getTimelineTitle(item: PlaceCorrection) {
  if (item.status === 'approved') return 'อนุมัติและนำข้อมูลไปใช้แล้ว';
  if (item.status === 'rejected') return 'คำขอแก้ไขไม่ผ่านการตรวจสอบ';
  return 'ส่งคำขอแก้ไข รอ admin ตรวจสอบ';
}

function getPayloadSummary(payload: Record<string, unknown>) {
  const entries = getPayloadEntries(payload);

  if (!entries.length) {
    return 'ไม่มีรายละเอียดที่เสนอแก้';
  }

  return entries
    .slice(0, 3)
    .map((entry) => entry.label)
    .join(', ');
}

export function AdminPlaceCorrectionsClient() {
  const { user, checkUserSession } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const [items, setItems] = useState<PlaceCorrection[]>([]);
  const [selected, setSelected] = useState<PlaceCorrection | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestItems = useMemo(() => {
    const latestMap = new Map<string, PlaceCorrection>();

    items.forEach((item) => {
      const key = item.placeId || item.id;
      const current = latestMap.get(key);

      if (!current || getTimeValue(item.createdAt) > getTimeValue(current.createdAt)) {
        latestMap.set(key, item);
      }
    });

    return Array.from(latestMap.values()).sort(
      (firstItem, secondItem) =>
        getTimeValue(secondItem.createdAt) - getTimeValue(firstItem.createdAt)
    );
  }, [items]);

  const selectedLogs = useMemo(() => {
    if (!selected) {
      return [];
    }

    return items
      .filter((item) => item.placeId === selected.placeId)
      .sort(
        (firstItem, secondItem) =>
          getTimeValue(secondItem.createdAt) - getTimeValue(firstItem.createdAt)
      );
  }, [items, selected]);

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await adminApiRequest<PlaceCorrectionsResponse>(
        '/api/admin/place-corrections',
        {
          accessToken,
        }
      );

      setItems(result.data ?? []);
    } catch (caughtError) {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await checkUserSession?.();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'โหลดคำขอแก้ไขไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const reviewCorrection = async (status: 'approved' | 'rejected') => {
    if (!selected) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await adminApiRequest('/api/admin/place-corrections', {
        method: 'PATCH',
        accessToken,
        body: {
          id: selected.id,
          status,
          reviewNote,
        },
      });
      setMessage(status === 'approved' ? 'อนุมัติและอัปเดตข้อมูลแล้ว' : 'Reject คำขอแล้ว');
      setSelected(null);
      setReviewNote('');
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Review คำขอไม่สำเร็จ');
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
              Place Correction Requests
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ตรวจคำขอแก้ไขข้อมูลสถานที่จากผู้ใช้ก่อนนำไปอัปเดตเป็น override
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadItems} disabled={isLoading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดคำขอ...</Alert>}

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {latestItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{item.placeName}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {item.placeId} · {item.provinceCode || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{item.requesterName || '-'}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {item.requesterEmail || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusLabel(item.status)}
                        color={getStatusColor(item.status) as any}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => setSelected(item)}>
                          Review
                        </Button>
                        {items.filter((logItem) => logItem.placeId === item.placeId).length > 1 && (
                          <Button size="small" color="inherit" onClick={() => setSelected(item)}>
                            Log
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!latestItems.length && !isLoading} />
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: 1, md: 620 } } }}
      >
        {selected && (
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {selected.placeName}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{selected.placeId}</Typography>
            </Box>
            <Chip
              label={getStatusLabel(selected.status)}
              color={getStatusColor(selected.status) as any}
              sx={{ alignSelf: 'flex-start' }}
            />
            {selectedLogs.length > 1 && (
              <Alert severity="info">
                มีคำขอแก้ไขสถานที่นี้ทั้งหมด {selectedLogs.length} ครั้ง ตารางแสดงรายการล่าสุดไว้แล้ว
              </Alert>
            )}
            {selected.reason && <Alert severity="info">{selected.reason}</Alert>}
            <Divider />
            <Typography sx={{ fontWeight: 900 }}>ข้อมูลที่เสนอแก้</Typography>
            <Stack spacing={1.25}>
              {getPayloadEntries(selected.suggestedPayload).map((item) => (
                <Box key={item.key} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {item.label}
                  </Typography>
                  {item.key === 'imageUrl' ? (
                    <Box
                      component="img"
                      src={item.value}
                      alt="ภาพที่เสนอแก้"
                      sx={{
                        mt: 1,
                        width: 1,
                        maxHeight: 260,
                        objectFit: 'cover',
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                      }}
                    />
                  ) : (
                    <Typography sx={{ mt: 0.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {item.value}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>

            {selectedLogs.length > 1 && (
              <>
                <Divider />
                <Typography sx={{ fontWeight: 900 }}>Log คำขอแก้ไขรายการนี้</Typography>
                <Box sx={{ position: 'relative', pl: 4 }}>
                  <Box
                    sx={{
                      top: 10,
                      bottom: 12,
                      left: 9,
                      width: 2,
                      position: 'absolute',
                      bgcolor: 'divider',
                    }}
                  />
                  <Stack spacing={2.5}>
                    {selectedLogs.map((logItem) => {
                      const isCurrent = logItem.id === selected.id;

                      return (
                        <Box key={logItem.id} sx={{ position: 'relative' }}>
                          <Box
                            sx={(theme) => ({
                              top: 5,
                              left: -32,
                              width: 18,
                              height: 18,
                              zIndex: 1,
                              borderRadius: '50%',
                              position: 'absolute',
                              bgcolor: theme.palette[getStatusColor(logItem.status) as 'success' | 'error' | 'warning'].main,
                              border: '3px solid',
                              borderColor: 'background.paper',
                              boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                            })}
                          />
                          <Typography sx={{ fontWeight: 900, lineHeight: 1.3 }}>
                            {getTimelineTitle(logItem)}
                          </Typography>
                          <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
                            {fDateTime(logItem.createdAt)}
                          </Typography>

                          <Box
                            sx={{
                              mt: 1.25,
                              p: 1.5,
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: isCurrent ? 'primary.main' : 'divider',
                              bgcolor: 'background.paper',
                              boxShadow: isCurrent
                                ? '0 10px 28px rgba(24,119,242,0.12)'
                                : '0 8px 22px rgba(0,0,0,0.04)',
                            }}
                          >
                            <Stack spacing={1.1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography sx={{ minWidth: 92, color: 'text.secondary', fontSize: 13 }}>
                                  Submitted by
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                                  {logItem.requesterName || '-'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography sx={{ minWidth: 92, color: 'text.secondary', fontSize: 13 }}>
                                  Status
                                </Typography>
                                <Chip
                                  size="small"
                                  label={getStatusLabel(logItem.status)}
                                  color={getStatusColor(logItem.status) as any}
                                />
                              </Stack>
                              <Stack direction="row" alignItems="flex-start" spacing={1}>
                                <Typography sx={{ minWidth: 92, color: 'text.secondary', fontSize: 13 }}>
                                  Context
                                </Typography>
                                <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>
                                  {getPayloadSummary(logItem.suggestedPayload)}
                                </Typography>
                              </Stack>
                              {logItem.reviewNote && (
                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                  <Typography sx={{ minWidth: 92, color: 'text.secondary', fontSize: 13 }}>
                                    Note
                                  </Typography>
                                  <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>
                                    {logItem.reviewNote}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>

                            <Button
                              fullWidth
                              size="small"
                              variant={isCurrent ? 'contained' : 'outlined'}
                              sx={{ mt: 1.5 }}
                              onClick={() => {
                                setSelected(logItem);
                                setReviewNote('');
                              }}
                            >
                              เปิดรายการนี้
                            </Button>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            )}

            <TextField
              multiline
              minRows={3}
              label="หมายเหตุ admin / เหตุผล reject"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                color="success"
                disabled={selected.status !== 'pending'}
                loading={isSubmitting}
                onClick={() => reviewCorrection('approved')}
              >
                Approve & Apply
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={selected.status !== 'pending'}
                loading={isSubmitting}
                onClick={() => reviewCorrection('rejected')}
              >
                Reject
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

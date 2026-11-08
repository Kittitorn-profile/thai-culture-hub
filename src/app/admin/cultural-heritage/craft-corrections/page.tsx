'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import {
  Box,
  Card,
  Chip,
  Table,
  Alert,
  Stack,
  Button,
  Dialog,
  TableRow,
  Skeleton,
  MenuItem,
  TableBody,
  TableCell,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import { type CraftEdit } from 'src/lib/craft-corrections';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';
import {
  getContributionGroup,
  getContributionLabel,
  getCorrectionFieldLabels,
} from 'src/lib/contribution-corrections';

import { EmptyContent } from 'src/components/empty-content';
import { TableHeadCustom, TablePaginationCustom } from 'src/components/table';
import { CraftImageGallery } from 'src/components/craft-images/craft-image-gallery';

import { useAuthContext } from 'src/auth/hooks';

type Request = {
  id: string;
  record_title: string;
  record_id: string;
  requester_name: string;
  reason: string;
  status: string;
  original_snapshot: CraftEdit;
  suggested_payload: Partial<CraftEdit>;
  review_note: string;
  created_at: string;
};
const statuses: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  all: 'ทุกสถานะ',
};
export default function Page() {
  const { user } = useAuthContext();
  const token = user?.accessToken ?? user?.access_token ?? '';
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<Request | null>(null);
  const [note, setNote] = useState('');
  const query = useQuery({
    queryKey: ['admin-craft-corrections', status, user?.id],
    enabled: !!token,
    queryFn: () =>
      adminApiRequest<{ data: Request[] }>(`/api/admin/craft-corrections/?status=${status}`, {
        accessToken: token,
      }),
  });
  const mutation = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      adminApiRequest('/api/admin/craft-corrections/', {
        accessToken: token,
        method: 'PATCH',
        body: { id: selected?.id, decision, note },
      }),
    onSuccess: () => {
      setSelected(null);
      setPage(0);
      void query.refetch();
    },
  });
  const records = query.data?.data ?? [];
  const needle = search.trim().toLocaleLowerCase('th');
  const filtered = records.filter(
    (request) =>
      (kind === 'all' || getContributionGroup(request.record_id) === kind) &&
      (!needle ||
        [
          request.record_title,
          request.requester_name,
          request.reason,
          request.review_note,
          getContributionLabel(getContributionGroup(request.record_id)),
        ].some((value) => value?.toLocaleLowerCase('th').includes(needle)))
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const paginated = filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" variant="h3" sx={{ fontWeight: 900 }}>
              คำขอร่วมพัฒนาข้อมูล
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              ตรวจข้อมูลและภาพที่สมาชิกเสนอ ก่อนอนุมัติให้อัปเดตบนเว็บไซต์
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignSelf: { md: 'flex-start' }, flexShrink: 0 }}
          >
            <Button
              component="a"
              href="/admin/cultural-places/place-corrections"
              variant="outlined"
            >
              คำขอสถานที่และแหล่งวัฒนธรรม
            </Button>
            <Button
              variant="outlined"
              disabled={!token || query.isFetching}
              onClick={() => void query.refetch()}
            >
              {query.isFetching ? 'กำลังโหลด…' : 'โหลดข้อมูลใหม่'}
            </Button>
          </Stack>
        </Stack>
        {query.error && <Alert severity="error">{query.error.message}</Alert>}
        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหาคำขอแก้ไข"
              placeholder="ชื่อรายการ ผู้ส่งคำขอ หรือรายละเอียด"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <TextField
              select
              fullWidth
              label="ประเภทข้อมูล"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value);
                setPage(0);
              }}
              sx={{ maxWidth: { md: 280 } }}
            >
              <MenuItem value="all">ทุกประเภทในหน้านี้</MenuItem>
              {PUBLIC_DATA_GROUPS.filter((group) => group.key !== 'places').map((group) => (
                <MenuItem key={group.key} value={group.key}>
                  {group.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="สถานะ"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
              sx={{ maxWidth: { md: 220 } }}
            >
              {Object.entries(statuses).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }} aria-live="polite">
            {query.isPending
              ? 'กำลังโหลดคำขอ…'
              : query.error && !query.data
                ? 'ยังโหลดรายการคำขอไม่ได้'
                : 'แสดง ' +
                  filtered.length.toLocaleString('th-TH') +
                  ' จาก ' +
                  records.length.toLocaleString('th-TH') +
                  ' คำขอล่าสุด'}
            {records.length === 100 && ' · แสดงสูงสุด 100 คำขอตามสถานะที่เลือก'}
          </Typography>
        </Card>
        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 980 }} aria-label="คำขอร่วมพัฒนาข้อมูล">
              <TableHeadCustom
                headCells={[
                  { id: 'created', label: 'วันที่ส่ง', width: 180 },
                  { id: 'record', label: 'รายการข้อมูล' },
                  { id: 'requester', label: 'ผู้ส่งคำขอ', width: 220 },
                  { id: 'status', label: 'สถานะ', width: 140 },
                  { id: 'actions', label: '', width: 140 },
                ]}
              />
              <TableBody>
                {query.isPending &&
                  [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      <TableCell colSpan={5}>
                        <Skeleton height={48} />
                      </TableCell>
                    </TableRow>
                  ))}
                {!query.isPending &&
                  paginated.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="subtitle2">
                          {fDateTime(request.created_at, 'YYYY/MM/DD')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fDateTime(request.created_at, 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                          {request.record_title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getContributionLabel(getContributionGroup(request.record_id))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {request.requester_name || 'สมาชิก'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="soft"
                          color={
                            request.status === 'approved'
                              ? 'success'
                              : request.status === 'rejected'
                                ? 'error'
                                : 'warning'
                          }
                          label={statuses[request.status]}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            mutation.reset();
                            setNote('');
                            setSelected(request);
                          }}
                        >
                          {request.status === 'pending' ? 'ตรวจสอบ' : 'ดูผลตรวจ'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {!query.isPending && !query.error && !filtered.length && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyContent
                        sx={{ py: 6 }}
                        title={
                          search || kind !== 'all' || status !== 'all'
                            ? 'ไม่พบคำขอที่ตรงกับตัวกรอง'
                            : 'ยังไม่มีคำขอร่วมพัฒนาข้อมูล'
                        }
                        description="คำขอที่สมาชิกส่งจะแสดงที่นี่เพื่อให้ทีมงานตรวจสอบ"
                        action={
                          search || kind !== 'all' || status !== 'all' ? (
                            <Button
                              sx={{ mt: 2 }}
                              onClick={() => {
                                setSearch('');
                                setKind('all');
                                setStatus('all');
                                setPage(0);
                              }}
                            >
                              ล้างตัวกรอง
                            </Button>
                          ) : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePaginationCustom
            page={currentPage}
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="แสดงต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) => from + '–' + to + ' จาก ' + count}
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
          />
        </Card>
      </Stack>
      <Dialog
        open={!!selected}
        onClose={() => {
          if (!mutation.isPending) setSelected(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{selected?.record_title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Typography>เหตุผล: {selected?.reason}</Typography>
            {selected &&
              (Object.keys(selected.suggested_payload) as (keyof CraftEdit)[]).map((key) => (
                <Box key={key}>
                  <Typography variant="subtitle1">
                    {getCorrectionFieldLabels(selected.record_id)[key]}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption">ข้อมูลเดิม</Typography>
                      {key === 'images' ? (
                        <CraftImageGallery images={selected.original_snapshot.images ?? []} />
                      ) : (
                        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {selected.original_snapshot[key] || 'ยังไม่มีข้อมูล'}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
                      <Typography variant="caption">ข้อมูลที่เสนอ</Typography>
                      {key === 'images' ? (
                        <CraftImageGallery images={selected.suggested_payload.images ?? []} />
                      ) : (
                        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {selected.suggested_payload[key] || 'ลบข้อมูลช่องนี้'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            {selected?.status === 'pending' ? (
              <TextField
                label="ความเห็นถึงสมาชิก"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                multiline
                minRows={2}
                inputProps={{ maxLength: 3000 }}
              />
            ) : (
              <Typography>ความเห็นแอดมิน: {selected?.review_note || '—'}</Typography>
            )}
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={() => setSelected(null)}>
            กลับ
          </Button>
          {selected?.status === 'pending' && (
            <>
              <Button
                color="error"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('rejected')}
              >
                ไม่อนุมัติ
              </Button>
              <Button
                variant="contained"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('approved')}
              >
                อนุมัติและเผยแพร่
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

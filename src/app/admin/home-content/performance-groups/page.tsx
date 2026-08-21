'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { SECTION_KEY, normalizeContent, type HomeContentResponse } from './performance-groups-data';

const TABLE_HEAD = [
  { id: 'group', label: 'วงศิลปิน/วงดนตรี', minWidth: 280 },
  { id: 'category', label: 'ประเภทและพื้นที่', minWidth: 180 },
  { id: 'members', label: 'สมาชิก', width: 110, align: 'center' as const },
  { id: 'years', label: 'ข้อมูลรายปี', width: 120, align: 'center' as const },
  { id: 'status', label: 'สถานะ', minWidth: 190 },
  { id: 'actions', label: '', width: 150, align: 'right' as const },
];

export default function PerformanceGroupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { user } = useAuthContext();
  const accessToken = user?.accessToken ?? user?.access_token ?? '';
  const query = useQuery({
    queryKey: ['admin-home-content', SECTION_KEY, accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<HomeContentResponse>(`/api/admin/home-content?sectionKey=${SECTION_KEY}`, {
        accessToken,
      }),
  });
  const content = useMemo(() => normalizeContent(query.data?.data?.content), [query.data]);
  const paginatedGroups = useMemo(
    () => content.groups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [content.groups, page, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(content.groups.length / rowsPerPage) - 1, 0);

    if (page > maxPage) setPage(maxPage);
  }, [content.groups.length, page, rowsPerPage]);
  const remove = useMutation({
    mutationFn: (id: string) =>
      adminApiRequest('/api/admin/home-content', {
        method: 'PUT',
        accessToken,
        body: {
          sectionKey: SECTION_KEY,
          content: { ...content, groups: content.groups.filter((group) => group.id !== id) },
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-home-content', SECTION_KEY] }),
  });

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              ข้อมูลวงศิลปินและวงดนตรี
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              รายการวงโปงลาง วงหมอลำ และวงดนตรีทั้งหมด
            </Typography>
          </div>
          <Box>
            <Button
              size="medium"
              component={RouterLink}
              href="/admin/home-content/performance-groups/new"
              variant="contained"
            >
              + สร้างวงใหม่
            </Button>
          </Box>
        </Stack>
        {query.isLoading ? <CircularProgress /> : null}
        {query.error ? <Alert severity="error">โหลดข้อมูลไม่สำเร็จ</Alert> : null}
        {remove.error ? <Alert severity="error">ลบข้อมูลไม่สำเร็จ</Alert> : null}
        {!query.isLoading && content.groups.length === 0 ? (
          <Alert severity="info">ยังไม่มีข้อมูลวง</Alert>
        ) : null}
        {content.groups.length > 0 && (
          <Card>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  รายการทั้งหมด
                </Typography>
                <Chip
                  size="small"
                  variant="soft"
                  label={`${content.groups.length.toLocaleString('th-TH')} วง`}
                />
              </Stack>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 1050 }}>
                <TableHeadCustom headCells={TABLE_HEAD} />
                <TableBody>
                  {paginatedGroups.map((group) => (
                    <TableRow key={group.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            variant="rounded"
                            src={group.logoUrl || group.coverImageUrl}
                            alt={group.name}
                            sx={{ width: 48, height: 48, bgcolor: group.primaryColor }}
                          >
                            {group.name?.slice(0, 1)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }}>
                              {group.name || 'ยังไม่ได้ระบุชื่อวง'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                maxWidth: 340,
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {group.description || 'ยังไม่มีคำอธิบาย'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {group.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.provinceName ? `จังหวัด${group.provinceName}` : 'ไม่ระบุจังหวัด'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 800 }}>
                          {group.totalMembers.toLocaleString('th-TH')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          คน
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 800 }}>{group.yearlyData.length}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ปี
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
                          <Chip
                            size="small"
                            label={group.isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                            color={group.isPublished ? 'success' : 'default'}
                          />
                          {group.isFeatured && (
                            <Chip size="small" label="วงแนะนำ" color="warning" />
                          )}
                          {group.acceptsBookings && (
                            <Chip size="small" label="เปิดรับงาน" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            component={RouterLink}
                            href={`/admin/home-content/performance-groups/${encodeURIComponent(group.id)}/edit`}
                            size="small"
                            variant="outlined"
                          >
                            แก้ไข
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (window.confirm(`ยืนยันการลบ “${group.name}” หรือไม่?`)) {
                                remove.mutate(group.id);
                              }
                            }}
                          >
                            ลบ
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={!paginatedGroups.length} />
                </TableBody>
              </Table>
            </TableContainer>
            <TablePaginationCustom
              page={page}
              count={content.groups.length}
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
        )}
      </Stack>
    </DashboardContent>
  );
}

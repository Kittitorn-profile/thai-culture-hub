'use client';

import type { AnalyticsSummary } from './types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Chart, useChart } from 'src/components/chart';
import { TruncatedTypography } from 'src/components/typography';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { getAnalyticsAction } from './actions';

const PAGE_TABLE_HEAD = [
  { id: 'path', label: 'หน้าเว็บ' },
  { id: 'pageViews', label: 'Page views', width: 160, align: 'right' as const },
  { id: 'visitors', label: 'Visitors', width: 160, align: 'right' as const },
];

const REFERRER_TABLE_HEAD = [
  { id: 'referrer', label: 'แหล่งที่มา' },
  { id: 'pageViews', label: 'Page views', width: 160, align: 'right' as const },
];

const EVENT_TABLE_HEAD = [
  { id: 'name', label: 'รายการ' },
  { id: 'count', label: 'จำนวนครั้ง', width: 130, align: 'right' as const },
  { id: 'visitors', label: 'Visitors', width: 130, align: 'right' as const },
];

function StatCard({
  title,
  value,
  helperText,
}: {
  title: string;
  value: string;
  helperText: string;
}) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, fontWeight: 900 }}>
        {value}
      </Typography>
      <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>{helperText}</Typography>
    </Card>
  );
}

function EventSummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: AnalyticsSummary['topNavigation'];
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const paginatedRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rows, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(rows.length / rowsPerPage) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, rows.length, rowsPerPage]);

  return (
    <Card>
      <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Chip size="small" label={`${rows.length.toLocaleString('th-TH')} รายการ`} variant="soft" />
      </Box>
      <TableContainer sx={{ overflow: 'auto' }}>
        <Table sx={{ minWidth: 420 }}>
          <TableHeadCustom headCells={EVENT_TABLE_HEAD} />
          <TableBody>
            {paginatedRows.map((row) => (
              <TableRow key={row.name} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 800 }}>{row.name}</Typography>
                  {row.metadata?.provinceName && (
                    <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 12 }}>
                      {String(row.metadata.provinceName)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{fNumber(row.count)}</TableCell>
                <TableCell align="right">{fNumber(row.visitors)}</TableCell>
              </TableRow>
            ))}
            <TableNoData notFound={!rows.length} />
          </TableBody>
        </Table>
      </TableContainer>
      <TablePaginationCustom
        page={page}
        count={rows.length}
        rowsPerPage={rowsPerPage}
        labelRowsPerPage="จำนวนต่อหน้า:"
        rowsPerPageOptions={[5, 10, 25]}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
      />
    </Card>
  );
}

export function AnalyticsAdminClient() {
  const { user, checkUserSession } = useAuthContext();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topPagesPage, setTopPagesPage] = useState(0);
  const [topPagesRowsPerPage, setTopPagesRowsPerPage] = useState(10);
  const [referrersPage, setReferrersPage] = useState(0);
  const [referrersRowsPerPage, setReferrersRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const loadAnalytics = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await getAnalyticsAction(accessToken, days);

      if (!result.ok) {
        if (result.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(result.message);
      }

      setSummary(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดสถิติไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession, days]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartOptions = useChart({
    xaxis: {
      categories: summary?.daily.map((point) => point.date.slice(5)) ?? [],
    },
    yaxis: { min: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => fNumber(value),
      },
    },
  });

  const chartSeries = useMemo(
    () => [
      {
        name: 'Page views',
        data: summary?.daily.map((point) => point.pageViews) ?? [],
      },
      {
        name: 'Visitors',
        data: summary?.daily.map((point) => point.visitors) ?? [],
      },
    ],
    [summary]
  );
  const topPages = useMemo(() => summary?.topPages ?? [], [summary?.topPages]);
  const referrers = useMemo(() => summary?.referrers ?? [], [summary?.referrers]);
  const paginatedTopPages = useMemo(
    () =>
      topPages.slice(
        topPagesPage * topPagesRowsPerPage,
        topPagesPage * topPagesRowsPerPage + topPagesRowsPerPage
      ),
    [topPages, topPagesPage, topPagesRowsPerPage]
  );
  const paginatedReferrers = useMemo(
    () =>
      referrers.slice(
        referrersPage * referrersRowsPerPage,
        referrersPage * referrersRowsPerPage + referrersRowsPerPage
      ),
    [referrers, referrersPage, referrersRowsPerPage]
  );

  useEffect(() => {
    setTopPagesPage(0);
    setReferrersPage(0);
  }, [days]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(topPages.length / topPagesRowsPerPage) - 1, 0);

    if (topPagesPage > maxPage) {
      setTopPagesPage(maxPage);
    }
  }, [topPages.length, topPagesPage, topPagesRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(referrers.length / referrersRowsPerPage) - 1, 0);

    if (referrersPage > maxPage) {
      setReferrersPage(maxPage);
    }
  }, [referrers.length, referrersPage, referrersRowsPerPage]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              สถิติเข้าเว็บไซต์
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              สถิติคนเข้าเว็บจาก page views ที่ระบบเก็บไว้ใน Supabase
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={days}
              onChange={(_, value) => value && setDays(value)}
            >
              <ToggleButton value={7}>7 วัน</ToggleButton>
              <ToggleButton value={30}>30 วัน</ToggleButton>
              <ToggleButton value={90}>90 วัน</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="outlined" onClick={loadAnalytics} disabled={isLoading}>
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลดสถิติ...</Alert>}

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatCard
              title="Page views"
              value={fNumber(summary?.totalPageViews ?? 0)}
              helperText={`รวม ${days} วันที่เลือก`}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatCard
              title="Visitors"
              value={fNumber(summary?.uniqueVisitors ?? 0)}
              helperText="นับจาก visitor id ใน browser"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatCard
              title="Sessions"
              value={fNumber(summary?.totalSessions ?? 0)}
              helperText="นับตาม sessionStorage"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatCard
              title="Views / session"
              value={fNumber(summary?.averageViewsPerSession ?? 0, {
                maximumFractionDigits: 1,
              })}
              helperText="ค่าเฉลี่ยการเปิดหน้าต่อ session"
            />
          </Grid>
        </Grid>

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6">แนวโน้มรายวัน</Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                เปรียบเทียบ Page views และ Visitors ตามช่วงวันที่เลือก
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Views ${fNumber(summary?.totalPageViews ?? 0)}`}
                color="primary"
                variant="soft"
              />
              <Chip
                label={`Visitors ${fNumber(summary?.uniqueVisitors ?? 0)}`}
                color="success"
                variant="soft"
              />
            </Stack>
          </Stack>
          <Chart type="area" series={chartSeries} options={chartOptions} sx={{ height: 360 }} />
        </Card>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <Box sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="h6">หน้าเว็บยอดนิยม</Typography>
                  <Chip
                    size="small"
                    label={`${topPages.length.toLocaleString('th-TH')} หน้า`}
                    variant="soft"
                  />
                </Stack>
              </Box>
              <TableContainer sx={{ overflow: 'auto' }}>
                <Table sx={{ minWidth: 640 }}>
                  <TableHeadCustom headCells={PAGE_TABLE_HEAD} />
                  <TableBody>
                    {paginatedTopPages.map((page) => (
                      <TableRow key={page.path} hover>
                        <TableCell>
                          <TruncatedTypography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                            {page.path}
                          </TruncatedTypography>
                        </TableCell>
                        <TableCell align="right">{fNumber(page.pageViews)}</TableCell>
                        <TableCell align="right">{fNumber(page.visitors)}</TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={!topPages.length} />
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePaginationCustom
                page={topPagesPage}
                count={topPages.length}
                rowsPerPage={topPagesRowsPerPage}
                labelRowsPerPage="จำนวนต่อหน้า:"
                rowsPerPageOptions={[5, 10, 25, 50]}
                onPageChange={(_, newPage) => setTopPagesPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setTopPagesRowsPerPage(Number(event.target.value));
                  setTopPagesPage(0);
                }}
              />
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <Box sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="h6">แหล่งที่มา</Typography>
                  <Chip
                    size="small"
                    label={`${referrers.length.toLocaleString('th-TH')} แหล่ง`}
                    variant="soft"
                  />
                </Stack>
              </Box>
              <TableContainer sx={{ overflow: 'auto' }}>
                <Table sx={{ minWidth: 420 }}>
                  <TableHeadCustom headCells={REFERRER_TABLE_HEAD} />
                  <TableBody>
                    {paginatedReferrers.map((referrer) => (
                      <TableRow key={referrer.referrer} hover>
                        <TableCell>{referrer.referrer}</TableCell>
                        <TableCell align="right">{fNumber(referrer.pageViews)}</TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={!referrers.length} />
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePaginationCustom
                page={referrersPage}
                count={referrers.length}
                rowsPerPage={referrersRowsPerPage}
                labelRowsPerPage="จำนวนต่อหน้า:"
                rowsPerPageOptions={[5, 10, 25]}
                onPageChange={(_, newPage) => setReferrersPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setReferrersRowsPerPage(Number(event.target.value));
                  setReferrersPage(0);
                }}
              />
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <EventSummaryCard title="เมนูที่คนคลิก" rows={summary?.topNavigation ?? []} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <EventSummaryCard title="คำค้นหายอดนิยม" rows={summary?.topSearches ?? []} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EventSummaryCard title="จังหวัดที่คนสนใจ" rows={summary?.topProvinces ?? []} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EventSummaryCard title="อำเภอที่คนเลือก" rows={summary?.topDistricts ?? []} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EventSummaryCard title="ตัวกรองที่ถูกใช้" rows={summary?.topFilterOptions ?? []} />
          </Grid>
        </Grid>
      </Stack>
    </DashboardContent>
  );
}

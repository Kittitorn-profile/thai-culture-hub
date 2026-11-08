'use client';

import type { HeritageRecord } from 'src/server/cultural-heritage';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';

import { culturalTopics, culturalExploreUrl } from 'src/utils/cultural-explore';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { ADMIN_PERMISSION, canAccessAdminPermission } from 'src/auth/admin-permissions';

const SOURCE_URL = 'https://data.go.th/dataset/ich_51_02';
type Result = {
  data: HeritageRecord[];
  total: number;
  categories?: string[];
  collectionTotal?: number;
  collectionProvinces?: number;
};
export function CulturalHeritageClient({
  initialQuery = '',
  initialProvince = null,
  initialCollection = 'registry',
  initialCategory = '',
}: {
  initialQuery?: string;
  initialProvince?: string | null;
  initialCollection?: 'registry' | 'community';
  initialCategory?: string;
}) {
  const { user } = useAuthContext();
  const token = user?.accessToken ?? user?.access_token ?? '';
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [province, setProvince] = useState<string | null>(initialProvince);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState(initialCategory);
  const [collection, setCollection] = useState<'registry' | 'community'>(initialCollection);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<HeritageRecord | null>(null);
  const records = useQuery({
    queryKey: ['cultural-heritage', token, query, province, page, limit, collection, category],
    enabled: Boolean(token),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        collection,
        category,
        q: query,
        province: province ?? '',
        page: String(page),
        limit: String(limit),
      });
      return adminApiRequest<Result>(`/api/admin/cultural-heritage?${params}`, {
        accessToken: token,
        signal,
      });
    },
    staleTime: 60000,
    retry: 1,
  });
  const searchRecords = () => {
    setPage(0);
    setQuery(search.trim());
  };
  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600 }}>
              มรดกภูมิปัญญาทางวัฒนธรรม
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: 14 }}>
              ข้อมูลภูมิสารสนเทศจากกรมส่งเสริมวัฒนธรรม ผ่าน Data.go.th
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component="a"
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<Iconify icon="eva:external-link-fill" width={16} />}
            >
              แหล่งข้อมูล
            </Button>
            <Button
              variant="outlined"
              disabled={records.isFetching}
              onClick={() => records.refetch()}
              startIcon={<Iconify icon="solar:restart-bold" />}
            >
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {(
            [
              ['registry', 'ทะเบียนมรดกต้นทาง'],
              ['community', 'วิถีชีวิตและหัตถกรรมชุมชน'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={collection === value ? 'contained' : 'outlined'}
              aria-pressed={collection === value}
              onClick={() => {
                setCollection(value);
                setPage(0);
                setSearch('');
                setQuery('');
                setProvince(null);
              }}
              sx={{ borderRadius: 99 }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        {collection === 'community' && (
          <Alert severity="info">
            {records.data?.collectionTotal ?? '…'} เรื่อง ครอบคลุม{' '}
            {records.data?.collectionProvinces ?? '…'} จังหวัด ทั้งผ้าทอ ทอเสื่อ/สาด จักสาน
            ผลิตภัณฑ์ชุมชน และศูนย์ศิลปาชีพ พร้อมแหล่งอ้างอิง ไม่ใช้แทนทะเบียนมรดกหรือการรับรอง OTOP
            ปัจจุบัน
          </Alert>
        )}
        <Card sx={{ p: 2.5, border: '1px solid #e2e5de', boxShadow: 'none' }}>
          <Stack
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              searchRecords();
            }}
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
          >
            <TextField
              fullWidth
              size="small"
              label="ค้นหาชื่อหรือข้อมูลมรดก"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" width={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Autocomplete
              options={provinces.map((p) => p.name)}
              value={province}
              onChange={(_event, value) => {
                setProvince(value);
                setPage(0);
              }}
              sx={{ width: { xs: 1, md: 260 }, flexShrink: 0 }}
              renderInput={(params) => (
                <TextField {...params} size="small" label="จังหวัด" placeholder="ทุกจังหวัด" />
              )}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={records.isFetching}
              sx={{ minWidth: 88 }}
            >
              ค้นหา
            </Button>
          </Stack>
        </Card>
        {(collection === 'community' || category) && (
          <TextField
            select
            size="small"
            label="หมวดข้อมูลชุมชน"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
            sx={{ maxWidth: { xs: '100%', md: 320 } }}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {(records.data?.categories ?? (category ? [category] : [])).map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        )}
        {records.error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => records.refetch()}>
                ลองใหม่
              </Button>
            }
          >
            {records.error.message}
          </Alert>
        )}
        <Card sx={{ border: '1px solid #e2e5de', boxShadow: 'none' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 600 }}>รายการมรดกภูมิปัญญา</Typography>
            <Chip
              size="small"
              label={
                records.isFetching
                  ? 'กำลังโหลด…'
                  : `${(records.data?.total ?? 0).toLocaleString('th-TH')} รายการ`
              }
            />
          </Stack>
          <TableContainer>
            <Table sx={{ minWidth: 860 }} aria-label="รายการมรดกภูมิปัญญาทางวัฒนธรรม">
              <TableHead>
                <TableRow>
                  <TableCell>ชื่อรายการ</TableCell>
                  <TableCell>จังหวัด / ภาค</TableCell>
                  <TableCell>หมวดมรดก</TableCell>
                  <TableCell>{collection === 'registry' ? 'ปีขึ้นบัญชี' : 'แหล่งข้อมูล'}</TableCell>
                  <TableCell align="right">รายละเอียด</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(records.data?.data ?? []).map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                        {item.name || 'ไม่ระบุชื่อ'}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 12,
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.status}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 14 }}>{item.province || 'ไม่ระบุ'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.region}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Stack spacing={0.5}>
                        {item.categories.map((label) => (
                          <Typography key={label} sx={{ fontSize: 12 }}>
                            {label}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {collection === 'registry' ? (
                        <>
                          <Typography variant="caption" display="block">
                            ชาติ: {item.nationalYear || '—'}
                          </Typography>
                          <Typography variant="caption">
                            จังหวัด: {item.provincialYear || '—'}
                          </Typography>
                        </>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', maxWidth: 180, whiteSpace: 'normal' }}
                        >
                          {item.organization}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setSelected(item)}>
                        ดูข้อมูล
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!records.data?.data.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 7 }}>
                      {records.isFetching
                        ? 'กำลังโหลดข้อมูล…'
                        : records.error
                          ? 'ไม่สามารถโหลดรายการได้'
                          : 'ไม่พบข้อมูลที่ค้นหา'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={records.data?.total ?? 0}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[20, 50, 100]}
            onPageChange={(_event, value) => setPage(value)}
            onRowsPerPageChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(0);
            }}
            labelRowsPerPage="รายการต่อหน้า"
          />
        </Card>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {collection === 'registry'
            ? 'ทะเบียนอ่านจาก CKAN โดยตรง'
            : 'ข้อมูลชุมชนและหัตถกรรมรวบรวมจากหน่วยงานและผู้เผยแพร่ต้นทาง'}{' '}
          · ข้อมูลในหน้านี้ยังไม่แสดงบนหน้าเว็บไซต์สาธารณะ
        </Typography>
      </Stack>
      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        slotProps={{
          paper: { sx: { width: { xs: 1, sm: 540 }, bgcolor: '#fff', backgroundImage: 'none' } },
        }}
      >
        {selected && (
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                ข้อมูลมรดกภูมิปัญญา
              </Typography>
              <IconButton aria-label="ปิดรายละเอียด" onClick={() => setSelected(null)}>
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Stack>
            <Typography component="h2" sx={{ fontSize: 24, fontWeight: 600 }}>
              {selected.name}
            </Typography>
            {[
              ['จังหวัด', selected.province],
              ['ภาค', selected.region],
              ['หมวดมรดก', selected.categories.join('\n')],
              ...(collection === 'registry'
                ? [
                    ['ปีขึ้นบัญชีระดับชาติ', selected.nationalYear],
                    ['ปีขึ้นบัญชีระดับจังหวัด', selected.provincialYear],
                    ['สถานะการคงอยู่', selected.status],
                  ]
                : []),
              ...(selected.description ? [['เรื่องราว', selected.description]] : []),
              ...(selected.technique ? [['เทคนิคและภูมิปัญญา', selected.technique]] : []),
              ...(selected.lifestyle ? [['ความสัมพันธ์กับวิถีชีวิต', selected.lifestyle]] : []),
              ...(selected.organization ? [['ผู้เผยแพร่ข้อมูล', selected.organization]] : []),
              ...(selected.checkedAt ? [['วันที่ตรวจข้อมูล', selected.checkedAt]] : []),
              ['พื้นที่ปฏิบัติ', selected.practice],
              ['หมายเหตุ', selected.note],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-line' }}>
                  {value || 'ยังไม่ระบุ'}
                </Typography>
              </Box>
            ))}
            {canAccessAdminPermission(user, ADMIN_PERMISSION.culturalArtists) && (
              <Box sx={{ p: 2, bgcolor: '#f4f6f2', borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>ค้นหาศิลปินและผู้สืบทอด</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                  สำรวจรายชื่อจากคำค้นหรือจังหวัด ยังไม่ใช่รายชื่อผู้สืบทอดที่ยืนยันแล้ว
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {(culturalTopics(selected.name).length
                    ? culturalTopics(selected.name)
                    : [selected.name]
                  ).map((topic) => (
                    <Button
                      component="a"
                      key={topic}
                      size="small"
                      variant="outlined"
                      href={culturalExploreUrl('artists', topic)}
                      sx={{ borderRadius: 99 }}
                    >
                      {topic}
                    </Button>
                  ))}
                  {provinces.some((item) => item.name === selected.province) && (
                    <Button
                      component="a"
                      size="small"
                      href={culturalExploreUrl('artists', '', selected.province)}
                    >
                      ศิลปินในจังหวัด{selected.province}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
            {selected.latitude !== null && selected.longitude !== null && (
              <Button
                component="a"
                href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                startIcon={<Iconify icon="mingcute:location-fill" />}
              >
                ดูตำแหน่งบนแผนที่
              </Button>
            )}
            <Button
              component="a"
              href={selected.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<Iconify icon="eva:external-link-fill" />}
            >
              ดูชุดข้อมูลต้นทาง
            </Button>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}

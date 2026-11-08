'use client';

import type { EthnicGroupRecord } from 'src/server/ethnic-groups';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiCloseLine, RiMapPinLine, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

type Result = {
  sources: { name: string; url: string }[];
  data: EthnicGroupRecord[];
  total: number;
  groups: string[];
  provinces: string[];
  coverage: { records: number; groupLabels: number; provinces: number };
  sourceUrl: string;
};
export function EthnicGroupsClient({ initialGroup = '' }: { initialGroup?: string }) {
  const { user } = useAuthContext();
  const token = user?.accessToken ?? user?.access_token ?? '';
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [province, setProvince] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(initialGroup || null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<EthnicGroupRecord | null>(null);
  const records = useQuery({
    queryKey: ['admin-ethnic-groups', token, q, province, group, page, limit],
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      adminApiRequest<Result>(
        `/api/admin/ethnic-groups?${new URLSearchParams({ q, province: province ?? '', group: group ?? '', page: String(page), limit: String(limit) })}`,
        { accessToken: token, signal }
      ),
    staleTime: 60_000,
    retry: 1,
  });
  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h4">
            กลุ่มชาติพันธุ์และชุมชน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            สำรวจชื่อกลุ่ม พื้นที่ชุมชน และรายละเอียดตามแหล่งข้อมูลต้นทาง
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          disabled={records.isFetching}
          onClick={() => records.refetch()}
          sx={{ alignSelf: 'start' }}
        >
          รีเฟรช
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          ['รายการพื้นที่/ชุมชน', records.data?.coverage.records],
          ['ชื่อกลุ่มตามต้นทาง', records.data?.coverage.groupLabels],
          ['จังหวัดที่มีข้อมูล', records.data?.coverage.provinces],
        ].map(([label, count]) => (
          <Card key={label} sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, mt: 1 }}>
              {typeof count === 'number' ? count.toLocaleString('th-TH') : '—'}
            </Typography>
          </Card>
        ))}
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        จำนวนรายการเป็นข้อมูลพื้นที่/ชุมชน
        ไม่ใช่จำนวนกลุ่มชาติพันธุ์ที่แตกต่างกันทั้งหมดของประเทศไทย ชื่อและรายละเอียดแสดงตามต้นทาง
        บางรายการอาจไม่มีคำอธิบายหรือพิกัด
      </Alert>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(search.trim());
          setPage(0);
        }}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr 1fr auto' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          label="ค้นหาชื่อกลุ่ม ชุมชน หรือพื้นที่"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Autocomplete
          size="small"
          options={records.data?.groups ?? []}
          value={group}
          onChange={(_, value) => {
            setGroup(value);
            setPage(0);
          }}
          renderInput={(params) => <TextField {...params} label="ชื่อกลุ่มตามต้นทาง" />}
        />
        <Autocomplete
          size="small"
          options={records.data?.provinces ?? []}
          value={province}
          onChange={(_, value) => {
            setProvince(value);
            setPage(0);
          }}
          renderInput={(params) => <TextField {...params} label="จังหวัด" />}
        />
        <Button type="submit" variant="contained">
          ค้นหา
        </Button>
      </Box>
      {records.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {records.error.message}
          <Button size="small" onClick={() => records.refetch()}>
            ลองอีกครั้ง
          </Button>
        </Alert>
      )}
      <Card>
        <TableContainer>
          <Table sx={{ minWidth: 700 }} aria-label="ข้อมูลกลุ่มชาติพันธุ์และชุมชน">
            <TableHead>
              <TableRow>
                <TableCell>ชื่อ / กลุ่มตามต้นทาง</TableCell>
                <TableCell>ชุมชน / หมู่บ้าน</TableCell>
                <TableCell>พื้นที่</TableCell>
                <TableCell align="right">รายละเอียด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.data?.data.map((item, index) => (
                <TableRow key={`${item.id}:${page}:${index}`} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {item.title || item.group || 'ไม่ระบุชื่อ'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {item.group}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.village || item.villageEnglish || 'ยังไม่ระบุ'}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 14 }}>
                      {item.province || 'ยังไม่ระบุจังหวัด'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {[
                        item.district && `อ.${item.district}`,
                        item.subDistrict && `ต.${item.subDistrict}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="outlined" size="small" onClick={() => setSelected(item)}>
                      ดูข้อมูล
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!records.data?.data.length && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    {records.isPending
                      ? 'กำลังโหลดข้อมูล…'
                      : records.isError
                        ? 'ยังโหลดข้อมูลไม่ได้'
                        : 'ไม่พบข้อมูลที่ตรงกับตัวกรอง'}
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
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(0);
          }}
          labelRowsPerPage="รายการต่อหน้า"
        />
      </Card>
      {records.data && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            แสดง {records.data.data.length} จาก {records.data.total.toLocaleString('th-TH')}{' '}
            รายการที่ตรงตัวกรอง · ข้อมูลจากแหล่งอ้างอิงที่นำเข้าเก็บในระบบ
          </Typography>
          {records.data.sources.map((source) => (
            <Button
              key={source.name}
              component="a"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<RiArrowRightUpLine size={16} />}
            >
              {source.name}
            </Button>
          ))}
        </Box>
      )}
      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 520 },
              p: 3,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              '& > *': { flexShrink: 0 },
            },
          },
        }}
      >
        {selected && (
          <>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                รายละเอียดตามข้อมูลต้นทาง
              </Typography>
              <IconButton aria-label="ปิดรายละเอียด" onClick={() => setSelected(null)}>
                <RiCloseLine size={20} />
              </IconButton>
            </Box>
            <Typography component="h2" variant="h5">
              {selected.title || selected.group || 'ยังไม่ระบุชื่อ'}
            </Typography>
            {[
              ['ชื่อกลุ่มตามต้นทาง', selected.group],
              ['ชุมชน / หมู่บ้าน', selected.village],
              ['ชื่อชุมชนภาษาอังกฤษ', selected.villageEnglish],
              ['จังหวัด', selected.province],
              ['อำเภอ', selected.district],
              ['ตำบล', selected.subDistrict],
              ['ภูมิภาคตามต้นทาง', selected.region],
              ['รายละเอียด', selected.description],
              ['แหล่งข้อมูล', selected.sourceName],
              [
                'ประเภทพิกัด',
                selected.coordinateKind === 'community_reference'
                  ? 'จุดอ้างอิงชุมชนตามแผนที่ต้นทาง ไม่ใช่ขอบเขตพื้นที่'
                  : 'พิกัดตามชุดข้อมูลต้นทาง',
              ],
              [
                'Lat / Long',
                selected.latitude !== null && selected.longitude !== null
                  ? `${selected.latitude}, ${selected.longitude}`
                  : '',
              ],
              ['วันที่ตรวจข้อมูลเสริม', selected.checkedAt],
            ].map(([label, value]) => (
              <Box key={label} sx={{ mt: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-line' }}>
                  {value || 'ต้นทางยังไม่ระบุ'}
                </Typography>
              </Box>
            ))}
            {selected.latitude !== null && selected.longitude !== null && (
              <Button
                component="a"
                href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<RiMapPinLine size={18} />}
                variant="outlined"
                sx={{ mt: 3 }}
              >
                ดูพิกัดตามต้นทาง
              </Button>
            )}
            <Button
              component="a"
              href={selected.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<RiArrowRightUpLine size={16} />}
              sx={{ mt: 2 }}
            >
              {selected.sourceName} · แหล่งอ้างอิง
            </Button>
          </>
        )}
      </Drawer>
    </DashboardContent>
  );
}

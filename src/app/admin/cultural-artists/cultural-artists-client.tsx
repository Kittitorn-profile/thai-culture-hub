'use client';

import type { CulturalArtist } from 'src/server/cultural-artists';

import Link from 'next/link';
import { useState } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';

import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';

import { useAuthContext } from 'src/auth/hooks';
import { ADMIN_PERMISSION, canAccessAdminPermission } from 'src/auth/admin-permissions';

const TYPES: Record<string, string> = {
  national_artist: 'ทำเนียบศิลปินแห่งชาติ',
  contemporary_artist: 'ศิลปินร่วมสมัย',
  silpathorn_artist: 'ศิลปินศิลปาธร',
  folk_artist: 'ศิลปินพื้นบ้าน',
  local_artist: 'ศิลปินท้องถิ่น',
  performing_artist: 'ศิลปินนักร้อง/นักดนตรี',
};
type Result = {
  data: CulturalArtist[];
  total: number;
  genres: string[];
  notes: string[];
  coverage: { totalArtists: number; withVerifiedProvince: number; provinces: number };
};

export function CulturalArtistsClient({
  initialQuery = '',
  initialProvince = null,
  initialType = '',
}: {
  initialQuery?: string;
  initialProvince?: string | null;
  initialType?: string;
}) {
  const { user } = useAuthContext();
  const [search, setSearch] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery);
  const [province, setProvince] = useState<string | null>(initialProvince);
  const [type, setType] = useState(initialType);
  const [provinceStatus, setProvinceStatus] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const records = useQuery<Result>({
    queryKey: ['admin', 'cultural-artists', q, province, type, genre, provinceStatus, page],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: '24',
        _: String(Date.now()),
      });
      if (q) params.set('q', q);
      if (province) params.set('provinceCode', province);
      if (type) params.set('type', type);
      if (genre) params.set('genre', genre);
      if (provinceStatus) params.set('provinceStatus', provinceStatus);
      const response = await fetch(`/api/cultural-artists/?${params}`, { signal });
      if (!response.ok) throw new Error('โหลดข้อมูลศิลปินไม่สำเร็จ');
      return response.json();
    },
    staleTime: 60_000,
  });
  const coverage = records.data?.coverage;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
        <Typography component="h1" variant="h4">
          ศิลปินรายจังหวัด
        </Typography>
        {canAccessAdminPermission(user, ADMIN_PERMISSION.culturalArtists) && (
          <Button component={Link} href="/admin/cultural-artists/new/" variant="contained">
            เพิ่มข้อมูลศิลปิน
          </Button>
        )}
      </Box>
      <Typography sx={{ mt: 1, color: 'text.secondary', mb: 3 }}>
        ทำเนียบศิลปินแห่งชาติ ศิลปินร่วมสมัย และศิลปินพื้นบ้าน พร้อมหลักฐานความเกี่ยวข้องกับจังหวัด
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          ['รายชื่อทั้งหมด', coverage?.totalArtists],
          ['ยืนยันจังหวัดแล้ว', coverage?.withVerifiedProvince],
          [
            'รอยืนยันจังหวัด',
            coverage ? coverage.totalArtists - coverage.withVerifiedProvince : undefined,
          ],
          ['จังหวัดที่มีข้อมูล', coverage?.provinces],
        ].map(([label, value]) => (
          <Box
            key={String(label)}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              p: 2,
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, mt: 0.5 }}>
              {typeof value === 'number' ? value.toLocaleString('th-TH') : '—'}
            </Typography>
          </Box>
        ))}
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        ทำเนียบศิลปินแห่งชาติชุดนี้ครอบคลุมปี 2528–2566 เป็นประวัติการยกย่องตามต้นทาง
        ไม่ใช่การรับรองสถานะปัจจุบัน จังหวัดเกิด พื้นที่ทำงาน และแหล่งเรียนรู้แยกจากกัน
      </Alert>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {[
          ['', 'ทั้งหมด'],
          ['verified', 'ยืนยันจังหวัดแล้ว'],
          ['pending_verification', 'รอยืนยันจังหวัด'],
        ].map(([value, label]) => (
          <Button
            key={value}
            size="small"
            variant={provinceStatus === value ? 'contained' : 'outlined'}
            color="inherit"
            onClick={() => {
              setProvinceStatus(value);
              setProvince(null);
              setPage(0);
            }}
            sx={{ borderRadius: 99 }}
          >
            {label}
          </Button>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(search.trim());
          setPage(0);
        }}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1.4fr 1fr 1fr 1fr auto' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          label="ค้นหาศิลปิน"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <RiSearchLine size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Autocomplete
          size="small"
          options={provinces}
          getOptionLabel={(option) => option.name}
          value={provinces.find((option) => option.code === province) ?? null}
          onChange={(_event, value) => {
            setProvince(value?.code ?? null);
            setPage(0);
          }}
          renderInput={(params) => <TextField {...params} label="จังหวัดที่เกี่ยวข้อง" />}
        />
        <TextField
          size="small"
          select
          label="ประเภทศิลปิน"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(0);
          }}
        >
          <MenuItem value="">ทั้งหมด</MenuItem>
          {Object.entries(TYPES).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          size="small"
          options={records.data?.genres ?? []}
          value={genre}
          onChange={(_event, value) => {
            setGenre(value);
            setPage(0);
          }}
          renderInput={(params) => <TextField {...params} label="แนวดนตรี / การแสดง" />}
        />
        <Button type="submit" variant="contained">
          ค้นหา
        </Button>
      </Box>
      {records.error && (
        <Alert
          severity="error"
          action={<Button onClick={() => records.refetch()}>ลองอีกครั้ง</Button>}
        >
          {records.error.message}
        </Alert>
      )}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 820 }} aria-label="รายชื่อศิลปิน">
            <TableHead>
              <TableRow>
                <TableCell>ศิลปิน</TableCell>
                <TableCell>ประเภท / สาขา</TableCell>
                <TableCell>จังหวัดที่เกี่ยวข้อง</TableCell>
                <TableCell align="right">รายละเอียด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.isPending ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    กำลังโหลดข้อมูลศิลปิน…
                  </TableCell>
                </TableRow>
              ) : records.data?.data.length ? (
                records.data.data.map((artist) => (
                  <TableRow key={artist.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={artist.image?.url}
                          alt={artist.name}
                          sx={{ width: 48, height: 48 }}
                        >
                          {artist.name.slice(0, 1)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600 }}>{artist.name}</Typography>
                      </Box>
                      {artist.aliases.length > 0 && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {artist.aliases.join(' · ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>
                        {artist.types.map((kind) => TYPES[kind]).join(' · ')}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                        {artist.genres.length
                          ? artist.genres.join(' · ')
                          : artist.fields.join(' · ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {artist.provinceAssociations.length ? (
                        [
                          ...new Map(
                            artist.provinceAssociations.map((item) => [
                              item.provinceCode,
                              item.provinceName,
                            ])
                          ).values(),
                        ].join(' · ')
                      ) : (
                        <Chip size="small" label="รอยืนยันจังหวัด" color="warning" variant="soft" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        href={`/admin/cultural-artists/${encodeURIComponent(artist.id)}/`}
                        size="small"
                        variant="outlined"
                      >
                        ดูข้อมูล
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    ไม่พบรายชื่อที่ตรงกับตัวกรอง
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
          rowsPerPage={24}
          rowsPerPageOptions={[24]}
          onPageChange={(_event, value) => setPage(value)}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} จาก ${count.toLocaleString('th-TH')} รายชื่อ`
          }
          labelRowsPerPage="ต่อหน้า"
        />
      </Box>
    </DashboardContent>
  );
}

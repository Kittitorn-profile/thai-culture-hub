'use client';

import type { CulturalArtist } from 'src/server/cultural-artists';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiCloseLine, RiSearchLine, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
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

import { culturalExploreUrl } from 'src/utils/cultural-explore';

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
const RELATIONSHIPS: Record<string, string> = {
  birthplace: 'จังหวัดเกิด',
  origin: 'ภูมิลำเนา',
  work_area: 'พื้นที่ทำงาน',
  learning_site: 'บ้านศิลปิน/แหล่งเรียนรู้',
  cultural_legacy: 'มรดกผลงานวัฒนธรรม',
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
  const canExploreHeritage = canAccessAdminPermission(user, ADMIN_PERMISSION.culturalHeritage);
  const [search, setSearch] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery);
  const [province, setProvince] = useState<string | null>(initialProvince);
  const [type, setType] = useState(initialType);
  const [provinceStatus, setProvinceStatus] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CulturalArtist | null>(null);
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
      <Typography component="h1" variant="h4">
        ศิลปินรายจังหวัด
      </Typography>
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
                      <Button size="small" variant="outlined" onClick={() => setSelected(artist)}>
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
      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 520 },
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              '& > *': { flexShrink: 0 },
              p: 3,
            },
          },
        }}
      >
        {selected && (
          <>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
            >
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                ข้อมูลศิลปินและแหล่งอ้างอิง
              </Typography>
              <IconButton aria-label="ปิดรายละเอียด" onClick={() => setSelected(null)}>
                <RiCloseLine size={20} />
              </IconButton>
            </Box>
            <ArtistImageEditor
              key={selected.id}
              artist={selected}
              onSaved={(artist) => {
                setSelected(artist);
                records.refetch();
              }}
            />
            <Typography component="h2" variant="h5">
              {selected.name}
            </Typography>
            <Typography sx={{ color: 'text.secondary', mt: 1 }}>
              {selected.types.map((kind) => TYPES[kind]).join(' · ')}
            </Typography>
            <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>สาขาและแนวการแสดง</Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.8 }}>
              {selected.fields.join(' · ')}
            </Typography>
            {canExploreHeritage && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f4f6f2', borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>สำรวจเรื่องวัฒนธรรมต่อ</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                  ค้นหาจากแนวการแสดงหรือจังหวัด ไม่ใช่การรับรองว่าเป็นผู้สืบทอดรายการนั้น
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selected.genres.map((topic) => (
                    <Button
                      component="a"
                      key={topic}
                      size="small"
                      variant="outlined"
                      href={culturalExploreUrl('heritage', topic)}
                      sx={{ borderRadius: 99 }}
                    >
                      {topic}
                    </Button>
                  ))}
                  {[
                    ...new Map(
                      selected.provinceAssociations.map((item) => [item.provinceCode, item])
                    ).values(),
                  ].map((item) => (
                    <Button
                      component="a"
                      key={item.provinceCode}
                      size="small"
                      href={culturalExploreUrl('heritage', '', item.provinceCode)}
                    >
                      มรดกภูมิปัญญา · {item.provinceName}
                    </Button>
                  ))}
                  {!selected.genres.length && !selected.provinceAssociations.length && (
                    <Button component="a" href={culturalExploreUrl('heritage')}>
                      ดูมรดกภูมิปัญญาทั้งหมด
                    </Button>
                  )}
                </Box>
              </Box>
            )}
            <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>ความเกี่ยวข้องกับจังหวัด</Typography>
            {selected.provinceAssociations.length ? (
              selected.provinceAssociations.map((item, index) => (
                <Box
                  key={`${item.provinceCode}:${index}`}
                  sx={{ p: 2, mb: 1, borderRadius: 1.5, bgcolor: '#f0f3ed' }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{item.provinceName}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                    {RELATIONSHIPS[item.relationship]}
                    {item.district ? ` · ${item.district}` : ''}
                  </Typography>
                  <Button
                    size="small"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<RiArrowRightUpLine size={14} />}
                  >
                    หลักฐานอ้างอิง
                  </Button>
                </Box>
              ))
            ) : (
              <Alert severity="warning">ยังไม่มีหลักฐานระบุจังหวัด จึงยังไม่จัดลงจังหวัดใด</Alert>
            )}
            {!!selected.awards?.length && (
              <>
                <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                  รางวัลและผลงานที่ได้รับการยอมรับ
                </Typography>
                {selected.awards.map((award, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: 14 }}>
                      {award.title} · พ.ศ. {award.yearBE}
                    </Typography>
                    <Button
                      size="small"
                      href={award.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<RiArrowRightUpLine size={14} />}
                    >
                      แหล่งอ้างอิงรางวัล
                    </Button>
                  </Box>
                ))}
              </>
            )}
            {selected.recognitions.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                  ประวัติการยกย่องตามทำเนียบ
                </Typography>
                {selected.recognitions.map((item, index) => (
                  <Typography key={index} sx={{ fontSize: 14, mb: 1 }}>
                    พ.ศ. {item.yearBE} · {item.field} {item.specialty}
                  </Typography>
                ))}
              </>
            )}
            <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>แหล่งข้อมูลทั้งหมด</Typography>
            {[...new Set(selected.sources.map((source) => source.url))].map((url) => (
              <Button
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<RiArrowRightUpLine size={14} />}
                sx={{ justifyContent: 'flex-start', mb: 1 }}
              >
                ดูแหล่งข้อมูล · {new URL(url).hostname}
              </Button>
            ))}
          </>
        )}
      </Drawer>
    </DashboardContent>
  );
}

function ArtistImageEditor({
  artist,
  onSaved,
}: {
  artist: CulturalArtist;
  onSaved: (artist: CulturalArtist) => void;
}) {
  const { user } = useAuthContext();
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState(artist.image?.credit ?? '');
  const [sourceUrl, setSourceUrl] = useState(artist.image?.sourceUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  return (
    <Box
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file || saving) return;
        setSaving(true);
        setMessage('');
        setSuccess(false);
        try {
          const form = new FormData();
          form.set('artistId', artist.id);
          form.set('file', file);
          form.set('credit', credit.trim());
          form.set('sourceUrl', sourceUrl.trim());
          const token = user?.accessToken ?? user?.access_token;
          const response = await fetch('/api/admin/cultural-artists/image/', {
            method: 'POST',
            body: form,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? 'บันทึกรูปไม่สำเร็จ');
          onSaved(result.data);
          setFile(null);
          setSuccess(true);
          setMessage('บันทึกรูปศิลปินแล้ว');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'บันทึกรูปไม่สำเร็จ');
        } finally {
          setSaving(false);
        }
      }}
      sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#f4f6f2' }}
    >
      <Avatar
        variant="rounded"
        src={artist.image?.url}
        alt={artist.name}
        sx={{ width: 120, height: 120, mb: 1.5, fontSize: 36 }}
      >
        {artist.name.slice(0, 1)}
      </Avatar>
      {artist.image && (
        <Typography sx={{ fontSize: 12, mb: 1 }}>
          ภาพ: {artist.image.credit}{' '}
          {artist.image.sourceUrl && (
            <a href={artist.image.sourceUrl} target="_blank" rel="noopener noreferrer">
              แหล่งที่มา
            </a>
          )}
        </Typography>
      )}
      <Typography sx={{ fontWeight: 600, mb: 1 }}>รูปศิลปิน</Typography>
      <Button component="label" variant="outlined" size="small" disabled={saving}>
        เลือกรูปภาพ
        <input
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            if (!picked) return;
            if (
              picked.size > 2 * 1024 * 1024 ||
              !['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)
            ) {
              setSuccess(false);
              setMessage('รองรับ JPG, PNG หรือ WebP ไม่เกิน 2 MB');
              return;
            }
            setFile(picked);
            setMessage('');
          }}
        />
      </Button>
      <Typography sx={{ fontSize: 12, mt: 1, color: 'text.secondary' }}>
        {file?.name ?? 'JPG, PNG หรือ WebP ไม่เกิน 2 MB'}
      </Typography>
      <TextField
        required
        fullWidth
        size="small"
        label="เครดิตภาพ / เจ้าของภาพ"
        value={credit}
        onChange={(event) => setCredit(event.target.value)}
        sx={{ mt: 2 }}
      />
      <TextField
        fullWidth
        size="small"
        type="url"
        label="ลิงก์แหล่งภาพ (ถ้ามี)"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        helperText="ใช้ลิงก์ https://"
        sx={{ mt: 2 }}
      />
      {message && (
        <Alert severity={success ? 'success' : 'error'} sx={{ mt: 1.5 }}>
          {message}
        </Alert>
      )}
      <Button
        type="submit"
        variant="contained"
        size="small"
        disabled={!file || !credit.trim() || saving}
        sx={{ mt: 1.5 }}
      >
        {saving ? 'กำลังบันทึก…' : 'บันทึกรูปภาพ'}
      </Button>
    </Box>
  );
}

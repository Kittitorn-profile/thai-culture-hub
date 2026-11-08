'use client';

import type { PublicDataGroup } from 'src/lib/public-cultural-data';
import type { ProvinceDataItem, ProvinceDataResult } from 'src/server/province-cultural-data';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiCloseLine, RiArrowLeftSLine } from '@remixicon/react';

import {
  Box,
  Chip,
  Link,
  Stack,
  Alert,
  Button,
  Dialog,
  Skeleton,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  Autocomplete,
  DialogContent,
  DialogActions,
} from '@mui/material';

import provinces from 'src/data/thailand-culture/provinces';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';

import {
  HOME_SECTION_PX,
  HOME_SECTION_MAX_WIDTH,
} from 'src/sections/home/components/home-constants';

import { CulturalDataCardImage } from './cultural-data-card-image';

const number = new Intl.NumberFormat('th-TH');
const safeUrl = (value?: string) => (value && /^https?:\/\//i.test(value) ? value : undefined);

export function CulturalDataView({ group }: { group: PublicDataGroup }) {
  const definition = PUBLIC_DATA_GROUPS.find((item) => item.key === group)!;
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const province = params.get('province') ?? '';
  const [selected, setSelected] = useState<ProvinceDataItem | null>(null);
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery<ProvinceDataResult>({
      queryKey: ['public-data-group', group, query, province],
      initialPageParam: 0,
      queryFn: async ({ pageParam, signal }) => {
        const search = new URLSearchParams({ group, q: query, province, page: String(pageParam) });
        const response = await fetch(`/api/culture/data-groups/?${search}`, { signal });
        if (!response.ok) throw new Error('ยังโหลดชุดข้อมูลนี้ไม่ได้ กรุณาลองอีกครั้ง');
        return response.json();
      },
      getNextPageParam: (lastPage) =>
        (lastPage.page + 1) * lastPage.pageSize < (lastPage.total ?? 0)
          ? lastPage.page + 1
          : undefined,
      staleTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1,
    });
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total;
  return (
    <Box component="main" sx={{ px: HOME_SECTION_PX, py: { xs: 3, md: 5 } }}>
      <Box sx={{ maxWidth: HOME_SECTION_MAX_WIDTH, mx: 'auto' }}>
        <Link
          href="/cultural-data/"
          color="text.secondary"
          underline="hover"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 3, fontSize: 14 }}
        >
          <RiArrowLeftSLine size={18} /> ชุดข้อมูลทั้งหมด
        </Link>
        <Typography variant="overline" sx={{ display: 'block', color: '#617367' }}>
          ฐานข้อมูลวัฒนธรรม
        </Typography>
        <Typography component="h1" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 700, mt: 0.5 }}>
          {definition.label}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 800 }}>
          {definition.description}
        </Typography>
        <Box
          component="nav"
          aria-label="กลุ่มข้อมูลวัฒนธรรม"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 3 }}
        >
          {PUBLIC_DATA_GROUPS.map((item) => (
            <Chip
              key={item.key}
              component="a"
              href={item.href}
              clickable
              label={item.label}
              aria-current={item.key === group ? 'page' : undefined}
              sx={{
                bgcolor: item.key === group ? '#2c4036' : '#eceee9',
                color: item.key === group ? '#fff' : 'text.primary',
                fontWeight: item.key === group ? 600 : 400,
                '&:hover': { bgcolor: item.key === group ? '#3b5547' : '#e1e5dc' },
              }}
            />
          ))}
        </Box>
        <DataFilters
          key={`${group}:${query}:${province}`}
          query={query}
          province={province}
          onSearch={(q, code) => {
            const search = new URLSearchParams();
            if (q.trim()) search.set('q', q.trim());
            if (code) search.set('province', code);
            router.push(`${definition.href}${search.size ? `?${search}` : ''}`, { scroll: false });
          }}
        />
        <Typography role="status" variant="body2" color="text.secondary" sx={{ my: 2.5 }}>
          {isPending
            ? 'กำลังโหลดข้อมูล…'
            : total !== undefined && total !== null
              ? `แสดง ${number.format(items.length)} จาก ${number.format(total)} รายการ${province ? ` · ${provinces.find((p) => p.code === province)?.name ?? ''}` : ' · ทุกจังหวัด'}`
              : 'ยังอ่านจำนวนไม่ได้'}
        </Typography>
        {group === 'artists' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            เมื่อเลือกจังหวัด จะแสดงเฉพาะศิลปินที่มีหลักฐานความเกี่ยวข้องกับจังหวัดนั้น
          </Typography>
        )}
        {error && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={<Button onClick={() => refetch()}>ลองอีกครั้ง</Button>}
          >
            {error.message}
          </Alert>
        )}
        {!isPending && !error && items.length === 0 && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography fontWeight={600}>ไม่พบข้อมูลที่ตรงกับตัวกรอง</Typography>
            <Button sx={{ mt: 1 }} onClick={() => router.push(definition.href, { scroll: false })}>
              ดูข้อมูลทั้งหมด
            </Button>
          </Box>
        )}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {isPending &&
            Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={250} />
            ))}
          {items.map((item) => (
            <Box component="article" key={item.id} sx={{ minWidth: 0 }}>
              <CulturalDataCardImage
                src={safeUrl(item.imageUrl)}
                title={item.title}
                label={definition.label}
                subtitle={item.subtitle}
                description={item.description}
                location={
                  item.details.find((detail) =>
                    /พื้นที่\/ชุมชน|จังหวัดที่มีหลักฐาน|^จังหวัด$|^พื้นที่$/.test(detail.label)
                  )?.value
                }
                onClick={() => setSelected(item)}
              />
            </Box>
          ))}
        </Box>
        {hasNextPage && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'กำลังโหลด…' : 'ดูเพิ่ม 12 รายการ'}
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
          ข้อมูลอ้างอิงตามต้นทาง บางรายการอาจไม่มีภาพหรือพิกัดที่ยืนยันได้
        </Typography>
      </Box>
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ pr: 7 }}>
          {selected?.title}
          <IconButton
            aria-label="ปิดรายละเอียด"
            onClick={() => setSelected(null)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <RiCloseLine size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {safeUrl(selected?.imageUrl) && (
            <Box
              component="img"
              src={safeUrl(selected?.imageUrl)}
              alt={selected?.title ?? ''}
              sx={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 2, mb: 2 }}
            />
          )}

          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {selected?.subtitle}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', mb: 3 }}>
            {selected?.description}
          </Typography>
          {selected?.details.map((detail) => (
            <Box key={detail.label} sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {detail.label}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                {detail.value}
              </Typography>
            </Box>
          ))}
          {selected?.imageCredit && (
            <Typography variant="caption">ภาพ: {selected.imageCredit}</Typography>
          )}
          <Stack spacing={1} sx={{ mt: 2 }}>
            {[...new Set([selected?.sourceUrl, ...(selected?.sourceUrls ?? [])])]
              .filter((url): url is string => Boolean(safeUrl(url)))
              .map((url, index) => (
                <Link
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                >
                  แหล่งอ้างอิง {index + 1} ↗
                </Link>
              ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {safeUrl(selected?.mapUrl) && (
            <Button
              component="a"
              href={safeUrl(selected?.mapUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              ดูบนแผนที่ ↗
            </Button>
          )}
          <Button onClick={() => setSelected(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DataFilters({
  query,
  province,
  onSearch,
}: {
  query: string;
  province: string;
  onSearch: (q: string, province: string) => void;
}) {
  const [text, setText] = useState(query);
  const [code, setCode] = useState(province);
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text, code);
      }}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        p: 2,
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
      }}
    >
      <TextField
        label="ค้นหาในกลุ่มนี้"
        placeholder="ชื่อหรือคำที่สนใจ"
        value={text}
        onChange={(event) => setText(event.target.value)}
        size="small"
        sx={{ flex: 1 }}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <Autocomplete
        options={provinces}
        value={provinces.find((p) => p.code === code) ?? null}
        onChange={(_, value) => setCode(value?.code ?? '')}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        noOptionsText="ไม่พบจังหวัด"
        renderInput={(input) => (
          <TextField {...input} label="จังหวัด" placeholder="ทุกจังหวัด" size="small" />
        )}
        sx={{ width: { xs: '100%', md: 280 } }}
      />
      <Button type="submit" variant="contained" sx={{ bgcolor: '#2c4036', px: 3 }}>
        ค้นหา
      </Button>
      {(query || province) && (
        <Button
          onClick={() => {
            setText('');
            setCode('');
            onSearch('', '');
          }}
        >
          ล้างตัวกรอง
        </Button>
      )}
    </Box>
  );
}

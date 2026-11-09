'use client';

import type { PublicDataGroup } from 'src/lib/public-cultural-data';
import type { ProvinceDataItem, ProvinceDataResult } from 'src/server/province-cultural-data';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiCloseLine, RiArrowLeftSLine } from '@remixicon/react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import {
  Box,
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
import { useDatasetVisibility } from 'src/lib/use-dataset-visibility';
import {
  CRAFT_CATEGORIES,
  PUBLIC_DATA_GROUPS,
  normalizeCraftCategory,
} from 'src/lib/public-cultural-data';

import { CraftImageGallery } from 'src/components/craft-images/craft-image-gallery';

import {
  HOME_SECTION_PX,
  HOME_SECTION_MAX_WIDTH,
} from 'src/sections/home/components/home-constants';

import { CulturalDataCardImage } from './cultural-data-card-image';

const number = new Intl.NumberFormat('th-TH');
const safeUrl = (value?: string) => (value && /^https?:\/\//i.test(value) ? value : undefined);

export function CulturalDataView({ group }: { group: PublicDataGroup }) {
  const { isVisible, data: datasetVisibility } = useDatasetVisibility();
  const visibilityKey = datasetVisibility?.hidden.join(',') ?? 'loading';
  const definition = PUBLIC_DATA_GROUPS.find((item) => item.key === group)!;
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const province = params.get('province') ?? '';
  const category = group === 'crafts' ? normalizeCraftCategory(params.get('category') ?? '') : '';
  const [selected, setSelected] = useState<ProvinceDataItem | null>(null);
  const categoryCounts = useQuery<{ counts: Record<string, number | null> }>({
    queryKey: ['craft-category-counts', 2, query, province, visibilityKey],
    enabled: group === 'crafts',
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams({
        group: 'crafts',
        countsOnly: 'true',
        v: '2',
        q: query,
        province,
      });
      const response = await fetch(`/api/culture/data-groups/?${search}`, { signal });
      if (!response.ok) throw new Error('โหลดจำนวนไม่ได้');
      return response.json();
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery<ProvinceDataResult>({
      queryKey: ['public-data-group', 2, group, query, province, category, visibilityKey],
      initialPageParam: 0,
      queryFn: async ({ pageParam, signal }) => {
        const search = new URLSearchParams({
          group,
          v: '2',
          category,
          q: query,
          province,
          page: String(pageParam),
        });
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
  const subtitleOf = (item: ProvinceDataItem) =>
    group === 'crafts' && item.craftCategory
      ? (CRAFT_CATEGORIES.find((craft) => craft.key === item.craftCategory)?.label ?? item.subtitle)
      : item.subtitle;
  if (!isVisible(group)) return null;

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
          sx={{
            display: 'flex',
            gap: { xs: 2.5, md: 3.5 },
            mt: 3.5,
            mb: group === 'crafts' ? 2.5 : 3,
            borderBottom: '1px solid #dde3dc',
            overflowX: 'auto',
          }}
        >
          {PUBLIC_DATA_GROUPS.filter((item) => isVisible(item.key)).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              underline="none"
              aria-current={item.key === group ? 'page' : undefined}
              sx={{
                flexShrink: 0,
                position: 'relative',
                py: 1.75,
                px: 0.25,
                minHeight: 48,
                color: item.key === group ? '#2c4036' : '#67716a',
                fontSize: 14,
                fontWeight: item.key === group ? 700 : 500,
                transition: 'color 150ms',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  bgcolor: item.key === group ? '#2c4036' : 'transparent',
                },
                '&:hover': { color: '#2c4036', bgcolor: '#f0f3ed' },
                '&:focus-visible': { outline: '2px solid #608d8c', outlineOffset: -2 },
              }}
            >
              {item.label}
            </Link>
          ))}
        </Box>
        {group === 'crafts' && (
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 3,
              bgcolor: '#f0f3ed',
              border: '1px solid #e1e7dc',
              borderRadius: 2.5,
            }}
          >
            <Typography
              component="h2"
              sx={{ fontSize: 13, fontWeight: 600, color: '#52675c', mb: 1.5 }}
            >
              เลือกสิ่งที่อยากเรียนรู้
            </Typography>
            <Box
              component="nav"
              aria-label="หมวดย่อยผ้าและหัตถกรรม"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
              {[{ key: '', label: 'ทั้งหมด' }, ...CRAFT_CATEGORIES].map((item) => {
                const search = new URLSearchParams();
                if (item.key) search.set('category', item.key);
                if (query) search.set('q', query);
                if (province) search.set('province', province);
                const active = category === item.key;
                return (
                  <Button
                    key={item.key}
                    component="a"
                    href={`${definition.href}${search.size ? `?${search}` : ''}`}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      minHeight: 44,
                      px: 2,
                      borderRadius: 99,
                      border: '1px solid',
                      borderColor: active ? '#2c4036' : '#d8dfd3',
                      bgcolor: active ? '#2c4036' : '#fff',
                      color: active ? '#fff' : '#46554b',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      '&:hover': {
                        bgcolor: active ? '#3b5547' : '#e6ecdf',
                        borderColor: '#7d9382',
                      },
                      '&:focus-visible': { outline: '2px solid #608d8c', outlineOffset: 2 },
                    }}
                  >
                    {item.label}
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 0.75,
                        minWidth: 24,
                        borderRadius: 99,
                        bgcolor: active ? 'rgba(255,255,255,.16)' : '#edf1e9',
                        fontSize: 12,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {categoryCounts.data?.counts[item.key || 'all'] == null
                        ? '—'
                        : number.format(categoryCounts.data.counts[item.key || 'all']!)}
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}
        <DataFilters
          key={`${group}:${query}:${province}`}
          query={query}
          province={province}
          onSearch={(q, code) => {
            const search = new URLSearchParams();
            if (category) search.set('category', category);
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
                subtitle={subtitleOf(item)}
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
        aria-labelledby="cultural-detail-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              m: { xs: 1.5, sm: 3 },
              width: '100%',
              maxHeight: 'calc(100dvh - 32px)',
            },
          },
        }}
      >
        <DialogTitle
          id="cultural-detail-title"
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            pr: 7,
            fontSize: { xs: 18, sm: 20 },
            lineHeight: 1.4,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {selected?.title}
          <IconButton
            aria-label="ปิดรายละเอียด"
            onClick={() => setSelected(null)}
            sx={{
              position: 'absolute',
              right: 10,
              top: 8,
              width: 40,
              height: 40,
              bgcolor: '#f0f3ed',
              color: '#2c4036',
              '&:hover': { bgcolor: '#e1e7dc' },
            }}
          >
            <RiCloseLine size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2, '&.MuiDialogContent-root': { pt: 2 } }}>
          {!!selected?.images?.length && (
            <Box sx={{ mb: 2 }}>
              <CraftImageGallery images={selected.images} />
            </Box>
          )}
          {!selected?.images?.length && safeUrl(selected?.imageUrl) && (
            <Box component="figure" sx={{ m: 0, mb: 2 }}>
              <Box sx={{ bgcolor: '#f0f3ed', borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={safeUrl(selected?.imageUrl)}
                  alt={selected?.title ?? ''}
                  sx={{
                    display: 'block',
                    width: '100%',
                    maxHeight: { xs: 200, sm: 240 },
                    objectFit: 'contain',
                  }}
                />
              </Box>
              {selected?.imageCredit && (
                <Typography
                  component="figcaption"
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  ภาพ: {selected.imageCredit}
                </Typography>
              )}
            </Box>
          )}
          {selected?.subtitle && selected.subtitle !== 'ไม่ระบุ' && (
            <Typography sx={{ color: '#52675c', fontSize: 13, fontWeight: 600, mb: 1.25 }}>
              {subtitleOf(selected)}
            </Typography>
          )}
          {selected?.description && (
            <Box sx={{ mb: 2 }}>
              <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                รายละเอียด
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: '#46504a',
                  whiteSpace: 'pre-line',
                  overflowWrap: 'anywhere',
                }}
              >
                {selected.description}
              </Typography>
            </Box>
          )}
          {!!selected?.details.length && (
            <Box
              component="dl"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: '#f6f7f4',
                borderRadius: 1.5,
                display: 'grid',
                gap: 1.25,
              }}
            >
              {selected.details.map((detail) => (
                <Box
                  key={detail.label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '96px minmax(0, 1fr)', sm: '120px minmax(0, 1fr)' },
                    gap: 0.5,
                  }}
                >
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {detail.label}
                  </Typography>
                  <Typography
                    component="dd"
                    variant="body2"
                    sx={{
                      m: 0,
                      lineHeight: 1.75,
                      whiteSpace: 'pre-line',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {detail.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1.5} sx={{ mt: 1.5 }}>
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
        {selected && (
          <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            {selected && (
              <Button
                component="a"
                variant="contained"
                href={`/creator/contributions/edit/?recordId=${encodeURIComponent(group === 'crafts' ? selected.id : `${group}:${selected.id}`)}`}
              >
                เสนอแก้ไข / เพิ่มเติมข้อมูล
              </Button>
            )}
            {safeUrl(selected?.mapUrl) && (
              <Button
                component="a"
                href={safeUrl(selected?.mapUrl)}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                sx={{ color: '#2c4036', borderColor: '#b8c7b8' }}
              >
                ดูบนแผนที่ ↗
              </Button>
            )}
          </DialogActions>
        )}
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

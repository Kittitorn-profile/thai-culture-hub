'use client';

import type {
  ProvinceDataItem,
  ProvinceDataResult,
  ProvinceDataSection,
} from 'src/server/province-cultural-data';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { RiCloseLine, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { CulturalDataCardImage } from 'src/sections/cultural-data/cultural-data-card-image';

const GROUPS: { key: ProvinceDataSection; label: string; description: string }[] = [
  {
    key: 'artists',
    label: 'ศิลปินและผู้สร้างสรรค์',
    description:
      'รายชื่อที่มีหลักฐานความเกี่ยวข้องกับจังหวัด แยกจังหวัดเกิด ภูมิลำเนา พื้นที่ทำงาน และแหล่งเรียนรู้',
  },
  {
    key: 'heritage',
    label: 'มรดกภูมิปัญญาทางวัฒนธรรม',
    description: 'ข้อมูลจากกรมส่งเสริมวัฒนธรรม ทั้งการแสดง งานฝีมือ ประเพณี ภาษา และภูมิปัญญา',
  },
  {
    key: 'crafts',
    label: 'ผ้าและทักษะงานช่าง',
    description: 'ชนิดผ้า วิธีทอ ย้อมสี จักสาน และการสืบทอดงานฝีมือ พร้อมแหล่งอ้างอิง',
  },
  {
    key: 'ethnic',
    label: 'กลุ่มชาติพันธุ์และชุมชน',
    description:
      'รายการชุมชนตามจังหวัดที่ต้นทางระบุ พิกัดเป็นจุดอ้างอิง ไม่ใช่ขอบเขตพื้นที่ทั้งหมดของกลุ่มชาติพันธุ์',
  },
  {
    key: 'cpot',
    label: 'ผลิตภัณฑ์วัฒนธรรมไทย (CPOT)',
    description:
      'ข้อมูลผลิตภัณฑ์จากตารางต้นฉบับที่ระบุจังหวัดนี้ แม้ยังไม่มีพิกัดสำหรับแสดงบนแผนที่',
  },
  {
    key: 'groups',
    label: 'วงดนตรีและคณะการแสดง',
    description: 'วงและคณะที่เผยแพร่แล้วและระบุจังหวัดนี้ในข้อมูลของระบบ',
  },
  {
    key: 'events',
    label: 'กิจกรรมวัฒนธรรม',
    description:
      'กิจกรรมที่เปิดเผยแพร่และระบุจังหวัดนี้ รวมทั้งกิจกรรมที่ผ่านมา โปรดตรวจวันจัดงานในรายละเอียด',
  },
];
export function ProvinceCulturalSections({
  provinceCode,
  provinceName,
}: {
  provinceCode: string;
  provinceName: string;
}) {
  return (
    <Box id="province-all-data" sx={{ mt: { xs: 5, md: 7 }, scrollMarginTop: 100 }}>
      <Typography component="h2" variant="h4" sx={{ mb: 1 }}>
        สำรวจข้อมูลวัฒนธรรม{provinceName}
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 2 }}>
        รวมข้อมูลทุกชุดที่มีหลักฐานระบุจังหวัดนี้ แผนที่ด้านบนแสดงข้อมูลสถานที่
        ส่วนข้อมูลบุคคลและภูมิปัญญาอยู่ในหมวดด้านล่าง
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
        <Button
          component="a"
          href="#province-all-places"
          variant="outlined"
          size="small"
          sx={{ borderRadius: 99 }}
        >
          สถานที่และเรื่องวัฒนธรรม
        </Button>
        {GROUPS.map((group) => (
          <ProvinceDataGroupLink
            key={`${provinceCode}:${group.key}`}
            provinceCode={provinceCode}
            group={group}
          />
        ))}
      </Box>
      {GROUPS.map((group) => (
        <ProvinceDataGroup
          key={`${provinceCode}:${group.key}`}
          provinceCode={provinceCode}
          provinceName={provinceName}
          section={group.key}
          label={group.label}
          description={group.description}
        />
      ))}
    </Box>
  );
}
function useProvinceDataQuery(provinceCode: string, section: ProvinceDataSection) {
  return useInfiniteQuery({
    queryKey: ['public-province-data', provinceCode, section],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<ProvinceDataResult> => {
      const params = new URLSearchParams({
        provinceCode,
        section,
        page: String(pageParam),
        pageSize: '9',
      });
      const response = await fetch(`/api/culture/province-data?${params}`, { signal });
      if (!response.ok) throw new Error('ยังโหลดข้อมูลหมวดนี้ไม่ได้');
      const body = await response.json();
      const result = body.sections?.[0];
      if (!result || result.error) throw new Error(result?.error ?? 'รูปแบบข้อมูลไม่ถูกต้อง');
      return result;
    },
    getNextPageParam: (last) =>
      last.total !== null && (last.page + 1) * last.pageSize < last.total
        ? last.page + 1
        : undefined,
    staleTime: 60_000,
    retry: 1,
  });
}

function ProvinceDataGroupLink({
  provinceCode,
  group,
}: {
  provinceCode: string;
  group: (typeof GROUPS)[number];
}) {
  const query = useProvinceDataQuery(provinceCode, group.key);
  if (!query.data?.pages.some((page) => page.data.length > 0)) return null;

  return (
    <Button
      component="a"
      href={`#province-${group.key}`}
      variant="outlined"
      size="small"
      sx={{ borderRadius: 99 }}
    >
      {group.label}
    </Button>
  );
}

function ProvinceDataGroup({
  provinceCode,
  provinceName,
  section,
  label,
  description,
}: {
  provinceCode: string;
  provinceName: string;
  section: ProvinceDataSection;
  label: string;
  description: string;
}) {
  const [selected, setSelected] = useState<ProvinceDataItem | null>(null);
  const query = useProvinceDataQuery(provinceCode, section);
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.total;
  if (query.isSuccess && items.length === 0) return null;

  return (
    <Box component="section" id={`province-${section}`} sx={{ mb: 5, scrollMarginTop: 100 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'baseline',
          mb: 1,
        }}
      >
        <Typography component="h3" variant="h5">
          {label}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
          {typeof total === 'number'
            ? `${total.toLocaleString('th-TH')} ${section === 'artists' ? 'ศิลปิน' : 'รายการ'}`
            : '—'}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        {section === 'artists'
          ? 'ศิลปินที่มีประวัติหรือผลงานเกี่ยวข้องกับจังหวัด พร้อมแหล่งอ้างอิง'
          : description}
      </Typography>
      {query.isPending && (
        <Typography sx={{ py: 2, color: 'text.secondary' }}>กำลังโหลดข้อมูล…</Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {items.map((item, index) => (
          <CulturalDataCardImage
            key={`${item.id}:${index}`}
            src={item.imageUrl}
            title={item.title}
            label={label}
            subtitle={
              item.details.find((detail) => detail.label === 'ประเภท')?.value || item.subtitle
            }
            description={item.description}
            location={provinceName}
            onClick={() => setSelected(item)}
          />
        ))}
      </Box>
      {!!items.length && (section !== 'artists' || query.hasNextPage) && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            แสดง {items.length.toLocaleString('th-TH')} จาก {total?.toLocaleString('th-TH')} รายการ
          </Typography>
          {query.hasNextPage && (
            <Button
              variant="outlined"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'กำลังโหลด…' : 'ดูเพิ่ม'}
            </Button>
          )}
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
              p: { xs: 2.5, sm: 3 },
              bgcolor: '#fafbf8',
              borderRadius: 0,
              pb: 'max(32px, env(safe-area-inset-bottom))',
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
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
              <IconButton
                aria-label="ปิดรายละเอียด"
                onClick={() => setSelected(null)}
                sx={{ bgcolor: '#e9ede5', color: '#2c4036' }}
              >
                <RiCloseLine size={20} />
              </IconButton>
            </Box>
            <Box
              sx={{
                bgcolor: '#e9ede5',
                borderRadius: 2.5,
                overflow: 'hidden',
                mb: 3,
                display: 'grid',
                placeItems: 'center',
                minHeight: 200,
              }}
            >
              <Box
                component="img"
                src={selected.imageUrl || '/logo/logo-full.svg'}
                alt={selected.imageUrl ? selected.title : 'Thailand Cultural Hub'}
                sx={
                  selected.imageUrl
                    ? { width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }
                    : { width: 160, maxWidth: '60%', py: 6 }
                }
              />
            </Box>
            {selected.imageUrl && selected.imageCredit && (
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: -2, mb: 2 }}>
                ภาพ: {selected.imageCredit}
              </Typography>
            )}
            <Typography
              component="h2"
              variant="h5"
              sx={{ color: '#2c4036', lineHeight: 1.5, overflowWrap: 'anywhere' }}
            >
              {selected.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#608d8c', mt: 1 }}>
              {selected.subtitle}
            </Typography>
            {selected.description && (
              <Typography sx={{ mt: 2, fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                {selected.description}
              </Typography>
            )}
            <Box
              component="dl"
              sx={{
                m: 0,
                mt: 3,
                p: 2.5,
                bgcolor: '#fff',
                border: '1px solid #e1e5dc',
                borderRadius: 2.5,
                display: 'grid',
                gap: 2,
              }}
            >
              {selected.details
                .filter((detail) => detail.value)
                .map((detail) => (
                  <Box key={detail.label}>
                    <Typography
                      component="dt"
                      sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}
                    >
                      {detail.label}
                    </Typography>
                    <Typography
                      component="dd"
                      sx={{
                        m: 0,
                        fontSize: 14,
                        lineHeight: 1.7,
                        whiteSpace: 'pre-line',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {detail.value}
                    </Typography>
                  </Box>
                ))}
            </Box>
            {selected.mapUrl && (
              <Button
                component="a"
                href={selected.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                sx={{ mt: 3 }}
              >
                ดูตำแหน่งตามต้นทาง
              </Button>
            )}
            {selected.detailUrl && (
              <Button component="a" href={selected.detailUrl} variant="contained" sx={{ mt: 3 }}>
                ดูหน้ารายละเอียดทั้งหมด
              </Button>
            )}
            <Box
              sx={{
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid #e1e5dc',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                แหล่งข้อมูลและอ้างอิง
              </Typography>
              {selected.sourceUrls?.map((url) => (
                <Button
                  component="a"
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<RiArrowRightUpLine size={16} />}
                  sx={{
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    p: 1.5,
                    bgcolor: '#e9ede5',
                    borderRadius: 1.5,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {new URL(url).hostname}
                </Button>
              ))}
              {selected.sourceUrl && !selected.sourceUrls?.length && (
                <Button
                  component="a"
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<RiArrowRightUpLine size={16} />}
                  sx={{
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: '#e9ede5',
                    borderRadius: 1.5,
                  }}
                >
                  แหล่งอ้างอิง
                </Button>
              )}
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}

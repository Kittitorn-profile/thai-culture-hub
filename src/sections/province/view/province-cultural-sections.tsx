'use client';

import type {
  ProvinceDataItem,
  ProvinceDataResult,
  ProvinceDataSection,
} from 'src/server/province-cultural-data';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { RiCloseLine, RiArrowRightLine, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

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
    key: 'community',
    label: 'วิถีชีวิตและหัตถกรรมชุมชน',
    description:
      'ชุดรวบรวมเพิ่มเรื่องผ้าทอ เสื่อ จักสาน ความเชื่อ อาชีพ และศิลปาชีพ พร้อมแหล่งอ้างอิง',
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
    key: 'fabric',
    label: 'มรดกภูมิปัญญาผ้าไทย',
    description: 'ชื่อผ้า วัสดุ ลวดลาย และเทคนิคจากชุดข้อมูลผ้าไทย ไม่จำเป็นต้องมีพิกัดสถานที่',
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
          <Button
            component="a"
            key={group.key}
            href={`#province-${group.key}`}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 99 }}
          >
            {group.label}
          </Button>
        ))}
      </Box>
      {GROUPS.map((group) => (
        <ProvinceDataGroup
          key={`${provinceCode}:${group.key}`}
          provinceCode={provinceCode}
          section={group.key}
          label={group.label}
          description={group.description}
        />
      ))}
    </Box>
  );
}
function ProvinceDataGroup({
  provinceCode,
  section,
  label,
  description,
}: {
  provinceCode: string;
  section: ProvinceDataSection;
  label: string;
  description: string;
}) {
  const [selected, setSelected] = useState<ProvinceDataItem | null>(null);
  const query = useInfiniteQuery({
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
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.total;
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
      {query.isError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              onClick={() => (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
            >
              ลองอีกครั้ง
            </Button>
          }
        >
          {query.error.message}
        </Alert>
      )}
      {total === 0 && (
        <Typography
          sx={{ p: 2, borderRadius: 2, bgcolor: '#eef1eb', color: 'text.secondary', fontSize: 14 }}
        >
          ยังไม่มีรายการในชุดนี้ที่ยืนยันว่าเกี่ยวข้องกับจังหวัดนี้
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: section === 'artists' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {items.map((item, index) =>
          section === 'artists' ? (
            <ProvinceArtistCard
              key={`${item.id}:${index}`}
              item={item}
              onSelect={() => setSelected(item)}
            />
          ) : (
            <Box
              key={`${item.id}:${index}`}
              sx={{
                p: 2.5,
                bgcolor: 'background.paper',
                border: '1px solid #e1e5dc',
                borderRadius: 2.5,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              {item.imageUrl && (
                <Box
                  component="img"
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 2, mb: 1.5 }}
                />
              )}
              <Typography component="h4" sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>
                {item.title}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#608d8c', mb: 1 }}>
                {item.subtitle}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 2,
                }}
              >
                {item.description || 'ดูรายละเอียดและแหล่งอ้างอิงเพิ่มเติม'}
              </Typography>
              <Button
                size="small"
                onClick={() => setSelected(item)}
                endIcon={<RiArrowRightUpLine size={16} />}
                sx={{ mt: 'auto', alignSelf: 'start' }}
              >
                ดูรายละเอียด
              </Button>
            </Box>
          )
        )}
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
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
              <IconButton aria-label="ปิดรายละเอียด" onClick={() => setSelected(null)}>
                <RiCloseLine size={20} />
              </IconButton>
            </Box>
            <Typography component="h2" variant="h5">
              {selected.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#608d8c', mt: 1 }}>
              {selected.subtitle}
            </Typography>
            {selected.imageUrl && (
              <>
                <Box
                  component="img"
                  src={selected.imageUrl}
                  alt={selected.title}
                  sx={{ width: 1, maxHeight: 320, objectFit: 'contain', borderRadius: 2, mt: 2 }}
                />
                {selected.imageCredit && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                    ภาพ: {selected.imageCredit}
                  </Typography>
                )}
              </>
            )}
            {selected.description && (
              <Typography sx={{ mt: 3, fontSize: 14, whiteSpace: 'pre-line' }}>
                {selected.description}
              </Typography>
            )}
            {selected.details.map((detail) => (
              <Box key={detail.label} sx={{ mt: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  {detail.label}
                </Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-line' }}>
                  {detail.value}
                </Typography>
              </Box>
            ))}
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
            {selected.sourceUrls?.map((url) => (
              <Button
                component="a"
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 1 }}
              >
                แหล่งข้อมูล · {new URL(url).hostname}
              </Button>
            ))}
            {selected.sourceUrl && !selected.sourceUrls?.length && (
              <Button
                component="a"
                href={selected.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<RiArrowRightUpLine size={16} />}
                sx={{ mt: 2 }}
              >
                แหล่งอ้างอิง
              </Button>
            )}
          </>
        )}
      </Drawer>
    </Box>
  );
}

function ProvinceArtistCard({ item, onSelect }: { item: ProvinceDataItem; onSelect: () => void }) {
  const relationship = item.details.find(
    (detail) => detail.label === 'ความเกี่ยวข้องกับจังหวัด'
  )?.value;
  const type = item.details.find((detail) => detail.label === 'ประเภท')?.value;
  return (
    <ButtonBase
      component="button"
      type="button"
      onClick={onSelect}
      aria-label={`ดูข้อมูล ${item.title}`}
      sx={{
        width: 1,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid #e1e5dc',
        display: 'grid',
        gridTemplateColumns: '56px minmax(0, 1fr) 28px',
        alignItems: 'center',
        gap: 2,
        textAlign: 'left',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': { borderColor: '#8caa9b', bgcolor: '#fafbf8' },
        '&.Mui-focusVisible': { outline: '2px solid #608d8c', outlineOffset: 3 },
      }}
    >
      <Avatar
        src={item.imageUrl}
        alt=""
        slotProps={{ img: { loading: 'lazy' } }}
        sx={{
          width: 56,
          height: 56,
          bgcolor: '#edf0e7',
          color: '#3d594a',
          fontWeight: 700,
          fontSize: 24,
        }}
      >
        {item.title.slice(0, 1)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        {type && (
          <Typography
            component="span"
            sx={{ display: 'block', fontSize: 11, color: 'text.secondary', mb: 0.5 }}
          >
            {type}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontWeight: 700,
            fontSize: { xs: 17, md: 19 },
            lineHeight: 1.5,
          }}
        >
          {item.title}
        </Typography>
        {item.subtitle && (
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontSize: 12,
              color: 'text.secondary',
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.subtitle}
          </Typography>
        )}
        {relationship && (
          <Typography
            component="span"
            sx={{
              display: 'inline-block',
              fontSize: 11,
              color: '#4e6e5b',
              mt: 1,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: '#eef3ec',
            }}
          >
            {relationship}
          </Typography>
        )}
      </Box>
      <Box
        component="span"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          color: '#526b5d',
          bgcolor: '#f2f4ef',
        }}
      >
        <RiArrowRightLine size={16} />
      </Box>
    </ButtonBase>
  );
}

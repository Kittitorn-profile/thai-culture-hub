'use client';

import type { CultureMetric } from '../province-data';

import { RiListCheck, RiMapPinLine, RiSearchLine, RiEqualizerLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

type ProvinceDetailHeaderProps = {
  provinceDisplayName: string;
  cultureMetrics: CultureMetric[];
  filteredCount: number;
  totalCount: number;
  dataSourceLabel: string;
  isRemoteLoading: boolean;
  activeFilterCount: number;
  searchQuery: string;
  onFilterOpen: () => void;
  onPlacesOpen: () => void;
  onSearchQueryChange: (value: string) => void;
};

export function ProvinceCultureMetrics({ cultureMetrics }: { cultureMetrics: CultureMetric[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${Math.max(1, cultureMetrics.length)}, minmax(0, 1fr))`,
          lg: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {cultureMetrics.map((item) => (
        <Box
          key={item.label}
          sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e5de', minWidth: 0 }}
        >
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
            {item.label}
          </Typography>
          <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: '#293c34' }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
export function ProvinceDetailHeader({
  provinceDisplayName,
  cultureMetrics,
  filteredCount,
  totalCount,
  dataSourceLabel,
  isRemoteLoading,
  activeFilterCount,
  searchQuery,
  onFilterOpen,
  onPlacesOpen,
  onSearchQueryChange,
}: ProvinceDetailHeaderProps) {
  return (
    <Box component="header">
      <Stack
        direction={{ xs: 'column', md: 'row', lg: 'column' }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ md: 'center', lg: 'flex-start' }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ color: '#79613b', mb: 1 }}
          >
            <RiMapPinLine size={16} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
              สำรวจวัฒนธรรมประจำจังหวัด
            </Typography>
          </Stack>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 32, md: 42, lg: 34 },
              fontWeight: 600,
              lineHeight: 1.4,
              color: '#202124',
            }}
          >
            {provinceDisplayName}
          </Typography>
          <Typography
            sx={{ mt: 0.75, fontSize: 14, lineHeight: 1.8, color: 'text.secondary', maxWidth: 640 }}
          >
            ค้นพบสถานที่ ประเพณี อาหาร และภูมิปัญญาท้องถิ่น ผ่านแผนที่และข้อมูลของจังหวัด
          </Typography>
        </Box>
        <Chip
          size="small"
          label={isRemoteLoading ? 'กำลังโหลดข้อมูล…' : dataSourceLabel || 'ข้อมูลวัฒนธรรมไทย'}
          sx={{
            alignSelf: 'flex-start',
            bgcolor: '#edf1e8',
            color: '#47604c',
            maxWidth: 1,
            height: 'auto',
            minHeight: 28,
            '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
          }}
        />
      </Stack>
      <ProvinceCultureMetrics cultureMetrics={cultureMetrics} />
      <Box
        sx={{
          mt: 3,
          p: { xs: 2, md: 2.5, lg: 2 },
          bgcolor: '#fff',
          border: '1px solid #e2e5de',
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="ค้นหาสถานที่หรือเรื่องราว"
            placeholder="ชื่อสถานที่ อำเภอ หรือคำที่สนใจ"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RiSearchLine size={19} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RiEqualizerLine size={18} />}
            onClick={onFilterOpen}
            sx={{
              minHeight: 40,
              minWidth: 120,
              flexShrink: 0,
              color: '#293c34',
              borderColor: '#d7ded2',
            }}
          >
            ตัวกรอง{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
          <Button
            variant="contained"
            startIcon={<RiListCheck size={18} />}
            onClick={onPlacesOpen}
            sx={{
              minHeight: 40,
              minWidth: 140,
              flexShrink: 0,
              bgcolor: '#293c34',
              color: '#fff',
              '&:hover': { bgcolor: '#3c5147' },
            }}
          >
            ดูรายการข้อมูล
          </Button>
        </Stack>
        <Typography sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }} aria-live="polite">
          {isRemoteLoading
            ? 'กำลังโหลดข้อมูลจังหวัด…'
            : `พบ ${filteredCount.toLocaleString('th-TH')} จาก ${totalCount.toLocaleString('th-TH')} รายการ`}{' '}
          · เลือกอำเภอบนแผนที่เพื่อสำรวจพื้นที่
        </Typography>
      </Box>
    </Box>
  );
}

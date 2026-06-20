'use client';

import type { CultureMetric } from '../province-data';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

type ProvinceDetailHeaderProps = {
  provinceDisplayName: string;
  cultureMetrics: CultureMetric[];
  filteredCount: number;
  totalCount: number;
  dataSourceLabel: string;
  isRemoteLoading: boolean;
  activeFilterCount: number;
  onFilterOpen: () => void;
  onPlacesOpen: () => void;
};

type ProvinceCultureMetricsProps = {
  cultureMetrics: CultureMetric[];
};

export function ProvinceCultureMetrics({ cultureMetrics }: ProvinceCultureMetricsProps) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      sx={{
        gap: 1,
        zIndex: 2,
        mt: { xs: 2, lg: 0 },
      }}
    >
      {cultureMetrics.map((item, index) => (
        <Box
          key={item.label}
          sx={{
            px: 2,
            py: 1.5,
            minWidth: 0,
            borderRadius: 2,
            textAlign: 'left',
            color: theme.palette.common.white,
            bgcolor: alpha(theme.palette.common.white, 0.16),
            border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
            boxShadow: `0 18px 40px ${alpha(theme.palette.grey[900], 0.12)}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <Typography
            sx={{
              mb: 0.5,
              fontSize: 12,
              fontWeight: 900,
              color: alpha(theme.palette.common.white, 0.68),
            }}
          >
            {String(index + 1).padStart(2, '0')} / {item.label}
          </Typography>
          <Typography sx={{ fontWeight: 950, fontSize: { xs: 18, sm: 20 } }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Stack>
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
  onFilterOpen,
  onPlacesOpen,
}: ProvinceDetailHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      component="header"
      sx={{
        mx: 'auto',
        p: { xs: 2, sm: 3 },
        width: 1,
        maxWidth: 980,
        overflow: 'visible',
        position: 'relative',
        textAlign: 'center',
        borderRadius: 3,
        color: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
        background: `
          linear-gradient(135deg, ${alpha('#f8f6ee', 0.2)} 0%, ${alpha('#f8f6ee', 0.08)} 42%, ${alpha('#12383f', 0.24)} 100%),
          ${alpha('#203f42', 0.28)}
        `,
        boxShadow: `0 28px 80px ${alpha(theme.palette.grey[900], 0.18)}`,
        backdropFilter: 'blur(14px)',
      }}
    >
      <Stack spacing={2.25} alignItems="center" sx={{ position: 'relative' }}>
        <Chip
          icon={<Iconify icon="custom:location-fill" />}
          label={dataSourceLabel || (isRemoteLoading ? 'กำลังดึงข้อมูล' : 'Thailand Cultural')}
          sx={{
            height: 34,
            px: 0.75,
            fontWeight: 900,
            borderRadius: 99,
            color: '#f8f6ee',
            bgcolor: alpha('#1f3437', 0.34),
            border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
            '& .MuiChip-icon': { color: '#f2d28b' },
          }}
        />
        <Box>
          <Typography
            component="h1"
            variant="h2"
            sx={{
              mx: 'auto',
              fontWeight: 950,
              lineHeight: 0.98,
              maxWidth: 760,
              textShadow: `0 14px 34px ${alpha('#12383f', 0.26)}`,
              fontSize: { xs: 44, sm: 62, md: 74 },
            }}
          >
            {provinceDisplayName}
          </Typography>

          <Typography
            sx={{
              mx: 'auto',
              mt: 1.5,
              maxWidth: 620,
              fontSize: { xs: 15, sm: 17 },
              fontWeight: 800,
              lineHeight: 1.7,
              color: alpha(theme.palette.common.white, 0.88),
            }}
          >
            สำรวจมรดก วัด ธรรมชาติ หัตถกรรม และเรื่องเล่าท้องถิ่นของจังหวัด
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          alignItems="center"
          sx={{ flexWrap: 'wrap', rowGap: 1 }}
        >
          <Chip
            label={`${filteredCount}/${totalCount} สถานที่สำคัญ`}
            sx={{
              height: 38,
              px: 1,
              fontWeight: 'bold',
              borderRadius: 99,
              color: '#11343a',
              bgcolor: '#f8f6ee',
              border: `1px solid ${alpha('#f2d28b', 0.84)}`,
              boxShadow: `0 10px 24px ${alpha(theme.palette.grey[900], 0.14)}`,
            }}
          />
          <Button
            size="medium"
            variant="contained"
            startIcon={<Iconify icon="solar:list-bold" />}
            onClick={onFilterOpen}
            sx={{
              height: 38,
              px: 1.8,
              borderRadius: 99,
              fontWeight: 900,
              color: '#11343a',
              bgcolor: alpha('#f8f6ee', 0.94),
              boxShadow: `0 10px 24px ${alpha(theme.palette.grey[900], 0.14)}`,
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            ตัวกรอง {activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
          <Button
            size="medium"
            variant="contained"
            startIcon={<Iconify icon="custom:location-fill" />}
            onClick={onPlacesOpen}
            sx={{
              height: 38,
              px: 1.8,
              borderRadius: 99,
              fontWeight: 900,
              color: '#fff',
              bgcolor: '#1f7b8e',
              border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
              boxShadow: `0 10px 24px ${alpha('#12383f', 0.22)}`,
              '&:hover': { bgcolor: '#176b7d' },
            }}
          >
            สถานที่และวัฒนธรรม
          </Button>
        </Stack>
        <ProvinceCultureMetrics cultureMetrics={cultureMetrics} />
      </Stack>
    </Box>
  );
}

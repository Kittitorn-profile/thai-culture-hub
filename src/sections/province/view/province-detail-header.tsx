'use client';

import type { CultureMetric } from '../province-data';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
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
  searchQuery: string;
  onFilterOpen: () => void;
  onPlacesOpen: () => void;
  onSearchQueryChange: (value: string) => void;
};

type ProvinceCultureMetricsProps = {
  cultureMetrics: CultureMetric[];
};

export function ProvinceCultureMetrics({ cultureMetrics }: ProvinceCultureMetricsProps) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      justifyContent="center"
      sx={{
        gap: { xs: 1, sm: 1.25 },
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
            minWidth: { xs: 'calc(50% - 8px)', sm: 150, md: 170 },
            flex: { xs: '1 1 calc(50% - 8px)', sm: '0 1 170px' },
            borderRadius: 2,
            textAlign: 'left',
            color: '#202124',
            bgcolor: '#626a6e',
            border: '1px solid #dfe3df',
            boxShadow: 'none',
          }}
        >
          <Typography
            sx={{
              mb: 0.5,
              fontSize: 12,
              fontWeight: 600,
              color: '#626a6e',
            }}
          >
            {String(index + 1).padStart(2, '0')} / {item.label}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: 18, sm: 20 } }}>
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
  searchQuery,
  onFilterOpen,
  onPlacesOpen,
  onSearchQueryChange,
}: ProvinceDetailHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      component="header"
      sx={{
        mx: 'auto',
        p: { xs: 2, sm: 3 },
        width: 1,
        maxWidth: '100%',
        overflow: 'visible',
        position: 'relative',
        textAlign: 'center',
        borderRadius: 3,
        color: '#202124',
        border: '1px solid #dfe3df',
        background: '#fff',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2.25} alignItems="center" sx={{ position: 'relative' }}>
        <Chip
          icon={<Iconify icon="custom:location-fill" />}
          label={dataSourceLabel || (isRemoteLoading ? 'กำลังดึงข้อมูล' : 'Thailand Cultural')}
          sx={{
            height: 34,
            px: 0.75,
            fontWeight: 600,
            borderRadius: 99,
            color: '#303c37',
            bgcolor: '#ecefeb',
            border: '1px solid #dfe3df',
            '& .MuiChip-icon': { color: '#4e6658' },
          }}
        />
        <Box>
          <Typography
            component="h1"
            variant="h2"
            sx={{
              mx: 'auto',
              fontWeight: 600,
              lineHeight: 1.3,
              maxWidth: 760,
              textShadow: 'none',
              fontSize: { xs: 36, sm: 44, md: 52 },
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
              color: '#626a6e',
            }}
          >
            สำรวจมรดก วัด ธรรมชาติ หัตถกรรม และเรื่องเล่าท้องถิ่นของจังหวัด
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="center"
          alignItems="center"
          sx={{ flex: 1, width: 1 }}
        >
          <Box
            sx={{
              px: 1.1,
              py: 0.6,
              gap: 1,
              width: 1,
              maxWidth: 400,
              minHeight: 46,
              display: 'flex',
              borderRadius: 99,
              alignItems: 'center',
              color: '#11343a',
              bgcolor: alpha('#f8f6ee', 0.94),
              border: `1px solid ${alpha('#f2d28b', 0.7)}`,
              boxShadow: 'none',
            }}
          >
            <Iconify icon="eva:search-fill" width={22} sx={{ flexShrink: 0, color: '#1f7b8e' }} />
            <InputBase
              value={searchQuery}
              placeholder="ค้นหาสถานที่"
              onChange={(event) => onSearchQueryChange(event.target.value)}
              sx={{
                flex: 1,
                minWidth: 0,
                color: '#11343a',
                fontSize: 14,
                fontWeight: 800,
                textAlign: 'left',
                '& input::placeholder': {
                  color: alpha('#11343a', 0.56),
                  opacity: 1,
                },
              }}
            />
            {!!searchQuery && (
              <IconButton
                size="small"
                aria-label="ล้างคำค้นหา"
                onClick={() => onSearchQueryChange('')}
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  color: '#11343a',
                  bgcolor: alpha('#11343a', 0.08),
                  '&:hover': { bgcolor: alpha('#11343a', 0.14) },
                }}
              >
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            )}
          </Box>

          <Button
            size="medium"
            variant="contained"
            startIcon={<Iconify icon="solar:list-bold" />}
            onClick={onFilterOpen}
            sx={{
              height: 48,
              width: { xs: 1, sm: 180 },
              borderRadius: 99,
              fontWeight: 600,
              color: '#11343a',
              bgcolor: alpha('#f8f6ee', 0.94),
              boxShadow: 'none',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            ตัวกรอง {activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
          {/* <Chip
            label={`${filteredCount}/${totalCount} สถานที่สำคัญ`}
            sx={{
              height: 38,
              px: 1,
              fontWeight: 'bold',
              borderRadius: 99,
              color: '#11343a',
              bgcolor: '#303c37',
              border: `1px solid ${alpha('#f2d28b', 0.84)}`,
              boxShadow: 'none',
            }}
          /> */}

          {/* <Button
            size="medium"
            variant="contained"
            startIcon={<Iconify icon="custom:location-fill" />}
            onClick={onPlacesOpen}
            sx={{
              height: 48,
              px: 1.8,
              width: 250,
              borderRadius: 99,
              fontWeight: 600,
              color: '#fff',
              bgcolor: '#1f7b8e',
              border: '1px solid #dfe3df',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#176b7d' },
            }}
          >
            สถานที่และวัฒนธรรม
          </Button> */}
        </Stack>
        <ProvinceCultureMetrics cultureMetrics={cultureMetrics} />
      </Stack>
    </Box>
  );
}

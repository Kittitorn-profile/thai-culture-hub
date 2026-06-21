'use client';

import type { CulturalPlace } from '../province-data';
import type { CategoryConfigMap } from '../category-config';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { getCategoryColor, getCategoryLabel } from '../category-config';
import { getSourceLabel, toggleFilterValue } from './province-detail-utils';

type ProvinceFilterDrawerProps = {
  open: boolean;
  totalCount: number;
  filteredCount: number;
  sourceOptions: string[];
  categoryOptions: string[];
  categoryConfig: CategoryConfigMap;
  districtOptions: string[];
  selectedSources: string[];
  selectedCategories: string[];
  selectedDistricts: string[];
  onClose: () => void;
  onSelectedSourcesChange: (value: string[] | ((prev: string[]) => string[])) => void;
  onSelectedCategoriesChange: (value: string[] | ((prev: string[]) => string[])) => void;
  onSelectedDistrictsChange: (value: string[] | ((prev: string[]) => string[])) => void;
};

type FilterSection = 'sources' | 'categories' | 'districts';

function FilterSectionHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      sx={{
        m: 0,
        p: 0,
        pb: 1,
        gap: 1,
        width: 1,
        border: 0,
        display: 'flex',
        cursor: 'pointer',
        bgcolor: 'transparent',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontWeight: 900 }}>{title}</Typography>
        {!!count && (
          <Box
            component="span"
            sx={{
              px: 0.8,
              py: 0.15,
              minWidth: 22,
              fontSize: 12,
              fontWeight: 900,
              borderRadius: 99,
              textAlign: 'center',
              color: '#11343a',
              bgcolor: '#e7e1d2',
            }}
          >
            {count}
          </Box>
        )}
      </Stack>

      <Iconify
        icon="eva:arrow-ios-downward-fill"
        width={18}
        sx={{
          color: 'text.secondary',
          transition: 'transform 160ms ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      />
    </Box>
  );
}

export function ProvinceFilterDrawer({
  open,
  totalCount,
  filteredCount,
  sourceOptions,
  categoryOptions,
  categoryConfig,
  districtOptions,
  selectedSources,
  selectedCategories,
  selectedDistricts,
  onClose,
  onSelectedSourcesChange,
  onSelectedCategoriesChange,
  onSelectedDistrictsChange,
}: ProvinceFilterDrawerProps) {
  const [openSections, setOpenSections] = useState<Record<FilterSection, boolean>>({
    sources: true,
    categories: true,
    districts: true,
  });

  const toggleSection = (section: FilterSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const trackFilterClick = (filterType: string, value: string, checked: boolean) => {
    trackAnalyticsEvent('filter_option_click', value, {
      filterType,
      value,
      checked,
    });
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: 320, sm: 380 },
          height: '100dvh',
          display: 'flex',
          overflow: 'hidden',
          flexDirection: 'column',
          bgcolor: '#f8f8f2',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2.5, pb: 0 }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900 }}>ตัวกรองข้อมูล</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            แสดง {filteredCount} จาก {totalCount} รายการ
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, pb: 2 }}>
        <Divider sx={{ my: 2.5 }} />

        <FilterSectionHeader
          title="แหล่งข้อมูล"
          count={selectedSources.length}
          open={openSections.sources}
          onToggle={() => toggleSection('sources')}
        />
        <Collapse in={openSections.sources} timeout="auto" unmountOnExit>
          <FormGroup>
            {sourceOptions.map((source) => (
              <FormControlLabel
                key={source}
                control={
                  <Checkbox
                    checked={selectedSources.includes(source)}
                    onChange={() => {
                      trackFilterClick('source', source, !selectedSources.includes(source));
                      onSelectedSourcesChange((prev) => toggleFilterValue(prev, source));
                    }}
                  />
                }
                label={getSourceLabel(source as CulturalPlace['source'])}
              />
            ))}
          </FormGroup>
        </Collapse>

        <Divider sx={{ my: 2.5 }} />

        <FilterSectionHeader
          title="หมวดหมู่"
          count={selectedCategories.length}
          open={openSections.categories}
          onToggle={() => toggleSection('categories')}
        />
        <Collapse in={openSections.categories} timeout="auto" unmountOnExit>
          <FormGroup>
            {categoryOptions.map((category) => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    onChange={() => {
                      trackFilterClick(
                        'category',
                        category,
                        !selectedCategories.includes(category)
                      );
                      onSelectedCategoriesChange((prev) => toggleFilterValue(prev, category));
                    }}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: getCategoryColor(categoryConfig, category),
                      }}
                    />
                    <span>{getCategoryLabel(categoryConfig, category)}</span>
                  </Stack>
                }
              />
            ))}
          </FormGroup>
        </Collapse>

        <Divider sx={{ my: 2.5 }} />

        <FilterSectionHeader
          title="อำเภอ"
          count={selectedDistricts.length}
          open={openSections.districts}
          onToggle={() => toggleSection('districts')}
        />
        <Collapse in={openSections.districts} timeout="auto" unmountOnExit>
          <FormGroup>
            {districtOptions.map((district) => (
              <FormControlLabel
                key={district}
                control={
                  <Checkbox
                    checked={selectedDistricts.includes(district)}
                    onChange={() => {
                      trackFilterClick('district', district, !selectedDistricts.includes(district));
                      onSelectedDistrictsChange((prev) => toggleFilterValue(prev, district));
                    }}
                  />
                }
                label={district}
              />
            ))}
          </FormGroup>
        </Collapse>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          p: 2.5,
          pt: 1.5,
          flexShrink: 0,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: '#f8f8f2',
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            onSelectedCategoriesChange([]);
            onSelectedSourcesChange([]);
            onSelectedDistrictsChange([]);
          }}
          sx={{ borderRadius: 1.2, fontWeight: 900 }}
        >
          ล้างตัวกรอง
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{ borderRadius: 1.2, fontWeight: 900 }}
        >
          ดูผลลัพธ์
        </Button>
      </Stack>
    </Drawer>
  );
}

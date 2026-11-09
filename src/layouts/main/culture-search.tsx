'use client';

import { RiMapPinLine, RiSearchLine, RiDatabase2Line, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { cultureUi } from 'src/theme/culture-ui';
import provinces from 'src/data/thailand-culture/provinces';
import { PUBLIC_DATA_GROUPS } from 'src/lib/public-cultural-data';
import { useDatasetVisibility } from 'src/lib/use-dataset-visibility';

const options = [
  ...PUBLIC_DATA_GROUPS.map((group) => ({
    dataset: group.key,
    label: group.label,
    group: 'หมวดข้อมูลวัฒนธรรม',
    href: group.href as string,
  })),
  ...provinces.map((province) => ({
    dataset: '',
    label: province.name,
    group: 'จังหวัด',
    href: `/province/${province.code}/?${new URLSearchParams({ name: province.name })}`,
  })),
];

export function CultureSearch() {
  const router = useRouter();
  const { isVisible } = useDatasetVisibility();

  return (
    <Autocomplete
      openOnFocus
      autoHighlight
      options={options.filter((option) => isVisible(option.dataset))}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.href === value.href}
      noOptionsText="ไม่พบจังหวัดหรือหมวดข้อมูลที่ตรงกัน"
      value={null}
      onChange={(_, option) => {
        if (option) router.push(option.href);
      }}
      forcePopupIcon={false}
      sx={{
        width: { xs: 110, sm: 180, lg: 220 },
        minWidth: 0,
        '& .MuiAutocomplete-inputRoot.MuiOutlinedInput-root': {
          pl: 2,
        },

        '& .MuiOutlinedInput-root': {
          px: 2,
          borderRadius: `${cultureUi.radius}px`,
          bgcolor: '#f0f3ed',
          minHeight: 44,
          fontSize: 13,
          color: '#2c4036',
          '& .MuiInputAdornment-root': { color: '#60806a' },
          '& input::placeholder': { color: '#7b887f', opacity: 1 },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a5b8a5' },
          transition: 'background-color 150ms, box-shadow 150ms',
          '&.Mui-focused': {
            bgcolor: '#fff',
            boxShadow: '0 0 0 3px rgba(96,141,140,0.12)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#608d8c',
            borderWidth: 1,
          },
        },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#dce4d8' },
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box component="li" key={key} {...optionProps}>
            <Box
              sx={{
                width: 34,
                height: 34,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#edf2ec',
                color: '#587460',
                borderRadius: 1.25,
              }}
            >
              {option.group === 'จังหวัด' ? (
                <RiMapPinLine size={17} />
              ) : (
                <RiDatabase2Line size={17} />
              )}
            </Box>
            <Box component="span" sx={{ flex: 1, minWidth: 0, lineHeight: 1.6 }}>
              {option.label}
            </Box>
            <RiArrowRightUpLine size={16} style={{ flexShrink: 0, color: '#84958a' }} />
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="ค้นหา"
          slotProps={{
            htmlInput: { ...params.inputProps, 'aria-label': 'ค้นหาจังหวัดหรือหมวดข้อมูล' },
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <RiSearchLine size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      slotProps={{
        popper: {
          placement: 'bottom-end',
          sx: {
            minWidth: { xs: 'min(320px, calc(100vw - 32px))', sm: 360 },
            maxWidth: 'calc(100vw - 32px)',
          },
        },
        paper: {
          sx: {
            mt: 1,
            bgcolor: '#fff',
            backgroundImage: 'none',
            border: '1px solid #e1e5dc',
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(30,45,35,0.12)',
            '& .MuiAutocomplete-groupLabel': {
              bgcolor: '#fff',
              color: '#7b887f',
              fontSize: 11,
              fontWeight: 600,
              lineHeight: '36px',
              px: 1.5,
            },
          },
        },
        listbox: {
          sx: {
            maxHeight: 'min(400px, 60dvh)',
            p: 0.75,
            scrollbarWidth: 'thin',
            scrollbarColor: '#d7dfd5 transparent',
            '& .MuiAutocomplete-option': {
              minHeight: 48,
              fontSize: 13,
              gap: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: 1.5,
              color: '#2c4036',
              '&.Mui-focused, &[aria-selected="true"].Mui-focused': { bgcolor: '#edf2ec' },
            },
          },
        },
      }}
    />
  );
}

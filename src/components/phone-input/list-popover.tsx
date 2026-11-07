'use client';

import { RiGlobalLine } from '@remixicon/react';
import type { PhoneCountry, CountryListProps } from './types';

import { useMemo } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import SvgIcon from '@mui/material/SvgIcon';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '../iconify';
import { FlagIcon } from '../flag-icon';
import { SearchNotFound } from '../search-not-found';

// ----------------------------------------------------------------------

export function CountryListPopover({
  sx,
  options,
  disabled,
  searchCountry,
  selectedCountry,
  onSearchCountry,
  onSelectedCountry,
  ...other
}: CountryListProps) {
  const { open, onClose, onOpen, anchorEl } = usePopover();

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: options,
        query: searchCountry,
      }),
    [options, searchCountry]
  );

  const notFound = dataFiltered.length === 0 && !!searchCountry;

  const btnId = 'country-list-button';
  const menuId = 'country-list-menu';

  const renderFlag = () =>
    selectedCountry ? (
      <FlagIcon
        code={selectedCountry}
        sx={{
          borderRadius: '50%',
          width: 'var(--popover-button-height)',
          height: 'var(--popover-button-height)',
        }}
      />
    ) : (
      <SvgIcon
        component={RiGlobalLine}
        inheritViewBox
        sx={{ width: 'var(--popover-button-height)', height: 'var(--popover-button-height)' }}
      />
    );

  const renderButton = () => (
    <ButtonBase
      disableRipple
      disabled={disabled}
      id={btnId}
      aria-haspopup="true"
      aria-controls={open ? menuId : undefined}
      aria-expanded={open ? 'true' : undefined}
      onClick={onOpen}
      sx={[
        {
          zIndex: 9,
          display: 'flex',
          position: 'absolute',
          justifyContent: 'flex-start',
          width: 'var(--popover-button-width)',
          height: 'var(--popover-button-height)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {renderFlag()}

      {!disabled && (
        <Iconify
          icon="eva:chevron-down-fill"
          sx={{
            ml: 0.25,
            flexShrink: 0,
            color: 'text.disabled',
            ...(open && { color: 'text.primary' }),
          }}
        />
      )}

      <Box
        component="span"
        sx={(theme) => ({
          height: 20,
          ml: 'auto',
          width: '1px',
          bgcolor: theme.vars.palette.divider,
        })}
      />
    </ButtonBase>
  );

  const renderList = () => (
    <MenuList>
      {dataFiltered.map((country) => (
        <MenuItem
          key={country.code}
          selected={open && selectedCountry === country.code}
          autoFocus={open && selectedCountry === country.code}
          onClick={() => {
            onClose();
            onSearchCountry('');
            onSelectedCountry(country.code as PhoneCountry);
          }}
        >
          <FlagIcon
            code={country.code}
            sx={{ mr: 1, width: 22, height: 22, borderRadius: '50%' }}
          />

          <ListItemText
            primary={country.label}
            secondary={`${country.code} (+${country.phone})`}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { sx: { typography: 'caption' } },
            }}
          />
        </MenuItem>
      ))}
    </MenuList>
  );

  const renderPopover = () => (
    <Popover
      id={menuId}
      aria-labelledby={btnId}
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        onClose();
        onSearchCountry('');
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 1,
            height: 320,
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box sx={{ px: 1, py: 1.5 }}>
        <TextField
          autoFocus
          fullWidth
          value={searchCountry}
          onChange={(event) => onSearchCountry(event.target.value)}
          placeholder="Search..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: searchCountry && (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" onClick={() => onSearchCountry('')}>
                    <Iconify width={16} icon="mingcute:close-line" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Box sx={{ flex: '1 1 auto', overflowX: 'hidden' }}>
        {notFound ? <SearchNotFound query={searchCountry} sx={{ px: 2, pt: 5 }} /> : renderList()}
      </Box>
    </Popover>
  );

  return (
    <>
      {renderButton()}
      {renderPopover()}
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  query: string;
  inputData: CountryListProps['options'];
};

function applyFilter({ inputData, query }: ApplyFilterProps) {
  if (!query) return inputData;

  const lowerQuery = query.toLowerCase();

  return inputData.filter(({ label, code, phone }) =>
    [label, code, phone].some((field) => field?.toLowerCase().includes(lowerQuery))
  );
}

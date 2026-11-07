import { RiArrowDownSLine } from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';

import SvgIcon, { svgIconClasses } from '@mui/material/SvgIcon';
import { autocompleteClasses } from '@mui/material/Autocomplete';

// ----------------------------------------------------------------------

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const ArrowDownIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiArrowDownSLine} inheritViewBox {...props} />
);

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiAutocomplete: Components<Theme>['MuiAutocomplete'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    popupIcon: <ArrowDownIcon />,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      [`& span.${autocompleteClasses.tag}`]: {
        ...theme.typography.subtitle2,
        height: 24,
        minWidth: 24,
        lineHeight: '24px',
        textAlign: 'center',
        padding: theme.spacing(0, 0.75),
        color: theme.vars.palette.text.secondary,
        borderRadius: theme.shape.borderRadius,
        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
      },
    }),
    paper: ({ theme }) => ({
      ...theme.mixins.paperStyles(theme, { dropdown: true }),
    }),
    listbox: ({ theme }) => ({
      padding: 0,
      [`& .${autocompleteClasses.option}`]: {
        ...theme.mixins.menuItemStyles(theme),
      },
    }),
    endAdornment: {
      [`& .${svgIconClasses.root}`]: {
        fontSize: 18,
      },
    },
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const autocomplete: Components<Theme> = {
  MuiAutocomplete,
};

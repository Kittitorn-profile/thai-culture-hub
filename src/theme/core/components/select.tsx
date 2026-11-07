import { RiArrowDownSLine } from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, CSSObject, Components } from '@mui/material/styles';

import SvgIcon from '@mui/material/SvgIcon';

// ----------------------------------------------------------------------

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const ArrowDownIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiArrowDownSLine} inheritViewBox {...props} />
);

const arrowStyles: CSSObject = {
  right: 10,
  width: 18,
  height: 18,
  top: 'calc(50% - 9px)',
};

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiSelect: Components<Theme>['MuiSelect'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    IconComponent: ArrowDownIcon,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    icon: {
      ...arrowStyles,
    },
  },
};

const MuiNativeSelect: Components<Theme>['MuiNativeSelect'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    IconComponent: ArrowDownIcon,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    icon: {
      ...arrowStyles,
    },
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const select: Components<Theme> = {
  MuiSelect,
  MuiNativeSelect,
};

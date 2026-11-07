import { RiCheckboxBlankLine, RiCheckboxFill, RiCheckboxIndeterminateFill } from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components } from '@mui/material/styles';

import SvgIcon from '@mui/material/SvgIcon';
import { checkboxClasses } from '@mui/material/Checkbox';

// ----------------------------------------------------------------------

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const Icon = (props: SvgIconProps) => (
  <SvgIcon component={RiCheckboxBlankLine} inheritViewBox {...props} />
);

const CheckedIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiCheckboxFill} inheritViewBox {...props} />
);

const IndeterminateIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiCheckboxIndeterminateFill} inheritViewBox {...props} />
);

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiCheckbox: Components<Theme>['MuiCheckbox'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    size: 'small',
    icon: <Icon />,
    checkedIcon: <CheckedIcon />,
    indeterminateIcon: <IndeterminateIcon />,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1),
      variants: [
        {
          props: (props) => props.color === 'default',
          style: {
            [`&.${checkboxClasses.checked}`]: {
              color: theme.vars.palette.text.primary,
            },
          },
        },
      ],
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const checkbox: Components<Theme> = {
  MuiCheckbox,
};

import { RiCheckboxBlankCircleLine, RiRadioButtonFill } from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components } from '@mui/material/styles';

import SvgIcon from '@mui/material/SvgIcon';
import { radioClasses } from '@mui/material/Radio';

// ----------------------------------------------------------------------

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const Icon = (props: SvgIconProps) => (
  <SvgIcon component={RiCheckboxBlankCircleLine} inheritViewBox {...props} />
);

const CheckedIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiRadioButtonFill} inheritViewBox {...props} />
);

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiRadio: Components<Theme>['MuiRadio'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    size: 'small',
    icon: <Icon />,
    checkedIcon: <CheckedIcon />,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1),
      variants: [
        {
          props: (props) => props.color === 'default',
          style: {
            [`&.${radioClasses.checked}`]: {
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
export const radio: Components<Theme> = {
  MuiRadio,
};

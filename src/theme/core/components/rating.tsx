import { RiStarFill } from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components, ComponentsVariants } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';

import SvgIcon from '@mui/material/SvgIcon';

// ----------------------------------------------------------------------

/**
 * TypeScript extension for MUI theme augmentation.
 * @to {@link file://./../../extend-theme-types.d.ts}
 */
export type RatingExtendSize = { xxSmall: true; xSmall: true };

type RatingVariants = ComponentsVariants<Theme>['MuiRating'];

const SIZES = ['xxSmall', 'xSmall', 'small', 'medium', 'large'] as const;
const DIMENSIONS: Record<(typeof SIZES)[number], number> = {
  xxSmall: 12,
  xSmall: 16,
  small: 20,
  medium: 24,
  large: 28,
};

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const Icon = (props: SvgIconProps) => <SvgIcon component={RiStarFill} inheritViewBox {...props} />;

/* **********************************************************************
 * 🗳️ Variants
 * **********************************************************************/
const sizeVariants = [
  ...(SIZES.map((size) => ({
    props: (props) => props.size === size,
    style: { fontSize: DIMENSIONS[size] },
  })) satisfies RatingVariants),
] satisfies RatingVariants;

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiRating: Components<Theme>['MuiRating'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    icon: <Icon fontSize="inherit" />,
    emptyIcon: <Icon fontSize="inherit" />,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    icon: {
      variants: [...sizeVariants],
    },
    iconEmpty: ({ theme }) => ({
      color: varAlpha(
        theme.vars.palette.grey['500Channel'],
        theme.vars.palette.action.disabledOpacity
      ),
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const rating: Components<Theme> = {
  MuiRating,
};

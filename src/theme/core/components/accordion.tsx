import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import type { BoxProps } from '@mui/material/Box';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { AccordionSummaryClassKey } from '@mui/material/AccordionSummary';
import type { Theme, CSSObject, Components, ComponentsVariants } from '@mui/material/styles';

import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import { accordionClasses } from '@mui/material/Accordion';
import { accordionSummaryClasses } from '@mui/material/AccordionSummary';
import { accordionDetailsClasses } from '@mui/material/AccordionDetails';

// ----------------------------------------------------------------------

type AccordionVariants = ComponentsVariants<Theme>['MuiAccordion'];

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/

const PlusIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiAddLine} inheritViewBox {...props} />
);

const MinusIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiSubtractLine} inheritViewBox {...props} />
);

const iconClasses = {
  container: 'accordion__icon__container',
  plus: 'accordion__icon__plus',
  minus: 'accordion__icon__minus',
};

const getExpandIconStyles = (theme: Theme): Record<string, CSSObject> => {
  const resetTransform: Record<string, CSSObject> = {
    default: {
      transition: 'inherit',
      transform: 'rotate(0deg)',
    },
    expanded: {
      transform: 'rotate(-180deg)',
    },
  };

  const iconContainerStyles: CSSObject = {
    width: 24,
    height: 24,
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconStyles: CSSObject = {
    width: 18,
    height: 18,
    position: 'absolute',
    transition: theme.transitions.create(['transform', 'opacity'], {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.shortest,
    }),
  };

  return {
    [`& .${iconClasses.container}`]: { ...resetTransform.default, ...iconContainerStyles },
    [`& .${iconClasses.plus}`]: { ...iconStyles, transform: 'scale(1)', opacity: 1 },
    [`& .${iconClasses.minus}`]: { ...iconStyles, transform: 'scale(0.4)', opacity: 0 },
    [`&.${accordionSummaryClasses.expanded}`]: {
      [`& .${iconClasses.container}`]: resetTransform.expanded,
      [`& .${iconClasses.plus}`]: { transform: 'scale(0.4)', opacity: 0 },
      [`& .${iconClasses.minus}`]: { transform: 'scale(1)', opacity: 1 },
    },
  };
};

const ExpandIcon = (props: BoxProps) => (
  <Box component="span" className={iconClasses.container} {...props}>
    <PlusIcon className={iconClasses.plus} />
    <MinusIcon className={iconClasses.minus} />
  </Box>
);

/* **********************************************************************
 * 🗳️ Variants
 * **********************************************************************/
const expandedVariants = [
  {
    props: (props) => !props.disableGutters && !!props.expanded,
    style: ({ theme }) => ({
      boxShadow: theme.vars.customShadows.z8,
      borderRadius: theme.shape.borderRadius,
      backgroundColor: theme.vars.palette.background.paper,
    }),
  },
] satisfies AccordionVariants;

const disableGuttersVariants = [
  {
    props: (props) => !!props.disableGutters,
    style: ({ theme }) => ({
      borderBottom: `solid 1px ${theme.vars.palette.divider}`,
      '&:last-of-type': { borderBottom: 'none' },
      '&::before': { display: 'none' }, // Hide the border
      [`& .${accordionSummaryClasses.root}`]: {
        paddingLeft: 0,
        paddingRight: 0,
      },
      [`& .${accordionDetailsClasses.root}`]: {
        paddingLeft: 0,
        paddingRight: 0,
      },
    }),
  },
] satisfies AccordionVariants;

const disableVariants = [
  {
    props: {},
    style: ({ theme }) => ({
      [`&.${accordionClasses.disabled}`]: {
        backgroundColor: 'transparent',
        [`& .${accordionDetailsClasses.root}`]: {
          opacity: theme.vars.palette.action.disabledOpacity,
        },
      },
    }),
  },
] satisfies AccordionVariants;

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiAccordion: Components<Theme>['MuiAccordion'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    square: true,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: {
      backgroundColor: 'transparent',
      variants: [...expandedVariants, ...disableGuttersVariants, ...disableVariants],
    },
  },
};

const sizingReset: Partial<Record<AccordionSummaryClassKey, CSSObject>> = {
  root: {
    minHeight: 'auto',
    [`&.${accordionSummaryClasses.expanded}`]: {
      minHeight: 'inherit',
    },
  },
  content: {
    margin: 0,
    [`&.${accordionSummaryClasses.expanded}`]: {
      margin: 'inherit',
    },
  },
};

const MuiAccordionSummary: Components<Theme>['MuiAccordionSummary'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    expandIcon: <ExpandIcon />,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      ...sizingReset.root,
      padding: theme.spacing(2, 1, 2, 2),
    }),
    content: {
      ...sizingReset.content,
    },
    expandIconWrapper: ({ theme }) => ({
      ...getExpandIconStyles(theme),
      color: 'inherit',
      alignSelf: 'flex-start',
      marginLeft: theme.spacing(2),
    }),
  },
};

const MuiAccordionDetails: Components<Theme>['MuiAccordionDetails'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: {
      paddingTop: 0,
    },
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const accordion: Components<Theme> = {
  MuiAccordion,
  MuiAccordionSummary,
  MuiAccordionDetails,
};

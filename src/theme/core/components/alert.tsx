import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
} from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components, ComponentsVariants } from '@mui/material/styles';

import { varAlpha, parseCssVar } from 'minimal-shared/utils';

import SvgIcon from '@mui/material/SvgIcon';

// ----------------------------------------------------------------------

const SEVERITIES = ['info', 'success', 'warning', 'error'] as const;

type AlertVariants = ComponentsVariants<Theme>['MuiAlert'];

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const InfoIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiInformationLine} inheritViewBox {...props} />
);

const SuccessIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiCheckboxCircleLine} inheritViewBox {...props} />
);

const WarningIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiAlertLine} inheritViewBox {...props} />
);

const ErrorIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiErrorWarningLine} inheritViewBox {...props} />
);

/* **********************************************************************
 * 🗳️ Variants
 * **********************************************************************/
const standardVariants = [
  ...(SEVERITIES.map((colorKey) => ({
    props: (props) => props.variant === 'standard' && props.severity === colorKey,
    style: ({ theme }) => ({
      color: theme.vars.palette[colorKey].darker,
      backgroundColor: theme.vars.palette[colorKey].lighter,
      ...theme.applyStyles('dark', {
        color: theme.vars.palette[colorKey].lighter,
        backgroundColor: theme.vars.palette[colorKey].darker,
      }),
    }),
  })) satisfies AlertVariants),
] satisfies AlertVariants;

const filledVariants = [
  ...(SEVERITIES.map((colorKey) => ({
    props: (props) => props.variant === 'filled' && props.severity === colorKey,
    style: ({ theme }) => ({
      color: theme.vars.palette[colorKey].contrastText,
    }),
  })) satisfies AlertVariants),
] satisfies AlertVariants;

const outlinedVariants = [
  ...(SEVERITIES.map((colorKey) => ({
    props: (props) => props.variant === 'outlined' && props.severity === colorKey,
    style: ({ theme }) => ({
      color: theme.vars.palette[colorKey].dark,
      backgroundColor: varAlpha(theme.vars.palette[colorKey].mainChannel, 0.08),
      border: `solid 1px ${varAlpha(theme.vars.palette[colorKey].mainChannel, 0.16)}`,
      ...theme.applyStyles('dark', {
        color: theme.vars.palette[colorKey].light,
      }),
    }),
  })) satisfies AlertVariants),
] satisfies AlertVariants;

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiAlert: Components<Theme>['MuiAlert'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    iconMapping: {
      info: <InfoIcon />,
      error: <ErrorIcon />,
      success: <SuccessIcon />,
      warning: <WarningIcon />,
    },
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: {
      variants: [...standardVariants, ...filledVariants, ...outlinedVariants],
    },
    icon: ({ theme }) => ({
      opacity: 1,
      ...theme.applyStyles('dark', {
        [parseCssVar(theme.vars.palette.Alert.infoIconColor)]: theme.vars.palette.info.light,
        [parseCssVar(theme.vars.palette.Alert.errorIconColor)]: theme.vars.palette.error.light,
        [parseCssVar(theme.vars.palette.Alert.successIconColor)]: theme.vars.palette.success.light,
        [parseCssVar(theme.vars.palette.Alert.warningIconColor)]: theme.vars.palette.warning.light,
      }),
    }),
  },
};

const MuiAlertTitle: Components<Theme>['MuiAlertTitle'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      marginBottom: theme.spacing(0.5),
      fontWeight: theme.typography.fontWeightSemiBold,
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const alert: Components<Theme> = {
  MuiAlert,
  MuiAlertTitle,
};

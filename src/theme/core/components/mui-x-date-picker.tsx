import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiTimeLine,
} from '@remixicon/react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { Theme, Components } from '@mui/material/styles';
import type { TextFieldProps } from '@mui/material/TextField';

import SvgIcon from '@mui/material/SvgIcon';
import { buttonClasses } from '@mui/material/Button';
import { inputLabelClasses } from '@mui/material/InputLabel';
import { pickersSectionListClasses } from '@mui/x-date-pickers/PickersSectionList';
import {
  pickersInputBaseClasses,
  pickersFilledInputClasses,
  pickersOutlinedInputClasses,
} from '@mui/x-date-pickers/PickersTextField';

import {
  inputStyles,
  inputBaseStyles,
  filledInputStyles,
  inputBaseVariants,
  outlinedInputStyles,
  filledInputVariants,
  outlinedInputVariants,
} from './text-field';

// ----------------------------------------------------------------------

/* **********************************************************************
 * ♉️ Custom icons
 * **********************************************************************/
const SwitchViewIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiArrowDownSLine} inheritViewBox {...props} />
);

const LeftArrowIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiArrowLeftSLine} inheritViewBox {...props} />
);

const RightArrowIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiArrowRightSLine} inheritViewBox {...props} />
);

const CalendarIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiCalendarEventLine} inheritViewBox {...props} />
);

const ClockIcon = (props: SvgIconProps) => (
  <SvgIcon component={RiTimeLine} inheritViewBox {...props} />
);

// ----------------------------------------------------------------------

const baseSlots = {
  switchViewIcon: SwitchViewIcon,
  leftArrowIcon: LeftArrowIcon,
  rightArrowIcon: RightArrowIcon,
};

const defaultProps = {
  dateSlots: { ...baseSlots, openPickerIcon: CalendarIcon },
  timeSlots: { ...baseSlots, openPickerIcon: ClockIcon },
  tabs: { dateIcon: <CalendarIcon />, timeIcon: <ClockIcon /> },
  baseField: {
    slotProps: {
      textField: { fullWidth: true } satisfies Partial<TextFieldProps>,
    },
  },
};

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiPickersLayout: Components<Theme>['MuiPickersLayout'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    actionBar: ({ theme }) => ({
      padding: theme.spacing(2),
      '& > :not(:first-of-type)': {
        marginLeft: theme.spacing(1),
      },
      [`& .${buttonClasses.root}`]: {
        '&:last-of-type': {
          ...theme.mixins.filledStyles(theme, 'inherit', {
            hover: {
              boxShadow: theme.vars.customShadows.z8,
            },
          }),
        },
      },
    }),
  },
};

const MuiPickerPopper: Components<Theme>['MuiPickerPopper'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    paper: ({ theme }) => ({
      boxShadow: theme.vars.customShadows.dropdown,
      borderRadius: Number(theme.shape.borderRadius) * 1.5,
    }),
  },
};

const MuiDateTimePickerTabs: Components<Theme>['MuiDateTimePickerTabs'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: { ...defaultProps.tabs },
};

const MuiClock: Components<Theme>['MuiClock'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    clock: ({ theme }) => ({
      backgroundColor: theme.vars.palette.background.neutral,
    }),
  },
};

const inputComponents: Components<Theme> = {
  MuiPickersTextField: {
    defaultProps: {
      variant: 'outlined',
    },
    styleOverrides: {
      root: {
        variants: [
          {
            props: (props) => !props.isFieldFocused && !props.isFieldValueEmpty,
            style: {
              [`& .${inputLabelClasses.root}[data-shrink="false"] + .${pickersInputBaseClasses.root} > .${pickersSectionListClasses.root}`]:
                {
                  opacity: 0,
                },
            },
          },
        ],
      },
    },
  },
  MuiPickersInputBase: {
    styleOverrides: {
      root: ({ theme }) => ({
        ...inputBaseStyles.root('picker', theme, {
          input: pickersSectionListClasses.root,
          disabled: pickersInputBaseClasses.disabled,
        }),
      }),
      sectionsContainer: ({ theme }) => ({
        ...inputBaseStyles.input('picker', theme),
        variants: [
          ...inputBaseVariants.input,
          {
            props: (props) => !props.isFieldFocused && !!props.isFieldValueEmpty,
            style: {
              opacity: 1,
              color: theme.vars.palette.text.disabled,
            },
          },
        ],
      }),
    },
  },
  MuiPickersInput: {
    styleOverrides: {
      root: ({ theme }) => inputStyles.root(theme),
    },
  },
  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => outlinedInputStyles.root(theme, pickersOutlinedInputClasses),
      sectionsContainer: { variants: [...outlinedInputVariants.input] },
      notchedOutline: ({ theme }) => outlinedInputStyles.notchedOutline(theme),
    },
  },
  MuiPickersFilledInput: {
    defaultProps: {
      disableUnderline: true,
    },
    styleOverrides: {
      root: ({ theme }) => filledInputStyles.root(theme, pickersFilledInputClasses),
      sectionsContainer: { variants: [...filledInputVariants.input] },
    },
  },
};

const toolbarComponents: Components<Theme> = {
  MuiPickersToolbar: {
    styleOverrides: {
      content: { marginTop: 8 },
    },
  },
  MuiPickersToolbarButton: {
    styleOverrides: {
      root: { minWidth: 36 },
    },
  },
  MuiTimePickerToolbar: {
    styleOverrides: {
      separator: { marginLeft: 2, marginRight: 2 },
      ampmLandscape: { gap: 16, justifyContent: 'flex-start' },
      ampmLabel: ({ theme }) => ({ ...theme.typography.subtitle1 }),
    },
  },
  MuiDateTimePickerToolbar: {
    styleOverrides: {
      separator: { marginLeft: 2, marginRight: 2 },
      ampmLandscape: { gap: 16, justifyContent: 'flex-start' },
      ampmLabel: ({ theme }) => ({ ...theme.typography.subtitle1 }),
      timeDigitsContainer: { alignItems: 'center' },
    },
  },
};

/**
 * ➤ Date picker
 * - https://mui.com/x/react-date-pickers/date-picker/
 */
const datePickerComponents: Components<Theme> = {
  MuiDateField: { defaultProps: { ...defaultProps.baseField } },
  MuiDatePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiDesktopDatePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiMobileDatePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiStaticDatePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
};

/**
 * ➤ Time picker
 * - https://mui.com/x/react-date-pickers/time-picker/
 */
const timePickerComponents: Components<Theme> = {
  MuiTimeField: { defaultProps: { ...defaultProps.baseField } },
  MuiTimePicker: { defaultProps: { slots: { ...defaultProps.timeSlots } } },
  MuiDesktopTimePicker: { defaultProps: { slots: { ...defaultProps.timeSlots } } },
  MuiMobileTimePicker: { defaultProps: { slots: { ...defaultProps.timeSlots } } },
  MuiStaticTimePicker: { defaultProps: { slots: { ...defaultProps.timeSlots } } },
};

/**
 * ➤ Date & Time picker
 * - https://mui.com/x/react-date-pickers/date-time-picker/
 */
const dateTimePickerComponents: Components<Theme> = {
  MuiDateTimeField: { defaultProps: { ...defaultProps.baseField } },
  MuiDateTimePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiDesktopDateTimePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiMobileDateTimePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
  MuiStaticDateTimePicker: { defaultProps: { slots: { ...defaultProps.dateSlots } } },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const datePicker: Components<Theme> = {
  ...toolbarComponents,
  MuiClock,
  MuiPickerPopper,
  MuiPickersLayout,
  MuiDateTimePickerTabs,
  /********/
  ...inputComponents,
  ...datePickerComponents,
  ...timePickerComponents,
  ...dateTimePickerComponents,
};

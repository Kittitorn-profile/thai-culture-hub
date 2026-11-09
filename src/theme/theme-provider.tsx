'use client';

import type { Theme, ThemeProviderProps as MuiThemeProviderProps } from '@mui/material/styles';
import type {} from './extend-theme-types';
import type { ThemeOptions } from './types';

import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';

import { useTranslate } from 'src/locales';

import { useSettingsContext } from 'src/components/settings';

import { cultureUi } from './culture-ui';
import { createTheme } from './create-theme';
import { Rtl } from './with-settings/right-to-left';

// ----------------------------------------------------------------------

export type ThemeProviderProps = Partial<MuiThemeProviderProps<Theme>> & {
  themeOverrides?: ThemeOptions;
};

export function ThemeProvider({ themeOverrides, children, ...other }: ThemeProviderProps) {
  const settings = useSettingsContext();
  const { currentLang } = useTranslate();

  const theme = createTheme({
    settingsState: settings.state,
    localeComponents: currentLang?.systemValue,
    themeOverrides,
  });

  return (
    <ThemeVarsProvider disableTransitionOnChange theme={theme} {...other}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          '.MuiButton-root.MuiButton-root': { borderRadius: cultureUi.radius },
        }}
      />
      <Rtl direction={settings.state.direction}>{children}</Rtl>
    </ThemeVarsProvider>
  );
}

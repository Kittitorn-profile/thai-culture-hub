import 'src/global.css';

import type { Metadata, Viewport } from 'next';

import { Suspense } from 'react';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import { CONFIG } from 'src/global-config';
import { LocalizationProvider } from 'src/locales';
import { detectLanguage } from 'src/locales/server';
import { I18nProvider } from 'src/locales/i18n-provider';
import { themeConfig, ThemeProvider, primary as primaryColor } from 'src/theme';

import { Snackbar } from 'src/components/snackbar';
import { LocatorJS } from 'src/components/locator-js';
import { FeedbackWidget } from 'src/components/feedback';
import { ProgressBar } from 'src/components/progress-bar';
import { VisitorAnalytics } from 'src/components/analytics';
import { CookieConsent } from 'src/components/cookie-consent';
import { QueryProvider } from 'src/components/query-provider';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { detectSettings } from 'src/components/settings/server';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { AuthProvider as JwtAuthProvider } from 'src/auth/context/jwt';
import { AuthProvider as SupabaseAuthProvider } from 'src/auth/context/supabase';

// ----------------------------------------------------------------------

const AuthProvider = (CONFIG.auth.method === 'supabase' && SupabaseAuthProvider) || JwtAuthProvider;

const OG_IMAGE_URL =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1781850507/og-images_ciyncn.jpg';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primaryColor.main,
};

export const metadata: Metadata = {
  icons: [
    {
      rel: 'icon',
      url: `${CONFIG.assetsDir}/favicon.ico`,
    },
  ],
  openGraph: {
    images: [OG_IMAGE_URL],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE_URL],
  },
};

// ----------------------------------------------------------------------

type RootLayoutProps = {
  children: React.ReactNode;
};

async function getAppConfig() {
  if (CONFIG.isStaticExport) {
    return {
      lang: 'en',
      i18nLang: undefined,
      cookieSettings: undefined,
      dir: defaultSettings.direction,
    };
  } else {
    const [lang, settings] = await Promise.all([detectLanguage(), detectSettings()]);

    return {
      lang,
      i18nLang: lang,
      cookieSettings: settings,
      dir: settings.direction,
    };
  }
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const appConfig = await getAppConfig();

  return (
    <html lang={appConfig.lang} dir={appConfig.dir} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          modeStorageKey={themeConfig.modeStorageKey}
          attribute={themeConfig.cssVariables.colorSchemeSelector}
          defaultMode={themeConfig.defaultMode}
        />

        <I18nProvider lang={appConfig.i18nLang}>
          <AuthProvider>
            <SettingsProvider
              defaultSettings={defaultSettings}
              cookieSettings={appConfig.cookieSettings}
            >
              <LocalizationProvider>
                <AppRouterCacheProvider options={{ key: 'css' }}>
                  <ThemeProvider
                    modeStorageKey={themeConfig.modeStorageKey}
                    defaultMode={themeConfig.defaultMode}
                  >
                    <QueryProvider>
                      <MotionLazy>
                        <LocatorJS />
                        <Snackbar />
                        <ProgressBar />
                        <SettingsDrawer defaultSettings={defaultSettings} />
                        <Suspense fallback={null}>
                          <VisitorAnalytics />
                        </Suspense>
                        <CookieConsent />
                        <FeedbackWidget />
                        {children}
                      </MotionLazy>
                    </QueryProvider>
                  </ThemeProvider>
                </AppRouterCacheProvider>
              </LocalizationProvider>
            </SettingsProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { FooterProps } from './footer';
import type { NavMainProps } from './nav/types';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../core';

import Alert from '@mui/material/Alert';

import { usePathname } from 'src/routes/hooks';

import { cultureUi } from 'src/theme/culture-ui';

import { useAuthContext } from 'src/auth/hooks';
import { isCreatorUser } from 'src/auth/utils/role-redirect';

import { Footer, HomeFooter } from './footer';
import { CultureHeader } from './culture-header';
import { MobileBottomNav } from './nav/mobile/mobile-bottom-nav';
import { MainSection, LayoutSection, HeaderSection } from '../core';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type MainLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavMainProps['data'];
    };
    main?: MainSectionProps;
    footer?: FooterProps;
  };
};

export function MainLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'md',
}: MainLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();

  const isHomePage = pathname === '/';

  const isCreator = isCreatorUser(user);
  const renderHeader = () => {
    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      centerArea: <CultureHeader pathname={pathname} />,
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={{
          ...slotProps?.header?.slotProps,
          container: {
            maxWidth: false,
            ...slotProps?.header?.slotProps?.container,
            sx: {
              height: { xs: 72, md: 88 },
              px: '0 !important',
              maxWidth: 'none !important',
              ...slotProps?.header?.slotProps?.container?.sx,
            },
          },
          centerArea: {
            ...slotProps?.header?.slotProps?.centerArea,
            sx: {
              minWidth: 0,
              ...slotProps?.header?.slotProps?.centerArea?.sx,
            },
          },
        }}
        sx={[
          () => ({
            top: 0,
            bgcolor: cultureUi.background,
            color: cultureUi.text,
            backgroundImage: 'none',
            borderBottom: '1px solid #e6e6e2',
            boxShadow: 'none',
            '--color': cultureUi.text,
          }),
          ...(Array.isArray(slotProps?.header?.sx) ? slotProps.header.sx : [slotProps?.header?.sx]),
        ]}
      />
    );
  };

  const renderFooter = () =>
    isHomePage ? (
      <HomeFooter sx={slotProps?.footer?.sx} />
    ) : (
      <Footer sx={slotProps?.footer?.sx} layoutQuery={layoutQuery} />
    );

  const renderMain = () => (
    <MainSection
      {...slotProps?.main}
      sx={[
        { mt: 0 },
        ...(Array.isArray(slotProps?.main?.sx) ? slotProps.main.sx : [slotProps?.main?.sx]),
      ]}
    >
      {children}
    </MainSection>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={cssVars}
      sx={[
        { pb: { xs: 'calc(72px + env(safe-area-inset-bottom, 0px))', [layoutQuery]: 0 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderHeader()}
      {renderMain()}
      <MobileBottomNav pathname={pathname} isCreator={isCreator} layoutQuery={layoutQuery} />
      {/* {renderFooter()} */}
    </LayoutSection>
  );
}

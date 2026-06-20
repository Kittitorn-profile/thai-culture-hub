'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { FooterProps } from './footer';
import type { NavMainProps } from './nav/types';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../core';

import { useBoolean } from 'minimal-shared/hooks';

import Alert from '@mui/material/Alert';

import { usePathname } from 'src/routes/hooks';

import { NavMobile } from './nav/mobile';
import { Footer, HomeFooter } from './footer';
import { CultureHeader } from './culture-header';
import { MenuButton } from '../components/menu-button';
import { navData as mainNavData } from '../nav-config-main';
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

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const isHomePage = pathname === '/';

  const navData = slotProps?.nav?.data ?? mainNavData;

  const renderHeader = () => {
    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={(theme) => ({
              mr: 1,
              ml: -1,
              [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
            })}
          />
          <NavMobile data={navData} open={open} onClose={onClose} />
        </>
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
          (theme) => ({
            top: 0,
            bgcolor: 'transparent',
            backgroundImage: 'none',
            borderBottom: 0,
            boxShadow: 'none',
            '--color': theme.palette.common.white,
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

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <LayoutSection
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={cssVars}
      sx={sx}
    >
      {renderHeader()}
      {renderMain()}
      {/* {renderFooter()} */}
    </LayoutSection>
  );
}

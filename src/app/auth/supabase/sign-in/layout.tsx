import { AuthSplitLayout } from 'src/layouts/auth-split';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const AUTH_ABOUT_TEXT = '#202124';
const AUTH_ABOUT_DEEP = '#2a3736';
const AUTH_ABOUT_BG_MIDDLE = '#f7f7f5';
const AUTH_ABOUT_SHARED_BACKGROUND = 'none';
const AUTH_ABOUT_POSTER_PATTERN = 'none';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <GuestGuard>
      <AuthSplitLayout
        slotProps={{
          main: {
            sx: {
              color: AUTH_ABOUT_TEXT,
              overflow: 'hidden',
              position: 'relative',
              bgcolor: AUTH_ABOUT_BG_MIDDLE,
              backgroundImage: AUTH_ABOUT_SHARED_BACKGROUND,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: { xs: -80, md: -120 },
                zIndex: 0,
                opacity: 0.22,
                pointerEvents: 'none',
                backgroundImage: AUTH_ABOUT_POSTER_PATTERN,
                transform: 'rotate(-4deg)',
              },
            },
          },
          section: { sx: { display: 'none' } },
          content: {
            sx: {
              zIndex: 1,
              '& > div': {
                p: { xs: 3, sm: 4 },
                color: AUTH_ABOUT_DEEP,
                borderRadius: 2,
                border: '1px solid #dfe3df',
                bgcolor: '#fff',
                boxShadow: 'none',
              },
            },
          },
        }}
      >
        {children}
      </AuthSplitLayout>
    </GuestGuard>
  );
}

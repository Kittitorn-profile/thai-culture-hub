import { AuthSplitLayout } from 'src/layouts/auth-split';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const AUTH_ABOUT_TEXT = '#f8f6ee';
const AUTH_ABOUT_DEEP = '#2a3736';
const AUTH_ABOUT_BG_TOP = '#6f8790';
const AUTH_ABOUT_BG_MIDDLE = '#7b8476';
const AUTH_ABOUT_BG_BOTTOM = '#8f7c5c';
const AUTH_ABOUT_SHARED_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${AUTH_ABOUT_BG_TOP} 0%, ${AUTH_ABOUT_BG_MIDDLE} 54%, ${AUTH_ABOUT_BG_BOTTOM} 100%)
`;
const AUTH_ABOUT_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

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
                backdropFilter: 'blur(3px)',
                bgcolor: 'rgba(248,246,238,0.9)',
                boxShadow: '0 24px 80px rgba(32,42,43,0.24)',
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

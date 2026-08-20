import { AuthSplitLayout } from 'src/layouts/auth-split';

import { GuestGuard } from 'src/auth/guard';

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
              minHeight: '100dvh',
              color: '#f8f6ee',
              overflow: 'hidden',
              position: 'relative',
              bgcolor: '#7b8476',
              backgroundImage: `
                radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
                linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
              `,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: { xs: -80, md: -120 },
                zIndex: 0,
                opacity: 0.22,
                pointerEvents: 'none',
                backgroundImage: `
                  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
                  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px)
                `,
                transform: 'rotate(-4deg)',
              },
            },
          },
          header: { sx: { display: 'none' } },
          section: { sx: { display: 'none' } },
          content: {
            variant: 'admin',
            sx: {
              zIndex: 1,
              minHeight: '100dvh',
              overflowY: 'auto',
              justifyContent: 'flex-start',
              p: { xs: 2, sm: 4 },
              '& > div': {
                my: 'auto',
                py: { xs: 1, sm: 2 },
                maxWidth: 480,
              },
              '& > div > .MuiStack-root': {
                gap: 3,
                height: 'auto',
                p: { xs: 3, sm: 4.5 },
                color: '#f8f6ee',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 3,
                backdropFilter: 'blur(14px)',
                bgcolor: 'rgba(42,55,54,0.72)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 32px 90px rgba(32,42,43,0.3)',
                '&::before': {
                  content: '""',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  position: 'absolute',
                  bgcolor: '#ead7a1',
                },
                '&::after': {
                  content: '""',
                  top: -100,
                  right: -100,
                  width: 220,
                  height: 220,
                  zIndex: -1,
                  position: 'absolute',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(234,215,161,0.18), transparent 70%)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(248,246,238,0.68)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#ead7a1',
              },
              '& .MuiOutlinedInput-root': {
                color: '#f8f6ee',
                bgcolor: 'rgba(255,255,255,0.06)',
                '& fieldset': { borderColor: 'rgba(248,246,238,0.28)' },
                '&:hover fieldset': { borderColor: 'rgba(248,246,238,0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#ead7a1' },
              },
              '& button[type="submit"]': {
                minHeight: 52,
                color: '#2a3736',
                fontWeight: 900,
                bgcolor: '#ead7a1',
                boxShadow: '0 12px 28px rgba(20,28,27,0.22)',
                '&:hover': { bgcolor: '#f2e3b8' },
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

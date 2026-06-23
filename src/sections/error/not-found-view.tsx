'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { SimpleLayout } from 'src/layouts/simple';
import { PageNotFoundIllustration } from 'src/assets/illustrations';

import { Logo } from 'src/components/logo';
import { varBounce, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

const ERROR_TEXT = '#f8f6ee';
const ERROR_DEEP = '#2a3736';
const ERROR_GOLD = '#ead7a1';
const ERROR_BG_TOP = '#6f8790';
const ERROR_BG_MIDDLE = '#7b8476';
const ERROR_BG_BOTTOM = '#8f7c5c';
const ERROR_MUTED = 'rgba(248,246,238,0.76)';
const ERROR_SHARED_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${ERROR_BG_TOP} 0%, ${ERROR_BG_MIDDLE} 54%, ${ERROR_BG_BOTTOM} 100%)
`;
const ERROR_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

// ----------------------------------------------------------------------

export function NotFoundView() {
  return (
    <SimpleLayout
      sx={{
        color: ERROR_TEXT,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: ERROR_BG_MIDDLE,
        backgroundImage: ERROR_SHARED_BACKGROUND,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: ERROR_POSTER_PATTERN,
          transform: 'rotate(-4deg)',
        },
      }}
      slotProps={{
        header: {
          sx: {
            color: ERROR_TEXT,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(42,55,54,0.18)',
            borderBottom: '1px solid rgba(255,255,255,0.14)',
          },
        },
        content: {
          compact: true,
          sx: {
            zIndex: 1,
            maxWidth: 720,
            position: 'relative',
          },
        },
      }}
    >
      <Container component={MotionContainer} sx={{ px: { xs: 0, sm: 2 } }}>
        <Stack
          spacing={3}
          alignItems="center"
          sx={{
            px: { xs: 2.5, md: 5 },
            py: { xs: 5, md: 6 },
            borderRadius: 2,
          }}
        >
          <Logo sx={{ width: 200, height: '100%' }} isSingle />

          <m.div variants={varBounce('in')}>
            <Typography
              variant="h3"
              sx={{
                color: ERROR_TEXT,
                fontWeight: 950,
                textShadow: '0 5px 22px rgba(32,42,43,0.36)',
              }}
            >
              Sorry, page not found!
            </Typography>
          </m.div>

          <m.div variants={varBounce('in')}>
            <Typography sx={{ color: ERROR_MUTED, maxWidth: 520, lineHeight: 1.75 }}>
              Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL?
              Be sure to check your spelling.
            </Typography>
          </m.div>

          <m.div variants={varBounce('in')}>
            <Box
              sx={{
                p: { xs: 1.5, md: 2 },
                borderRadius: 1.5,
              }}
            >
              <PageNotFoundIllustration sx={{ maxWidth: 360 }} />
            </Box>
          </m.div>

          <Button
            component={RouterLink}
            href="/"
            size="large"
            variant="contained"
            sx={{
              color: ERROR_DEEP,
              bgcolor: ERROR_GOLD,
              fontWeight: 900,
              '&:hover': { bgcolor: '#f3dfaa' },
            }}
          >
            Go to home
          </Button>
        </Stack>
      </Container>
    </SimpleLayout>
  );
}

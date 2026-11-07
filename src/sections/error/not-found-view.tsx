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

const ERROR_TEXT = '#202124';
const ERROR_DEEP = '#2a3736';
const ERROR_GOLD = '#ead7a1';
const ERROR_BG_MIDDLE = '#f7f7f5';
const ERROR_MUTED = 'rgba(248,246,238,0.76)';
const ERROR_SHARED_BACKGROUND = 'none';
const ERROR_POSTER_PATTERN = 'none';

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
                fontWeight: 600,
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
              fontWeight: 600,
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

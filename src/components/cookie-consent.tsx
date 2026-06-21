'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

const COOKIE_CONSENT_KEY = 'thch_cookie_consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(window.localStorage.getItem(COOKIE_CONSENT_KEY) !== 'accepted');
  }, []);

  const handleAccept = () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      sx={(theme) => ({
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: theme.zIndex.snackbar,
        position: 'fixed',
        mx: 'auto',
        maxWidth: 980,
        p: { xs: 2, md: 2.2 },
        color: theme.palette.grey[900],
        borderRadius: 2,
        bgcolor: alpha('#fffaf0', 0.96),
        border: `1px solid ${alpha('#b2865a', 0.26)}`,
        boxShadow: `0 18px 46px ${alpha(theme.palette.grey[900], 0.22)}`,
        backdropFilter: 'blur(10px)',
      })}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 15 }}>
            เว็บไซต์นี้ใช้คุกกี้เพื่อปรับปรุงประสบการณ์และวิเคราะห์การใช้งาน
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13, lineHeight: 1.6 }}>
            การใช้งานต่อหรือกด “ยอมรับ” หมายถึงคุณยอมรับการใช้คุกกี้ตาม{' '}
            <Link component={RouterLink} href={paths.privacyPolicy} sx={{ fontWeight: 900 }}>
              นโยบายความเป็นส่วนตัว
            </Link>{' '}
            และ{' '}
            <Link component={RouterLink} href={paths.termsAndConditions} sx={{ fontWeight: 900 }}>
              ข้อกำหนดและเงื่อนไข
            </Link>
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleAccept}
          sx={{
            px: 2.6,
            flexShrink: 0,
            fontWeight: 900,
            bgcolor: '#8f3d20',
            '&:hover': { bgcolor: '#783017' },
          }}
        >
          ยอมรับ
        </Button>
      </Stack>
    </Box>
  );
}

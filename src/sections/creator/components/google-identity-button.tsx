'use client';

import Script from 'next/script';
import { useRef, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

type GoogleCredentialResponse = { credential: string };

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onCredential: (credential: string) => void;
  onConfigError: (message: string) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard';
              theme?: 'outline';
              size?: 'large';
              text?: 'continue_with';
              shape?: 'rectangular';
              logo_alignment?: 'left';
              locale?: string;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function GoogleIdentityButton({
  disabled = false,
  loading = false,
  onCredential,
  onConfigError,
}: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const renderGoogleButton = useCallback(() => {
    if (!googleClientId) {
      onConfigError('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      return;
    }
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => onCredential(response.credential),
      auto_select: false,
    });
    buttonRef.current.replaceChildren();
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'th',
      width: Math.max(240, buttonRef.current.clientWidth),
    });
  }, [onConfigError, onCredential]);

  useEffect(() => {
    if (window.google) renderGoogleButton();
  }, [renderGoogleButton]);

  if (!googleClientId) {
    return (
      <Button size="large" variant="outlined" disabled fullWidth>
        ยังไม่ได้ตั้งค่า Google Client ID
      </Button>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client?hl=th"
        strategy="afterInteractive"
        onLoad={renderGoogleButton}
        onError={() => onConfigError('โหลดระบบเข้าสู่ระบบของ Google ไม่สำเร็จ')}
      />
      <Box
        sx={{
          minHeight: 50,
          width: 1,
          display: 'grid',
          placeItems: 'center',
          opacity: disabled || loading ? 0.5 : 1,
          pointerEvents: disabled || loading ? 'none' : 'auto',
          '& > div, & > div > div': { width: '100% !important' },
          '& iframe': { width: '100% !important', maxWidth: '100%' },
        }}
      >
        <Box ref={buttonRef} />
      </Box>
    </>
  );
}

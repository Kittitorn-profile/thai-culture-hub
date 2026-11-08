'use client';

import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import {
  readCookiePreference,
  saveCookiePreference,
  COOKIE_SETTINGS_EVENT,
  type CookiePreference,
  COOKIE_PREFERENCE_EVENT,
} from 'src/lib/cookie-preferences';

export function CookieSettingsButton() {
  return (
    <Button size="small" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>
      ตั้งค่าคุกกี้
    </Button>
  );
}
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  useEffect(() => {
    const sync = () => {
      const value = readCookiePreference();
      setAnalytics(value === 'all');
      setVisible(value === null);
    };
    const open = () => setVisible(true);
    sync();
    window.addEventListener(COOKIE_PREFERENCE_EVENT, sync);
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COOKIE_PREFERENCE_EVENT, sync);
      window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const choose = (value: CookiePreference) => {
    saveCookiePreference(value);
    setVisible(false);
  };
  return (
    <>
      {analytics && (
        <Analytics beforeSend={(event) => (readCookiePreference() === 'all' ? event : null)} />
      )}
      {visible && (
        <Box
          role="region"
          aria-label="ตัวเลือกคุกกี้"
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: (theme) => theme.zIndex.modal + 1,
            mx: 'auto',
            maxWidth: 980,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: 8,
            p: 2.5,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1">เลือกการใช้คุกกี้และข้อมูลการใช้งาน</Typography>
              <Typography variant="body2" color="text.secondary">
                เราใช้พื้นที่จัดเก็บที่จำเป็นสำหรับการเข้าสู่ระบบและจดจำการตั้งค่า
                ส่วนการวิเคราะห์การเข้าชมจะเริ่มเมื่อคุณเลือกยอมรับทั้งหมด อ่าน{' '}
                <Link href={paths.cookiePolicy}>นโยบายคุกกี้</Link> และ{' '}
                <Link href={paths.privacyPolicy}>นโยบายความเป็นส่วนตัว</Link> เปลี่ยนตัวเลือกได้จาก
                “ตั้งค่าคุกกี้” ที่ส่วนท้ายเว็บไซต์
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Button variant="outlined" onClick={() => choose('necessary')}>
                เฉพาะที่จำเป็น
              </Button>
              <Button variant="contained" onClick={() => choose('all')}>
                ยอมรับทั้งหมด
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </>
  );
}

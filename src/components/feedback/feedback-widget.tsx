'use client';

import type { FormEvent, ChangeEvent } from 'react';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { getAnalyticsBrowserIds } from 'src/components/analytics/track-event';

// ----------------------------------------------------------------------

type FeedbackForm = {
  name: string;
  contact: string;
  message: string;
};

const initialForm: FeedbackForm = {
  name: '',
  contact: '',
  message: '',
};

function getCurrentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
      setError('');
    }
  };

  const handleChange =
    (name: keyof FeedbackForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = form.message.trim();

    if (message.length < 3) {
      setError('กรุณาเขียนความคิดเห็นอย่างน้อย 3 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { visitorId, sessionId } = getAnalyticsBrowserIds();
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          message,
          visitorId,
          sessionId,
          path: getCurrentPath(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || 'ส่งความคิดเห็นไม่สำเร็จ');
      }

      toast.success('ส่งความคิดเห็นถึงผู้ดูแลแล้ว ขอบคุณมากครับ');
      setForm(initialForm);
      setOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ส่งความคิดเห็นไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (['/admin', '/auth', '/api'].some((privatePath) => pathname?.startsWith(privatePath))) {
    return null;
  }

  return (
    <>
      <Tooltip title="แสดงความคิดเห็น">
        <Fab
          color="primary"
          aria-label="แสดงความคิดเห็น"
          onClick={() => setOpen(true)}
          sx={{
            right: 24,
            bottom: 24,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            position: 'fixed',
            boxShadow: (theme) => theme.customShadows.primary,
          }}
        >
          <Iconify icon="solar:chat-round-dots-bold" width={26} />
        </Fab>
      </Tooltip>

      <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle sx={{ pr: 7 }}>
            แสดงความคิดเห็น
            <IconButton
              aria-label="ปิด"
              onClick={handleClose}
              sx={{ top: 12, right: 12, position: 'absolute' }}
            >
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Typography sx={{ color: 'text.secondary' }}>
                ส่งข้อเสนอแนะ ปัญหาที่พบ หรือสิ่งที่อยากให้ปรับปรุงไปยังผู้ดูแลเว็บไซต์
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                fullWidth
                label="ชื่อ"
                value={form.name}
                onChange={handleChange('name')}
                inputProps={{ maxLength: 120 }}
              />

              <TextField
                fullWidth
                label="ช่องทางติดต่อ"
                placeholder="อีเมล เบอร์โทร หรือ LINE"
                value={form.contact}
                onChange={handleChange('contact')}
                inputProps={{ maxLength: 180 }}
              />

              <TextField
                required
                fullWidth
                multiline
                minRows={4}
                label="ความคิดเห็น"
                value={form.message}
                onChange={handleChange('message')}
                inputProps={{ maxLength: 2000 }}
                helperText={`${form.message.length}/2000`}
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={handleClose} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={isSubmitting}>
              ส่งความคิดเห็น
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePathname } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Fab from '@mui/material/Fab';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, RHFTextField } from 'src/components/hook-form';
import { getAnalyticsBrowserIds } from 'src/components/analytics/track-event';

// ----------------------------------------------------------------------

const FeedbackSchema = z.object({
  name: z.string().max(120, { error: 'ชื่อยาวเกินไป' }),
  contact: z.string().max(180, { error: 'ช่องทางติดต่อยาวเกินไป' }),
  message: z
    .string()
    .trim()
    .min(3, { error: 'กรุณาเขียนความคิดเห็นอย่างน้อย 3 ตัวอักษร' })
    .max(2000, { error: 'ความคิดเห็นยาวเกินไป' }),
});

type FeedbackFormValues = z.infer<typeof FeedbackSchema>;

const initialForm: FeedbackFormValues = {
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
  const [error, setError] = useState('');

  const methods = useForm<FeedbackFormValues>({
    resolver: zodResolver(FeedbackSchema),
    defaultValues: initialForm,
  });

  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const messageLength = watch('message').length;

  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
      setError('');
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setError('');

    try {
      const { visitorId, sessionId } = getAnalyticsBrowserIds();
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
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
      reset(initialForm);
      setOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ส่งความคิดเห็นไม่สำเร็จ');
    }
  });

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
        <Form methods={methods} onSubmit={onSubmit}>
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

              <RHFTextField
                fullWidth
                name="name"
                label="ชื่อ"
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />

              <RHFTextField
                fullWidth
                name="contact"
                label="ช่องทางติดต่อ"
                placeholder="อีเมล เบอร์โทร หรือ LINE"
                slotProps={{ htmlInput: { maxLength: 180 } }}
              />

              <RHFTextField
                required
                fullWidth
                multiline
                minRows={4}
                name="message"
                label="ความคิดเห็น"
                slotProps={{ htmlInput: { maxLength: 2000 } }}
                helperText={`${messageLength}/2000`}
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
        </Form>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

import Fab from '@mui/material/Fab';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { ContactMessageForm } from 'src/sections/contact/contact-message-form';

// ----------------------------------------------------------------------

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

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
            bottom: { xs: 'calc(84px + env(safe-area-inset-bottom, 0px))', md: 24 },
            zIndex: (theme) => theme.zIndex.drawer + 1,
            position: 'fixed',
            boxShadow: (theme) => theme.customShadows.primary,
          }}
        >
          <Iconify icon="solar:chat-round-dots-bold" width={26} />
        </Fab>
      </Tooltip>

      <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
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
        <DialogContent sx={{ pb: 3 }}>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            ส่งข้อเสนอแนะ ปัญหาที่พบ หรือสิ่งที่อยากให้ปรับปรุงไปยังทีมงาน
          </Typography>
          <ContactMessageForm
            onSuccess={() => {
              toast.success('ส่งข้อความถึงทีมงานเรียบร้อยแล้ว');
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

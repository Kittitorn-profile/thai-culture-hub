'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiSendPlane2Line } from '@remixicon/react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Form, Field } from 'src/components/hook-form';
import { cultureUi } from 'src/theme/culture-ui';
import { ContactSchema, type ContactFormValues } from './contact-schema';

const initialFormValues: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  area: '',
  message: '',
};

export function ContactMessageForm({ onSuccess }: { onSuccess?: () => void }) {
  const methods = useForm<ContactFormValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: initialFormValues,
    mode: 'onBlur',
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const onSubmit = handleSubmit(
    async (data) => {
      setSubmitStatus(null);

      try {
        const response = await fetch('/api/contact-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true)
          throw new Error(result.message ?? 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่');

        reset(initialFormValues);
        setSubmitStatus({
          type: 'success',
          message: 'ส่งข้อความถึงทีมงานเรียบร้อยแล้ว',
        });
        onSuccess?.();
      } catch (error) {
        setSubmitStatus({
          type: 'error',
          message:
            error instanceof Error && error.message
              ? `ส่งไม่สำเร็จ: ${error.message}`
              : 'ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        });
      }
    },
    () => setSubmitStatus(null)
  );

  return (
    <Box sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>
      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Field.Text
              required
              fullWidth
              name="name"
              autoComplete="name"
              label="ชื่อ / หน่วยงาน"
              disabled={isSubmitting}
            />
            <Field.Text
              required
              fullWidth
              name="email"
              label="อีเมล"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </Box>
          <Field.Text
            fullWidth
            name="phone"
            label="เบอร์โทร (ถ้ามี)"
            type="tel"
            autoComplete="tel"
            disabled={isSubmitting}
          />
          <Field.Text
            fullWidth
            name="area"
            label="จังหวัดหรือพื้นที่ (ถ้ามี)"
            disabled={isSubmitting}
          />
          <Field.Text
            required
            fullWidth
            name="message"
            label="ข้อความ"
            placeholder="บอกเรื่องที่อยากให้ทีมงานช่วย พร้อมลิงก์หรือแหล่งอ้างอิงถ้ามี"
            multiline
            rows={4}
            disabled={isSubmitting}
          />
        </Stack>
        {submitStatus && (
          <Alert severity={submitStatus.type} sx={{ mt: 2 }}>
            {submitStatus.message}
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mt: 3 }}
        >
          <Typography sx={{ color: cultureUi.muted, fontSize: 12 }}>
            ใช้ข้อมูลติดต่อเพื่อการตอบกลับข้อความนี้
          </Typography>
          <Button
            type="submit"
            variant="contained"
            loading={isSubmitting}
            endIcon={<RiSendPlane2Line size={17} />}
            sx={{
              flexShrink: 0,
              px: 2.5,
              py: 1.2,
              bgcolor: '#252d31',
              color: '#fff',
              '&:hover': { bgcolor: '#3d484e' },
            }}
          >
            ส่งข้อความ
          </Button>
        </Stack>
      </Form>
    </Box>
  );
}

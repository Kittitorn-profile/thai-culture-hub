'use client';

import { useState } from 'react';
import emailjs from '@emailjs/browser';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { HomeFooter } from 'src/layouts/main/footer';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const tone = {
  text: '#f8f6ee',
  deep: '#2a3736',
  muted: 'rgba(248,246,238,0.76)',
  subtle: 'rgba(248,246,238,0.58)',
  gold: '#ead7a1',
  top: '#6f8790',
  middle: '#7b8476',
  bottom: '#8f7c5c',
};

const pageBackground = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${tone.top} 0%, ${tone.middle} 54%, ${tone.bottom} 100%)
`;

const posterPattern = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

const contactItems = [
  // {
  //   icon: 'solar:letter-bold',
  //   label: 'อีเมล',
  //   value: 'codeforcat.official@gmail.com',
  // },
  {
    icon: 'solar:notebook-bold-duotone',
    label: 'เรื่องข้อมูล',
    value: 'แจ้งแก้ไข เพิ่มแหล่งข้อมูล หรือเสนอชุดข้อมูลใหม่',
  },
  {
    icon: 'solar:flag-bold',
    label: 'พื้นที่ครอบคลุม',
    value: 'ข้อมูลวัฒนธรรมและสถานที่รายจังหวัดทั่วประเทศไทย',
  },
  {
    icon: 'solar:list-bold',
    label: 'การใช้งาน',
    value: 'รับข้อเสนอแนะเรื่องแผนที่ ตัวกรอง และรายละเอียดรายการ',
  },
] as const;

const reportExamples = [
  'พิกัดหรืออำเภอของรายการไม่ตรงกับพื้นที่จริง',
  'ชื่อสถานที่ ประเพณี หรือหมวดวัฒนธรรมควรปรับแก้',
  'มีแหล่งข้อมูลวัฒนธรรมเพิ่มเติมที่ควรนำเข้าระบบ',
] as const;

const initialFormValues = {
  name: '',
  contact: '',
  area: '',
  message: '',
};

const emailJsConfig = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? '',
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? '',
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? '',
};

export function ContactView() {
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isEmailJsConfigured = Boolean(
    emailJsConfig.serviceId && emailJsConfig.templateId && emailJsConfig.publicKey
  );

  const handleFieldChange =
    (field: keyof typeof initialFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus(null);

    if (!isEmailJsConfigured) {
      setSubmitStatus({
        type: 'error',
        message: 'ยังไม่ได้ตั้งค่า EmailJS ใน environment variables',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await emailjs.send(
        emailJsConfig.serviceId,
        emailJsConfig.templateId,
        {
          from_name: formValues.name,
          reply_to: formValues.contact,
          contact: formValues.contact,
          area: formValues.area,
          message: formValues.message,
          submitted_at: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
          source: 'Thai Culture Hub contact form',
        },
        { publicKey: emailJsConfig.publicKey }
      );

      setFormValues(initialFormValues);
      setSubmitStatus({
        type: 'success',
        message: 'ส่งข้อมูลเรียบร้อยแล้ว ขอบคุณสำหรับการช่วยปรับปรุงข้อมูลวัฒนธรรมไทย',
      });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message:
          error instanceof Error && error.message
            ? `ส่งไม่สำเร็จ: ${error.message}`
            : 'ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        px: { xs: 1.5, md: '5%' },
        py: { xs: 2, md: '5%' },
        minHeight: '100vh',
        color: tone.text,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: tone.middle,
        backgroundImage: pageBackground,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: posterPattern,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          zIndex: 1,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 1.5, md: 2 },
          backdropFilter: 'blur(3px)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2.25, md: 5 },
            py: { xs: 2.25, md: 10 },

            backgroundSize: { xs: '72px 72px', md: '120px 120px' },
          }}
        >
          <Box sx={{ mx: 'auto', maxWidth: 1040 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 5, md: 7 }}
              alignItems="stretch"
              sx={{ mt: { xs: 7, md: 9 } }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    px: 1.4,
                    py: 0.6,
                    width: 'fit-content',
                    color: tone.text,
                    borderRadius: 999,
                    bgcolor: 'rgba(42,55,54,0.28)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Contact Thai Culture Hub
                </Typography>

                <Typography
                  component="h3"
                  sx={{
                    mt: 2,
                    color: tone.text,
                    maxWidth: 560,
                    fontSize: { xs: 32, sm: 48, md: 60 },
                    fontWeight: 950,
                    lineHeight: 0.98,
                    textShadow: '0 5px 22px rgba(32,42,43,0.36)',
                  }}
                >
                  ติดต่อเรื่องข้อมูลและข้อเสนอแนะ
                </Typography>

                <Typography
                  sx={{
                    mt: 2.5,
                    color: tone.muted,
                    maxWidth: 520,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  หากพบข้อมูลคลาดเคลื่อน พิกัดไม่ตรง ชื่ออำเภอไม่ถูกต้อง
                  หรือมีแหล่งข้อมูลวัฒนธรรมที่อยากแนะนำ สามารถส่งรายละเอียดให้เราตรวจสอบต่อได้
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 4 }}>
                  {contactItems.map((item) => (
                    <Stack
                      key={item.label}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        p: 1.6,
                        maxWidth: 440,
                        borderRadius: 1,
                        bgcolor: 'rgba(42,55,54,0.28)',
                        border: '1px solid rgba(255,255,255,0.24)',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          display: 'grid',
                          flexShrink: 0,
                          borderRadius: '50%',
                          placeItems: 'center',
                          color: tone.deep,
                          bgcolor: tone.gold,
                        }}
                      >
                        <Iconify icon={item.icon} width={18} />
                      </Box>
                      <Box>
                        <Typography sx={{ color: tone.subtle, fontSize: 12, fontWeight: 800 }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ color: tone.text, fontSize: 14, fontWeight: 900 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  flex: 1,
                  p: { xs: 2.5, md: 4 },
                  borderRadius: 1,
                  bgcolor: 'rgba(248,246,238,0.9)',
                  border: '1px solid rgba(255,255,255,0.44)',
                  boxShadow: '0 24px 70px rgba(31,42,41,0.24)',
                }}
              >
                <Typography sx={{ color: tone.deep, fontSize: 28, fontWeight: 950 }}>
                  ส่งข้อมูลให้ทีมตรวจสอบ
                </Typography>
                <Typography
                  sx={{ mt: 1, color: 'rgba(42,55,54,0.74)', fontSize: 13, lineHeight: 1.7 }}
                >
                  ระบุจังหวัด รายการที่พบ และแหล่งอ้างอิงถ้ามี
                  เพื่อให้เราตรวจสอบและปรับปรุงข้อมูลได้เร็วขึ้น
                </Typography>

                <Stack spacing={1} sx={{ mt: 2.5 }}>
                  {reportExamples.map((item) => (
                    <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                      <Iconify
                        icon="solar:check-circle-bold"
                        width={17}
                        sx={{ mt: 0.25, color: tone.deep }}
                      />
                      <Typography sx={{ color: 'rgba(42,55,54,0.74)', fontSize: 13 }}>
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Stack spacing={2} sx={{ mt: 3 }}>
                  <TextField
                    required
                    fullWidth
                    name="name"
                    label="ชื่อของคุณ / หน่วยงาน"
                    value={formValues.name}
                    onChange={handleFieldChange('name')}
                    sx={fieldSx}
                  />
                  <TextField
                    required
                    fullWidth
                    name="contact"
                    label="อีเมล / เบอร์โทร"
                    value={formValues.contact}
                    onChange={handleFieldChange('contact')}
                    sx={fieldSx}
                  />
                  <TextField
                    required
                    fullWidth
                    name="area"
                    label="จังหวัดหรือพื้นที่ที่เกี่ยวข้อง"
                    value={formValues.area}
                    onChange={handleFieldChange('area')}
                    sx={fieldSx}
                  />
                  <TextField
                    required
                    fullWidth
                    name="message"
                    label="รายละเอียดข้อมูลหรือข้อเสนอแนะ"
                    multiline
                    rows={5}
                    value={formValues.message}
                    onChange={handleFieldChange('message')}
                    sx={fieldSx}
                  />
                </Stack>

                {submitStatus && (
                  <Alert severity={submitStatus.type} sx={{ mt: 2 }}>
                    {submitStatus.message}
                  </Alert>
                )}

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    mt: 3,
                    py: 1.2,
                    color: tone.deep,
                    borderRadius: 999,
                    bgcolor: tone.gold,
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: '0 14px 28px rgba(80,63,13,0.2)',
                    '&:hover': { bgcolor: '#f2dfaa', boxShadow: '0 16px 32px rgba(80,63,13,0.24)' },
                  }}
                >
                  {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลให้ตรวจสอบ'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      <HomeFooter />
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#000',
    bgcolor: 'rgba(255,255,255,0.72)',
    borderRadius: 1,
    '& fieldset': { borderColor: 'rgba(42,55,54,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(42,55,54,0.34)' },
    '&.Mui-focused fieldset': { borderColor: tone.deep },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(42,55,54,0.64)',
    '&.Mui-focused': { color: tone.deep },
  },
};

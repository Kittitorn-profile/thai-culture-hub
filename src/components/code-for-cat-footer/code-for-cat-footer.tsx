'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Image } from 'src/components/image';

// ----------------------------------------------------------------------

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'เว็บไซต์', href: '/#services' },
      { label: 'แอปพลิเคชัน', href: '/#services' },
      { label: 'ระบบหลังบ้าน', href: '/#services' },
      { label: 'ราคา', href: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'เกี่ยวกับเรา', href: '/about-us' },
      { label: 'ผลงาน', href: '/#clients' },
      { label: 'ติดต่อ', href: '/contact-us' },
      { label: 'ขั้นตอนทำงาน', href: '/#workflow' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'คู่มือเริ่มต้น', href: '/#workflow' },
      { label: 'คำถามที่พบบ่อย', href: '/#pricing' },
      { label: 'ดูแลเว็บไซต์', href: '/#services' },
    ],
  },
];

const tone = {
  ink: '#171717',
  muted: '#6f6a62',
  subtle: '#8d887f',
  frame: '#f4f2ee',
};

export function CodeForCatFooter() {
  return (
    <Box
      component="footer"
      sx={{
        px: { xs: 2.25, md: 7 },
        pt: { xs: 6, md: 8 },
        pb: 3,
        bgcolor: tone.frame,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          width: 1,
          maxWidth: 1040,
          display: 'grid',
          gap: { xs: 4, md: 8 },
          gridTemplateColumns: { xs: '1fr', md: '1.2fr repeat(3, 1fr)' },
        }}
      >
        <Box>
          <Stack spacing={1} alignItems="start">
            <Image
              src="/assets/code-for-cat/face.png"
              alt="Code for Cat logo"
              ratio="1/1"
              sx={{ width: { xs: 80, md: 60 }, height: { xs: 80, md: 60 } }}
            />
            <Typography sx={{ color: tone.ink, fontSize: 18, fontWeight: 950 }}>
              Code for Cat
            </Typography>
          </Stack>
          <Typography sx={{ mt: 1.4, color: tone.muted, maxWidth: 250, fontSize: 14 }}>
            รับทำเว็บไซต์ แอปพลิเคชัน และระบบหลังบ้านสำหรับธุรกิจที่อยากเริ่มต้นอย่างมืออาชีพ
          </Typography>
        </Box>

        {footerColumns.map((column) => (
          <Box key={column.title}>
            <Typography sx={{ color: tone.ink, fontSize: 14, fontWeight: 950 }}>
              {column.title}
            </Typography>
            <Stack spacing={0.8} sx={{ mt: 1.3 }}>
              {column.links.map((link) => (
                <Typography
                  key={link.label}
                  component="a"
                  href={link.href}
                  sx={{
                    color: tone.muted,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                    '&:hover': { color: tone.ink },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>

      <Typography sx={{ mx: 'auto', mt: 6, maxWidth: 1040, color: tone.subtle, fontSize: 11 }}>
        © 2026 Code for Cat. All rights reserved.
      </Typography>
    </Box>
  );
}

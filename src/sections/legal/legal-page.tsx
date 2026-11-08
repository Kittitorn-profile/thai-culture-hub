import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CookieSettingsButton } from 'src/components/cookie-consent';

const POLICIES = [
  { title: 'เงื่อนไขการใช้งาน', href: paths.termsAndConditions },
  { title: 'นโยบายความเป็นส่วนตัว', href: paths.privacyPolicy },
  { title: 'นโยบายคุกกี้', href: paths.cookiePolicy },
];
type Props = {
  title: string;
  intro: string;
  sections: { title: string; body: string }[];
  cookies?: boolean;
};
export function LegalPage({ title, intro, sections, cookies }: Props) {
  return (
    <Box component="article" sx={{ bgcolor: '#f7f7f5', color: '#25382f', py: { xs: 3, md: 5 } }}>
      <Container maxWidth={false} sx={{ maxWidth: 1408, px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
        <Link href="/" color="text.secondary" underline="hover" sx={{ fontSize: 13 }}>
          ← กลับหน้าแรก
        </Link>
        <Box component="header" sx={{ mt: 3, mb: 3, maxWidth: 800 }}>
          <Typography variant="overline" sx={{ color: '#586d60', letterSpacing: 1 }}>
            ข้อมูลและนโยบายเว็บไซต์
          </Typography>
          <Typography
            component="h1"
            sx={{
              mt: 1,
              fontSize: { xs: 28, sm: 36, md: 42 },
              fontWeight: 600,
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ปรับปรุงล่าสุด 9 พฤศจิกายน 2569
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 2, lineHeight: 1.85, fontSize: { xs: 14, md: 15 } }}
          >
            {intro}
          </Typography>
        </Box>
        <Stack
          component="nav"
          aria-label="นโยบายเว็บไซต์"
          direction="row"
          spacing={1}
          sx={{ overflowX: 'auto', pb: 2, mb: { xs: 2, md: 3 }, borderBottom: '1px solid #dde3db' }}
        >
          {POLICIES.map((policy) => {
            const active = policy.title === title;
            return (
              <Link
                key={policy.href}
                href={policy.href}
                aria-current={active ? 'page' : undefined}
                underline="none"
                sx={{
                  display: 'block',
                  flexShrink: 0,
                  px: 2,
                  py: 1.2,
                  borderRadius: 1.5,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : '#46574c',
                  bgcolor: active ? '#2c4036' : '#e9ede6',
                  '&:hover': { bgcolor: active ? '#354d41' : '#dfe6dc' },
                  '&:focus-visible': { outline: '2px solid #586d60', outlineOffset: 3 },
                }}
              >
                {policy.title}
              </Link>
            );
          })}
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '240px minmax(0, 1fr)' },
            gap: { xs: 2.5, md: 4 },
            alignItems: 'start',
          }}
        >
          <Box
            component="aside"
            sx={{
              position: { md: 'sticky' },
              top: { md: 112 },
              p: 2.5,
              bgcolor: '#eef2eb',
              border: '1px solid #dfe6da',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              เนื้อหาในหน้านี้
            </Typography>
            <Stack component="nav" aria-label="สารบัญ" spacing={0.5}>
              {sections.map((section, index) => (
                <Link
                  key={section.title}
                  href={`#policy-section-${index + 1}`}
                  underline="hover"
                  color="inherit"
                  sx={{ display: 'block', py: 0.65, fontSize: 13, lineHeight: 1.65 }}
                >
                  {index + 1}. {section.title}
                </Link>
              ))}
            </Stack>
            {cookies && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #d9e2d4' }}>
                <CookieSettingsButton />
              </Box>
            )}
          </Box>
          <Box
            sx={{
              minWidth: 0,
              border: '1px solid #e1e5df',
              bgcolor: '#fff',
              borderRadius: 2.5,
              px: { xs: 2.5, sm: 4 },
              py: { xs: 3, sm: 4 },
            }}
          >
            <Stack spacing={3} divider={<Box sx={{ borderTop: '1px solid #edf0ea' }} />}>
              {sections.map((section, index) => (
                <Box
                  component="section"
                  id={`policy-section-${index + 1}`}
                  aria-labelledby={`policy-heading-${index + 1}`}
                  key={section.title}
                  sx={{ scrollMarginTop: 120 }}
                >
                  <Typography
                    component="h2"
                    id={`policy-heading-${index + 1}`}
                    sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 600, lineHeight: 1.6 }}
                  >
                    {index + 1}. {section.title}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 1.25,
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.95,
                      whiteSpace: 'pre-line',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {section.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Box sx={{ mt: 4, p: 2.5, borderRadius: 1.5, bgcolor: '#f3f5f0' }}>
              <Typography variant="subtitle2">
                ต้องการสอบถามหรือแจ้งเรื่องเกี่ยวกับข้อมูล?
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, lineHeight: 1.85 }}
              >
                ติดต่อเกี่ยวกับข้อมูล สิทธิ หรือเนื้อหาบนเว็บไซต์ได้ที่{' '}
                <Link href={paths.contact} color="inherit">
                  หน้าติดต่อเรา
                </Link>{' '}
                โดยระบุหน้าหรือรายการที่เกี่ยวข้อง
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

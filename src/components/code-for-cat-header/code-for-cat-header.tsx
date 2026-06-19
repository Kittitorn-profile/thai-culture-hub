'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Image } from 'src/components/image';

// ----------------------------------------------------------------------

const navItems = [
  { label: 'หน้าแรก', href: '/' },
  { label: 'เกี่ยวกับเรา', href: '/about-us' },
  { label: 'บริการ', href: '/#services' },
  { label: 'ผลงาน', href: '/#clients' },
  { label: 'ราคา', href: '/#pricing' },
  { label: 'ติดต่อ', href: '/contact-us' },
];

const tone = {
  ink: '#171717',
  surface: '#fbfaf7',
  soft: '#ece8e1',
  line: '#ded9cf',
};

type CodeForCatHeaderProps = {
  activeHref?: string;
  sticky?: boolean;
};

const sectionNavItems = navItems.filter((item) => item.href.startsWith('/#'));

export function CodeForCatHeader({ activeHref, sticky = false }: CodeForCatHeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [detectedHref, setDetectedHref] = useState('/');
  const isPinned = sticky && isScrolled;
  const currentHref = activeHref ?? detectedHref;

  useEffect(() => {
    if (!sticky) {
      return undefined;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sticky]);

  useEffect(() => {
    if (activeHref) {
      return undefined;
    }

    const handleActiveSection = () => {
      if (pathname !== '/') {
        setDetectedHref(pathname);
        return;
      }

      let nextHref = '/';
      const activationOffset = 170;

      sectionNavItems.forEach((item) => {
        const sectionId = item.href.replace('/#', '');
        const section = document.getElementById(sectionId);

        if (section && section.getBoundingClientRect().top <= activationOffset) {
          nextHref = item.href;
        }
      });

      setDetectedHref(nextHref);
    };

    handleActiveSection();
    window.addEventListener('scroll', handleActiveSection, { passive: true });
    window.addEventListener('resize', handleActiveSection);
    window.addEventListener('hashchange', handleActiveSection);

    return () => {
      window.removeEventListener('scroll', handleActiveSection);
      window.removeEventListener('resize', handleActiveSection);
      window.removeEventListener('hashchange', handleActiveSection);
    };
  }, [activeHref, pathname]);

  return (
    <Box
      sx={{
        minHeight: sticky ? { xs: 88, md: 60 } : 'auto',
      }}
    >
      <Box
        sx={{
          top: isPinned ? { xs: 10, md: 18 } : 'auto',
          left: isPinned ? '50%' : 'auto',
          zIndex: isPinned ? 20 : 'auto',
          mx: 'auto',
          py: 2,
          px: 2,
          width: isPinned
            ? { xs: 'calc(100% - 70px)', md: 'min(1200px, calc(100% - 10% - 16px))' }
            : 1,
          maxWidth: 1200,
          position: isPinned ? 'fixed' : 'relative',
          transform: isPinned ? 'translateX(-50%)' : 'none',
          borderRadius: { xs: 3, md: 999 },
          bgcolor: 'rgba(251,250,247,0.88)',
          border: `1px solid ${tone.line}`,
          boxShadow: '0 12px 34px rgba(46,42,36,0.08)',
          backdropFilter: 'blur(12px)',
          transition: 'width 160ms ease, transform 160ms ease, top 160ms ease',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={{ xs: 1.5, md: 4 }}
        >
          <Stack
            component="a"
            href="/"
            direction="row"
            alignItems="center"
            sx={{ flexShrink: 0, textDecoration: 'none' }}
          >
            <Image
              src="/assets/code-for-cat/face.png"
              alt="Code for Cat logo"
              ratio="1/1"
              sx={{ width: { xs: 32, md: 48 }, height: { xs: 32, md: 48 } }}
            />
            <Typography
              sx={{
                pl: 1,
                color: tone.ink,
                minWidth: 0,
                flexShrink: 0,
                fontSize: { xs: 14, sm: 18 },
                fontWeight: 950,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
              }}
            >
              CODE FOR CAT
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{ display: { xs: 'none', md: 'flex' }, color: tone.ink }}
          >
            {navItems.map((item) => {
              const active = item.href === currentHref;

              return (
                <Typography
                  key={item.href}
                  component="a"
                  href={item.href}
                  sx={{
                    pb: 0.6,
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 800,
                    textDecoration: 'none',
                    borderBottom: active ? `2px solid ${tone.ink}` : '2px solid transparent',
                  }}
                >
                  {item.label}
                </Typography>
              );
            })}
          </Stack>

          <Button
            href="/#pricing"
            variant="contained"
            sx={{
              px: 2.2,
              py: 1,
              display: { xs: 'none', sm: 'inline-flex' },
              color: '#fff',
              minWidth: 0,
              borderRadius: 999,
              bgcolor: tone.ink,
              fontSize: 12,
              fontWeight: 800,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#000', boxShadow: 'none' },
            }}
          >
            ดูแพ็กเกจ
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            mt: 1,
            px: 0.5,
            pb: 0.2,
            display: { xs: 'flex', md: 'none' },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {navItems.map((item) => {
            const active = item.href === currentHref;

            return (
              <Box
                key={item.href}
                component="a"
                href={item.href}
                sx={{
                  px: 1.4,
                  py: 0.8,
                  color: active ? '#fff' : tone.ink,
                  flexShrink: 0,
                  borderRadius: 999,
                  bgcolor: active ? tone.ink : tone.soft,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

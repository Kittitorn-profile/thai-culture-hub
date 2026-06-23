import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Image } from 'src/components/image';
import { Markdown } from 'src/components/markdown';
import { Iconify } from 'src/components/iconify';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

type Props = {
  params: Promise<{ slug: string }>;
};

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string | null;
  category_label: string | null;
  published_at: string | null;
  updated_at: string;
  creator_profiles?: { display_name?: string | null; email?: string | null } | null;
};

const PAGE_TEXT = '#f8f6ee';
const PAGE_DEEP = '#2a3736';
const SECTION_PX = { xs: 2.5, sm: 4, md: 6, lg: 8 };

async function getArticle(slug: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return null;
  }

  const { data, error } = await supabase.client
    .from('creator_articles')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      cover_image_url,
      content_html,
      category_label,
      published_at,
      updated_at,
      creator_profiles(display_name, email)
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ArticleRow;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));

  if (!article) {
    return { title: 'Creator story' };
  }

  return {
    title: `${article.title} | Thailand Cultural Hub`,
    description: article.excerpt ?? undefined,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));

  if (!article) {
    notFound();
  }

  const publishedAt = article.published_at || article.updated_at;
  const creatorName =
    article.creator_profiles?.display_name || article.creator_profiles?.email || 'Creator';

  return (
    <Box
      component="main"
      sx={{
        px: SECTION_PX,
        py: { xs: 9, md: 12 },
        minHeight: '100vh',
        color: PAGE_TEXT,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          opacity: 0.18,
          pointerEvents: 'none',
          backgroundImage: `
            repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
            repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px)
          `,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Stack spacing={4} sx={{ mx: 'auto', maxWidth: 960, position: 'relative', zIndex: 1 }}>
        <Button
          component={RouterLink}
          href="/"
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ alignSelf: 'flex-start' }}
        >
          กลับหน้าแรก
        </Button>

        <Stack spacing={2.25}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Chip
              label={article.category_label || 'บทความ'}
              sx={{
                color: PAGE_DEEP,
                fontWeight: 800,
                bgcolor: 'rgba(234,215,161,0.86)',
              }}
            />
            <Typography sx={{ color: 'rgba(248,246,238,0.72)', fontSize: 13 }}>
              {fDate(publishedAt)} · โดย {creatorName}
            </Typography>
          </Stack>

          <Typography
            component="h1"
            sx={{
              color: PAGE_TEXT,
              fontSize: { xs: 38, md: 64 },
              fontWeight: 950,
              lineHeight: 1.08,
            }}
          >
            {article.title}
          </Typography>

          {article.excerpt && (
            <Typography sx={{ maxWidth: 760, color: 'rgba(248,246,238,0.78)', fontSize: 18, lineHeight: 1.75 }}>
              {article.excerpt}
            </Typography>
          )}
        </Stack>

        {article.cover_image_url && (
          <Box
            sx={{
              overflow: 'hidden',
              borderRadius: 1.5,
              border: '1px solid rgba(248,246,238,0.24)',
              boxShadow: '0 26px 72px rgba(32,42,43,0.24)',
            }}
          >
            <Image
              src={article.cover_image_url}
              alt={article.title}
              ratio="16/9"
              visibleByDefault
              disablePlaceholder
              sx={{ '& img': { objectFit: 'cover' } }}
            />
          </Box>
        )}

        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 1.5,
            color: PAGE_DEEP,
            bgcolor: 'rgba(250,244,232,0.96)',
            border: '1px solid rgba(255,255,255,0.62)',
            boxShadow: '0 24px 70px rgba(32,42,43,0.18)',
          }}
        >
          <Markdown sx={{ color: 'inherit' }}>{article.content_html ?? ''}</Markdown>
        </Box>
      </Stack>
    </Box>
  );
}

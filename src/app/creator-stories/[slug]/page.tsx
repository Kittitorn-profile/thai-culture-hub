import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';

import { CreatorArticleEngagement } from 'src/sections/creator/components/creator-article-engagement';

type Props = {
  params: Promise<{ slug: string }>;
};

type ArticleRow = {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string | null;
  category_label: string | null;
  published_at: string | null;
  is_active?: boolean | null;
  updated_at: string;
  creator_profiles?: {
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
};

const PAGE_TEXT = '#f8f6ee';
const PAGE_DEEP = '#2a3736';
const SECTION_PX = { xs: 2.5, sm: 4, md: 6, lg: 8 };
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';
const OG_FALLBACK_IMAGE = `${SITE_URL}/assets/th-hub/logo-th-hub.png`;

function getAbsoluteUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

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
      creator_id,
      title,
      slug,
      excerpt,
      cover_image_url,
      content_html,
      category_label,
      published_at,
      is_active,
      updated_at,
      creator_profiles(display_name, email, avatar_url)
    `
    )
    .eq('slug', slug)
    .in('status', ['published', 'approved'])
    .eq('is_active', true)
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

  const shareUrl = `${SITE_URL}/creator-stories/${encodeURIComponent(article.slug || article.id)}`;
  const imageUrl = getAbsoluteUrl(article.cover_image_url) ?? OG_FALLBACK_IMAGE;
  const description = article.excerpt ?? undefined;

  return {
    title: `${article.title} | Thailand Cultural Hub`,
    description,
    openGraph: {
      type: 'article',
      url: shareUrl,
      title: article.title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [imageUrl],
    },
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
  const creatorAvatarUrl = article.creator_profiles?.avatar_url ?? '';
  const sharePath = `/creator-stories/${encodeURIComponent(article.slug || article.id)}`;
  const creatorHref = `/creator-stories/creator/${encodeURIComponent(article.creator_id)}`;

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
          href="/"
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ alignSelf: 'flex-start' }}
        >
          กลับหน้าแรก
        </Button>

        <Box
          sx={{
            borderRadius: 1.5,
            color: PAGE_DEEP,
            bgcolor: 'rgba(250,244,232,0.96)',
            border: '1px solid rgba(255,255,255,0.62)',
            boxShadow: '0 24px 70px rgba(32,42,43,0.18)',
            overflow: 'hidden',
          }}
        >
          <Stack spacing={2.25} sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
              <Stack
                component="a"
                href={creatorHref}
                direction="row"
                spacing={1.2}
                alignItems="center"
                sx={{
                  minWidth: 0,
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover .creator-name': {
                    color: '#7b5a31',
                  },
                }}
              >
                <Avatar
                  src={creatorAvatarUrl || undefined}
                  alt={creatorName}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'rgba(123,132,118,0.32)',
                    color: PAGE_DEEP,
                    fontWeight: 900,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    className="creator-name"
                    sx={{ color: '#3b2f24', fontSize: 15, fontWeight: 950 }}
                    noWrap
                  >
                    {creatorName}
                  </Typography>
                  <Typography sx={{ color: 'rgba(75,53,35,0.58)', fontSize: 12 }}>
                    {fDate(publishedAt)} · Creator
                  </Typography>
                </Box>
              </Stack>

              <Chip
                label={article.category_label || 'บทความ'}
                sx={{
                  flexShrink: 0,
                  color: '#4b3523',
                  fontWeight: 900,
                  bgcolor: 'rgba(234,215,161,0.7)',
                }}
              />
            </Stack>

            <Box>
              <Typography
                component="h1"
                sx={{
                  color: '#3b2f24',
                  fontSize: { xs: 30, md: 42 },
                  fontWeight: 950,
                  lineHeight: 1.18,
                }}
              >
                {article.title}
              </Typography>

              {article.excerpt && (
                <Typography
                  sx={{
                    mt: 1.2,
                    color: 'rgba(75,53,35,0.74)',
                    fontSize: { xs: 16, md: 18 },
                    lineHeight: 1.75,
                  }}
                >
                  {article.excerpt}
                </Typography>
              )}
            </Box>
          </Stack>

          {article.cover_image_url && (
            <Box
              sx={{
                overflow: 'hidden',
                borderTop: '1px solid rgba(75,53,35,0.08)',
                borderBottom: '1px solid rgba(75,53,35,0.08)',
                bgcolor: 'rgba(42,55,54,0.12)',
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

          <Stack
            spacing={1.5}
            sx={{
              px: { xs: 2, sm: 2.5, md: 3 },
              py: 1.75,
              borderBottom: '1px solid rgba(75,53,35,0.1)',
            }}
          >
            <CreatorArticleEngagement
              articleId={article.id}
              shareTitle={article.title}
              shareUrl={sharePath}
              recordView
            />
          </Stack>

          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            <Markdown sx={{ color: 'inherit' }}>{article.content_html ?? ''}</Markdown>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

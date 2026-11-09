import type { Metadata } from 'next';

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | Thailand Cultural Hub`;
  const image =
    'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: 'Thailand Cultural Hub',
      locale: 'th_TH',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [image] },
  };
}

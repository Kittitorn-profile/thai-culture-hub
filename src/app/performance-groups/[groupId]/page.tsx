import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getPublishedPerformanceGroup } from 'src/server/performance-groups';

import { PerformanceGroupDetailView } from 'src/sections/performance-groups/view/performance-group-detail-view';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';
const FALLBACK_IMAGE =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';

type Props = {
  params: Promise<{ groupId: string }>;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function absoluteUrl(value?: string) {
  if (!value) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;

  return new URL(value, SITE_URL).toString();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId: encodedGroupId } = await params;
  const groupId = safeDecode(encodedGroupId);
  const group = await getPublishedPerformanceGroup(groupId);

  if (!group) {
    return {
      title: 'ไม่พบข้อมูลวง | Thailand Cultural Hub',
      robots: { index: false, follow: false },
    };
  }

  const title = `${group.name} | ${group.category} | Thailand Cultural Hub`;
  const description = (
    group.description ||
    `ข้อมูล${group.name} ${group.category}${group.provinceName ? ` จังหวัด${group.provinceName}` : ''}`
  ).slice(0, 220);
  const url = `${SITE_URL}/performance-groups/${encodeURIComponent(groupId)}/`;
  const image = absoluteUrl(group.coverImageUrl || group.logoUrl);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [
      group.name,
      group.category,
      group.provinceName,
      'วงศิลปินไทย',
      'วงดนตรีไทย',
      'วัฒนธรรมไทย',
    ].filter((keyword): keyword is string => Boolean(keyword)),
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Thailand Cultural Hub',
      locale: 'th_TH',
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: group.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function Page({ params }: Props) {
  const { groupId: encodedGroupId } = await params;
  const groupId = safeDecode(encodedGroupId);
  const group = await getPublishedPerformanceGroup(groupId);

  if (!group) {
    notFound();
  }

  const url = `${SITE_URL}/performance-groups/${encodeURIComponent(groupId)}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: group.name,
    description: group.description,
    url,
    image: absoluteUrl(group.coverImageUrl || group.logoUrl),
    genre: group.category,
    location: group.provinceName
      ? { '@type': 'Place', name: `จังหวัด${group.provinceName}` }
      : undefined,
    member: group.personnel.map((person) => ({
      '@type': 'Person',
      name: person.fullName,
      alternateName: person.nickname || undefined,
      jobTitle: person.role || undefined,
      image: person.imageUrl ? absoluteUrl(person.imageUrl) : undefined,
    })),
    sameAs: [group.facebookUrl, group.youtubeUrl, group.lineUrl].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <PerformanceGroupDetailView groupId={groupId} initialGroup={group} />
    </>
  );
}

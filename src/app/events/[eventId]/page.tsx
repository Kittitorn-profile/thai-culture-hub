import type { Metadata } from 'next';

import { notFound, permanentRedirect } from 'next/navigation';

import { getEventSlug } from 'src/utils/event-slug';

import { getPublishedEventByPath } from 'src/server/events';
import { toEventStorageUrl } from 'src/server/event-media-url';

import { EventDetailView } from 'src/sections/events/view';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thailandculturalhub.com';
const FALLBACK_IMAGE =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';

type Props = { params: Promise<{ eventId: string }> };

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function absoluteUrl(value?: string) {
  if (!value) return FALLBACK_IMAGE;
  const storageUrl = toEventStorageUrl(value);
  if (/^https?:\/\//i.test(storageUrl)) return storageUrl;
  return new URL(storageUrl, SITE_URL).toString();
}

function getEventImage(eventItem: Awaited<ReturnType<typeof getPublishedEventByPath>>) {
  if (!eventItem) return FALLBACK_IMAGE;
  return absoluteUrl(
    eventItem.coverUrl ||
      (eventItem.mediaType === 'image' ? eventItem.mediaUrl : '') ||
      eventItem.imageUrls?.[0] ||
      eventItem.logoUrl
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId: encodedEventId } = await params;
  const eventId = safeDecode(encodedEventId);
  const eventItem = await getPublishedEventByPath(eventId);

  if (!eventItem) {
    return {
      title: 'ไม่พบกิจกรรม | Thailand Cultural Hub',
      robots: { index: false, follow: false },
    };
  }

  const title = `${eventItem.title} | Thailand Cultural Hub`;
  const description = (
    eventItem.description ||
    `รายละเอียดกิจกรรม${eventItem.title}${eventItem.provinceName ? ` จังหวัด${eventItem.provinceName}` : ''}`
  ).slice(0, 220);
  const url = `${SITE_URL}/events/${encodeURIComponent(getEventSlug(eventItem))}/`;
  const image = getEventImage(eventItem);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [
      eventItem.title,
      eventItem.provinceName,
      eventItem.organizer,
      eventItem.isContest ? 'การประกวดวัฒนธรรม' : 'กิจกรรมวัฒนธรรม',
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
      images: [{ url: image, width: 1200, height: 630, alt: eventItem.title }],
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
  const { eventId: encodedEventId } = await params;
  const eventId = safeDecode(encodedEventId);
  const eventItem = await getPublishedEventByPath(eventId);

  if (!eventItem) notFound();

  const canonicalSlug = getEventSlug(eventItem);
  if (eventId !== canonicalSlug) {
    permanentRedirect(`/events/${encodeURIComponent(canonicalSlug)}`);
  }

  const url = `${SITE_URL}/events/${encodeURIComponent(canonicalSlug)}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: eventItem.title,
    description: eventItem.description,
    url,
    image: [getEventImage(eventItem)],
    startDate: eventItem.startsAt || undefined,
    endDate: eventItem.endsAt || undefined,
    location: eventItem.location
      ? {
          '@type': 'Place',
          name: eventItem.location,
          address: eventItem.provinceName || undefined,
        }
      : undefined,
    organizer: eventItem.organizer
      ? { '@type': 'Organization', name: eventItem.organizer }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <EventDetailView eventId={eventItem.id} initialEvent={eventItem} />
    </>
  );
}

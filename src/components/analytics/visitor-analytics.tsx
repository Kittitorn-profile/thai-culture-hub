'use client';

import { useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useAuthContext } from 'src/auth/hooks';

import {
  trackAnalyticsEvent,
  shouldSkipAnalytics,
  trackAnalyticsPageView,
  getAnalyticsBrowserIds,
} from './track-event';

// ----------------------------------------------------------------------

function shouldTrackPath(pathname: string) {
  return !['/admin', '/auth', '/api'].some((privatePath) => pathname.startsWith(privatePath));
}

function getAnchorText(anchor: HTMLAnchorElement) {
  return anchor.innerText.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function VisitorAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef('');
  const { loading, authenticated } = useAuthContext();

  useEffect(() => {
    if (
      loading ||
      authenticated ||
      !pathname ||
      !shouldTrackPath(pathname) ||
      shouldSkipAnalytics()
    ) {
      return;
    }

    const queryString = searchParams.toString();
    const path = queryString ? `${pathname}?${queryString}` : pathname;

    if (lastTrackedUrl.current === path) {
      return;
    }

    lastTrackedUrl.current = path;

    const { visitorId, sessionId } = getAnalyticsBrowserIds();

    trackAnalyticsPageView({
      path,
      title: document.title,
      referrer: document.referrer,
      visitorId,
      sessionId,
    });
  }, [authenticated, loading, pathname, searchParams]);

  useEffect(() => {
    if (loading || authenticated) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (shouldSkipAnalytics()) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const url = new URL(anchor.href);

      if (url.origin !== window.location.origin || !shouldTrackPath(url.pathname)) {
        return;
      }

      trackAnalyticsEvent('navigation_click', getAnchorText(anchor) || url.pathname, {
        href: `${url.pathname}${url.search}${url.hash}`,
        text: getAnchorText(anchor),
      });
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [authenticated, loading]);

  return null;
}

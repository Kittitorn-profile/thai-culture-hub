'use client';

import { useRef, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { COOKIE_PREFERENCE_EVENT } from 'src/lib/cookie-preferences';

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
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  useEffect(() => {
    const update = () => {
      lastTrackedUrl.current = '';
      setPreferenceVersion((value) => value + 1);
    };
    window.addEventListener(COOKIE_PREFERENCE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(COOKIE_PREFERENCE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname) || shouldSkipAnalytics()) {
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
  }, [pathname, searchParams, preferenceVersion]);

  useEffect(() => {
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
  }, []);

  return null;
}

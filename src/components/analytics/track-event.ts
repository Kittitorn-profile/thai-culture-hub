'use client';

// ----------------------------------------------------------------------

export type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

const VISITOR_ID_KEY = 'thch_visitor_id';
const SESSION_ID_KEY = 'thch_session_id';
const ADMIN_ANALYTICS_KEY = 'thch_admin_analytics_disabled';
const PRIVATE_PATHS = ['/admin', '/auth', '/api'];

function isPrivatePath(pathname: string) {
  return PRIVATE_PATHS.some((privatePath) => pathname.startsWith(privatePath));
}

export function setAdminAnalyticsDisabled(disabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (disabled) {
    window.localStorage.setItem(ADMIN_ANALYTICS_KEY, '1');
  } else {
    window.localStorage.removeItem(ADMIN_ANALYTICS_KEY);
  }
}

export function shouldSkipAnalytics() {
  if (typeof window === 'undefined') {
    return true;
  }

  return (
    isPrivatePath(window.location.pathname) ||
    window.localStorage.getItem(ADMIN_ANALYTICS_KEY) === '1'
  );
}

function getBrowserId(storage: Storage, key: string) {
  const existingId = storage.getItem(key);

  if (existingId) {
    return existingId;
  }

  const newId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  storage.setItem(key, newId);

  return newId;
}

function sendAnalyticsPayload(endpoint: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {
    // Analytics must never interrupt the visitor experience.
  });
}

export function getAnalyticsBrowserIds() {
  return {
    visitorId: getBrowserId(window.localStorage, VISITOR_ID_KEY),
    sessionId: getBrowserId(window.sessionStorage, SESSION_ID_KEY),
  };
}

export function trackAnalyticsEvent(
  eventType: string,
  eventName: string,
  metadata: AnalyticsMetadata = {}
) {
  if (shouldSkipAnalytics()) {
    return;
  }

  const { visitorId, sessionId } = getAnalyticsBrowserIds();

  sendAnalyticsPayload('/api/analytics/event', {
    eventType,
    eventName,
    metadata,
    visitorId,
    sessionId,
    path: `${window.location.pathname}${window.location.search}`,
  });
}

export function trackAnalyticsPageView(payload: Record<string, string>) {
  if (shouldSkipAnalytics()) {
    return;
  }

  sendAnalyticsPayload('/api/analytics/page-view', payload);
}

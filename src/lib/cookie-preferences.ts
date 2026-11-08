'use client';

export const COOKIE_PREFERENCE_KEY = 'thch_cookie_consent_v2';
export const COOKIE_PREFERENCE_EVENT = 'thch-cookie-preference-change';
export const COOKIE_SETTINGS_EVENT = 'thch-open-cookie-settings';
export type CookiePreference = 'all' | 'necessary';
export function readCookiePreference(): CookiePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
    return value === 'all' || value === 'necessary' ? value : null;
  } catch {
    return null;
  }
}
export function saveCookiePreference(value: CookiePreference) {
  try {
    window.localStorage.setItem(COOKIE_PREFERENCE_KEY, value);
    if (value === 'necessary') {
      window.localStorage.removeItem('thch_visitor_id');
      window.sessionStorage.removeItem('thch_session_id');
    }
  } catch {
    /* Storage restrictions must not prevent browsing. */
  }
  window.dispatchEvent(new Event(COOKIE_PREFERENCE_EVENT));
}

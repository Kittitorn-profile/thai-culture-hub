import type { CreatorArticle, CreatorProfile, CreatorPlaceCorrection } from './types';

export type CreatorCategory = {
  key: string;
  label: string;
  description: string;
  color: string;
};

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  accessToken?: string;
  body?: Record<string, unknown>;
  headers?: HeadersInit;
};

async function request<T>(input: string, { accessToken, body, headers, ...init }: RequestOptions = {}) {
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed');
  }

  return data;
}

export function registerCreator(body: Record<string, unknown>) {
  return request<{ data: CreatorProfile; message?: string }>('/api/creator/register', {
    method: 'POST',
    body,
  });
}

export function getCreatorProfile(accessToken: string) {
  return request<{ data: CreatorProfile }>('/api/creator/me', { accessToken });
}

export function updateCreatorProfile(accessToken: string, body: Record<string, unknown>) {
  return request<{ data: CreatorProfile }>('/api/creator/me', {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export function getCreatorArticles(accessToken: string) {
  return request<{ data: CreatorArticle[] }>('/api/creator/articles', { accessToken });
}

export function getCreatorPlaceCorrections(accessToken: string) {
  return request<{ data: CreatorPlaceCorrection[] }>('/api/creator/place-corrections', {
    accessToken,
  });
}

export function getCreatorCategories() {
  return request<{ data: CreatorCategory[] }>('/api/creator/categories');
}

export function saveCreatorArticle(accessToken: string, body: Record<string, unknown>) {
  return request<{ data: CreatorArticle }>('/api/creator/articles', {
    method: body.id ? 'PATCH' : 'POST',
    accessToken,
    body,
  });
}

export function getAdminCreators(accessToken: string) {
  return request<{ data: CreatorProfile[] }>('/api/admin/creators', { accessToken });
}

export function reviewAdminCreator(accessToken: string, body: Record<string, unknown>) {
  return request<{ data: CreatorProfile }>('/api/admin/creators', {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export function getAdminCreatorArticles(accessToken: string) {
  return request<{ data: CreatorArticle[] }>('/api/admin/creator-articles', { accessToken });
}

export function reviewAdminCreatorArticle(accessToken: string, body: Record<string, unknown>) {
  return request<{ data: CreatorArticle }>('/api/admin/creator-articles', {
    method: 'PATCH',
    accessToken,
    body,
  });
}

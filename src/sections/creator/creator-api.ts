import type { CreatorArticle, CreatorProfile, CreatorPlaceCorrection } from './types';

export type CreatorCategory = {
  key: string;
  label: string;
  description: string;
  color: string;
  sortOrder: number;
  source: string;
  sourceLabel: string;
  usageCount: number;
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

const CREATOR_AVATAR_MAX_INPUT_SIZE = 1 * 1024 * 1024;
const CREATOR_AVATAR_TARGET_SIZE = 512 * 1024;
const CREATOR_AVATAR_MAX_DIMENSION = 720;

function blobToFile(blob: Blob, fileName: string) {
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'avatar';

  return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('บีบอัดรูปไม่สำเร็จ'));
        }
      },
      type,
      quality
    );
  });
}

async function loadImage(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
      image.src = imageUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function compressAvatarFile(file: File) {
  if (file.size > CREATOR_AVATAR_MAX_INPUT_SIZE) {
    throw new Error('รูปภาพต้องมีขนาดไม่เกิน 1 MB');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, CREATOR_AVATAR_MAX_DIMENSION / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('เบราว์เซอร์ไม่รองรับการบีบอัดรูปภาพ');
  }

  const outputType = 'image/webp';
  let quality = 0.82;
  let outputBlob: Blob | null = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    outputBlob = await canvasToBlob(canvas, outputType, quality);

    if (outputBlob.size <= CREATOR_AVATAR_TARGET_SIZE) {
      break;
    }

    if (quality > 0.48) {
      quality -= 0.08;
    } else {
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
  }

  if (!outputBlob || outputBlob.size > CREATOR_AVATAR_TARGET_SIZE) {
    throw new Error('ไม่สามารถลดขนาดรูปให้ต่ำกว่า 0.5 MB ได้ กรุณาเลือกรูปที่เล็กลง');
  }

  return blobToFile(outputBlob, file.name);
}

export async function uploadCreatorAvatar(accessToken: string, file: File) {
  const uploadFile = await compressAvatarFile(file);
  const formData = new FormData();
  formData.set('file', uploadFile);

  const response = await fetch('/api/creator/avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const data = (await response.json().catch(() => ({}))) as {
    data?: CreatorProfile;
    message?: string;
  };

  if (!response.ok || !data.data) {
    throw new Error(data.message ?? 'อัปโหลดรูปไม่สำเร็จ');
  }

  return { data: data.data };
}

export function changeCreatorPassword(accessToken: string, body: Record<string, unknown>) {
  return request<{ message: string }>('/api/creator/password', {
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

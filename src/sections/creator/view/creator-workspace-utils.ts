import type { CreatorProfile } from '../types';

export function getStatusColor(status: string) {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending' || status === 'pending_review') return 'warning';
  return 'default';
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    draft: 'ฉบับร่าง',
    pending_review: 'รอตรวจบทความ',
    published: 'เผยแพร่แล้ว',
  };

  return labels[status] ?? status;
}

export function getPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join('') || 'C'
  );
}

export function notifyCreatorProfileUpdated(profile: CreatorProfile) {
  window.dispatchEvent(new CustomEvent('creator-profile-updated', { detail: profile }));
}

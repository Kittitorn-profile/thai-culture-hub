export function getCreatorAvatarUrl(profileId: string, avatarUrl?: string | null) {
  if (!avatarUrl) return '';
  try {
    const url = new URL(avatarUrl);
    if (url.protocol === 'https:' && /^lh\d+\.googleusercontent\.com$/.test(url.hostname)) {
      return `/api/creator-avatar/${encodeURIComponent(profileId)}`;
    }
  } catch {
    /* Uploaded images may use local paths. */
  }
  return avatarUrl;
}

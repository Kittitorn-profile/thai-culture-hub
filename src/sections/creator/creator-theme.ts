export const creatorTone = {
  text: '#f8f6ee',
  deep: '#2a3736',
  muted: 'rgba(248,246,238,0.76)',
  top: '#6f8790',
  middle: '#7b8476',
  bottom: '#8f7c5c',
};

export const creatorPageBackground = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${creatorTone.top} 0%, ${creatorTone.middle} 54%, ${creatorTone.bottom} 100%)
`;

export const creatorPosterPattern = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

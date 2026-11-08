'use client';

import { useState } from 'react';
import { RiMapPinLine, RiArrowRightUpLine } from '@remixicon/react';

import { Box, ButtonBase, Typography } from '@mui/material';

type Props = {
  src?: string;
  title: string;
  label: string;
  subtitle?: string;
  description?: string;
  location?: string;
  onClick: () => void;
};
const clamp = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
} as const;

export function CulturalDataCardImage({
  src,
  title,
  label,
  subtitle,
  description,
  location,
  onClick,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const hasImage = Boolean(src && failedSrc !== src);
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={`ดูรายละเอียด ${title}`}
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        aspectRatio: '3 / 4',
        minHeight: 340,
        overflow: 'hidden',
        borderRadius: 2.5,
        bgcolor: '#e9ede5',
        color: hasImage ? '#fff' : '#2c4036',
        textAlign: 'left',
        '&:focus-visible': { outline: '3px solid #608d8c', outlineOffset: 3 },
        '&:hover .data-card-photo': { transform: 'scale(1.04)' },
        '&:hover .data-card-arrow': {
          bgcolor: hasImage ? '#fff' : '#2c4036',
          color: hasImage ? '#2c4036' : '#fff',
        },
      }}
    >
      {hasImage ? (
        <Box
          component="img"
          className="data-card-photo"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 250ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: '0 0 45%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Box
            component="img"
            src="/logo/logo-full.svg"
            alt=""
            sx={{ width: 140, maxHeight: 70, objectFit: 'contain' }}
          />
        </Box>
      )}
      {hasImage && (
        <Box
          sx={{
            position: 'absolute',
            inset: '25% 0 0',
            background:
              'linear-gradient(180deg, transparent 0%, rgba(13,27,17,0.2) 30%, rgba(13,27,17,0.88) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <Typography
        component="span"
        variant="caption"
        sx={{
          position: 'absolute',
          top: 14,
          left: 14,
          maxWidth: 'calc(100% - 28px)',
          px: 1.2,
          py: 0.5,
          borderRadius: 5,
          bgcolor: 'rgba(255,255,255,0.95)',
          color: '#2c4036',
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
      <Box component="span" sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2 }}>
        {subtitle && (
          <Typography
            component="span"
            variant="caption"
            sx={{ ...clamp, WebkitLineClamp: 1, opacity: 0.85, mb: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
        <Typography
          component="span"
          role="heading"
          aria-level={2}
          sx={{ ...clamp, fontSize: 21, fontWeight: 600, lineHeight: 1.4, WebkitLineClamp: 2 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            component="span"
            variant="caption"
            sx={{ ...clamp, WebkitLineClamp: 2, lineHeight: 1.6, opacity: 0.85, mt: 0.75 }}
          >
            {description}
          </Typography>
        )}
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: 1.5,
            pt: 1.25,
            borderTop: '1px solid',
            borderColor: hasImage ? 'rgba(255,255,255,0.25)' : 'rgba(44,64,54,0.15)',
          }}
        >
          <RiMapPinLine size={14} style={{ flexShrink: 0 }} />
          <Typography
            component="span"
            variant="caption"
            sx={{ ...clamp, flex: 1, WebkitLineClamp: 1 }}
          >
            {location || 'ดูรายละเอียดและแหล่งข้อมูล'}
          </Typography>
          <Box
            component="span"
            className="data-card-arrow"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: hasImage ? 'rgba(255,255,255,0.2)' : 'rgba(44,64,54,0.08)',
              transition: 'background-color 150ms',
            }}
          >
            <RiArrowRightUpLine size={17} />
          </Box>
        </Box>
      </Box>
    </ButtonBase>
  );
}

'use client';

import { useState } from 'react';

import { Box, Link, Stack, Typography } from '@mui/material';

import identities from '../../../../data/province-identities/identities.json';
import localSeals from '../../../../data/province-identities/local-seals.json';

type Identity = {
  code: string;
  name: string;
  motto: string | null;
  sealUrl: string | null;
  sealSourceUrl: string | null;
  colors: { name: string; preview: string }[];
  colorsStatus: string;
  colorsSourceUrl?: string;
  sourceUrl: string;
};

export function ProvinceIdentity({ provinceCode }: { provinceCode: string }) {
  const identity = (identities as Identity[]).find((item) => item.code === provinceCode);
  const [failedUrl, setFailedUrl] = useState('');
  const sealUrl = (localSeals as Record<string, string>)[provinceCode];
  if (!identity) return null;
  return (
    <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {sealUrl && failedUrl !== sealUrl && (
          <Box
            component="img"
            src={sealUrl}
            alt={`ตราประจำจังหวัด${identity.name}`}
            loading="eager"
            decoding="async"
            width={68}
            height={68}
            onError={() => setFailedUrl(sealUrl)}
            sx={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            คำขวัญประจำจังหวัด
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, lineHeight: 1.8 }}>
            {identity.motto || 'อยู่ระหว่างตรวจสอบข้อมูล'}
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 2 }}
      >
        <Typography variant="caption" color="text.secondary">
          สีประจำจังหวัด
        </Typography>
        {identity.colorsStatus === 'verified' ? (
          identity.colors.map((color) => (
            <Box key={color.name} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                aria-hidden
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: color.preview,
                  border: '1px solid rgba(0,0,0,0.12)',
                }}
              />
              <Typography variant="caption">{color.name}</Typography>
            </Box>
          ))
        ) : (
          <Typography variant="caption" color="text.secondary">
            อยู่ระหว่างตรวจสอบ
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
        <Link
          href={identity.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          color="text.secondary"
        >
          ที่มาคำขวัญ ↗
        </Link>
        {identity.sealSourceUrl && (
          <Link
            href={identity.sealSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            color="text.secondary"
          >
            ที่มาตรา ↗
          </Link>
        )}
        {identity.colorsSourceUrl && (
          <Link
            href={identity.colorsSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            color="text.secondary"
          >
            ที่มาสี ↗
          </Link>
        )}
      </Stack>
      {identity.colorsStatus === 'verified' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          ตัวอย่างเฉดสีเพื่อแสดงผล ไม่ใช่รหัสสีราชการ
        </Typography>
      )}
    </Box>
  );
}

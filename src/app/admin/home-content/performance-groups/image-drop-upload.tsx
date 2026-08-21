'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type Props = {
  imageUrl: string;
  alt: string;
  uploading?: boolean;
  onFile: (file?: File) => void;
  size?: number | string;
  aspectRatio?: string;
  maxSizeBytes?: number;
  onError?: (message: string) => void;
};

const DEFAULT_MAX_SIZE_BYTES = 20 * 1024 * 1024;

export function ImageDropUpload({
  imageUrl,
  alt,
  uploading,
  onFile,
  size = 200,
  aspectRatio = '1 / 1',
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  onError,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleFile = (file?: File) => {
    if (!file) return;

    let nextError = '';
    if (!file.type.startsWith('image/')) {
      nextError = 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น';
    } else if (file.size > maxSizeBytes) {
      nextError = `รูปภาพต้องมีขนาดไม่เกิน ${(maxSizeBytes / 1024 / 1024).toLocaleString('th-TH')} MB`;
    }

    setValidationError(nextError);
    if (nextError) {
      onError?.(nextError);
      return;
    }

    onFile(file);
  };

  return (
    <Box sx={{ width: size, maxWidth: '100%' }}>
      <Box
        component="label"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!uploading) handleFile(event.dataTransfer.files[0]);
        }}
        sx={{
          width: '100%',
          aspectRatio,
          p: 1,
          gap: 1,
          cursor: uploading ? 'wait' : 'pointer',
          display: 'flex',
          overflow: 'hidden',
          borderRadius: 2,
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: validationError ? 'error.main' : isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'primary.lighter' : 'background.neutral',
          transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
        }}
      >
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt={alt}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 1,
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <>
            <Typography sx={{ fontWeight: 700 }}>
              {uploading ? 'กำลังอัปโหลด...' : 'วางรูปภาพที่นี่'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              หรือคลิกเพื่อเลือกไฟล์
            </Typography>
          </>
        )}
        <input
          hidden
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </Box>
      {validationError && (
        <Typography
          role="alert"
          variant="caption"
          color="error"
          sx={{ mt: 0.75, display: 'block' }}
        >
          {validationError}
        </Typography>
      )}
    </Box>
  );
}

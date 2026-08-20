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
};

export function ImageDropUpload({
  imageUrl,
  alt,
  uploading,
  onFile,
  size = 200,
  aspectRatio = '1 / 1',
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  return (
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
        if (!uploading) onFile(event.dataTransfer.files[0]);
      }}
      sx={{
        width: size,
        maxWidth: '100%',
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
        borderColor: isDragging ? 'primary.main' : 'divider',
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
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </Box>
  );
}

import type { CraftImage } from 'src/lib/craft-corrections';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function CraftImageGallery({ images }: { images: CraftImage[] }) {
  if (!images.length)
    return (
      <Typography variant="body2" color="text.secondary">
        ไม่มีภาพประกอบ
      </Typography>
    );
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          images.length > 1 ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } : '1fr',
        gap: 2,
      }}
    >
      {images.map((image, index) => (
        <Box component="figure" key={image.url + index} sx={{ m: 0 }}>
          <Box
            component="a"
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`เปิดภาพ ${image.caption || index + 1}`}
          >
            <Box
              component="img"
              src={image.url}
              alt={image.caption || `ภาพประกอบ ${index + 1}`}
              loading="lazy"
              sx={{
                display: 'block',
                width: 1,
                height: 220,
                objectFit: 'contain',
                bgcolor: '#f0f3ed',
                borderRadius: 1.5,
              }}
            />
          </Box>
          {(image.caption || image.credit) && (
            <Box component="figcaption" sx={{ mt: 0.75 }}>
              <Typography variant="body2">{image.caption}</Typography>
              {image.credit && (
                <Typography variant="caption" color="text.secondary">
                  ภาพ: {image.credit}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

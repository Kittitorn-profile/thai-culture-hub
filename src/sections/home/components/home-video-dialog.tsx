import type { HomeVideoItem } from './home-types';

import dynamic from 'next/dynamic';

import { Box } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

import { HOME_TEXT, HOME_DEEP } from './home-constants';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  video: HomeVideoItem | null;
  onClose: () => void;
};

export function HomeVideoDialog({ video, onClose }: Props) {
  return (
    <Dialog
      fullWidth
      maxWidth="lg"
      open={!!video}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            overflow: 'hidden',
            bgcolor: HOME_DEEP,
            borderRadius: 1.5,
            border: '1px solid rgba(234,215,161,0.24)',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          gap: 1.5,
          display: 'flex',
          alignItems: 'center',
          color: HOME_TEXT,
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{video?.title}</Typography>

        <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
        <Box sx={{ width: 1, aspectRatio: '16 / 9' }}>
          {video && <ReactPlayer controls playing src={video.src} width="100%" height="100%" />}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

import type { HomeVideoItem, LocalWisdomContent } from './home-types';

import dynamic from 'next/dynamic';

import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';

import { HomePlayButton } from './home-play-button';
import { HOME_DEEP, HOME_TEXT, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  content: LocalWisdomContent;
  onPlayVideo: (video: HomeVideoItem) => void;
};

export function HomeLocalWisdomSection({ content, onPlayVideo }: Props) {
  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 8, md: 12 },
        minHeight: 670,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          gap: { xs: 6, md: 5 },
          maxWidth: HOME_SECTION_MAX_WIDTH,
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '0.88fr 1.12fr' },
        }}
      >
        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: 'rgba(248,246,238,0.1)',
              border: '1px solid rgba(248,246,238,0.22)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            }}
          >
            <Box
              sx={{
                width: 1,
                aspectRatio: '16 / 9',
                height: { xs: 200, md: 350 },
                overflow: 'hidden',
                borderRadius: 1,
                bgcolor: HOME_DEEP,
                '& .react-player__preview': {
                  borderRadius: 1,
                },
                '& .react-player__shadow': {
                  bgcolor: 'rgba(42,55,54,0.58)',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                },
              }}
            >
              <ReactPlayer
                src={content?.mediaUrl}
                light={content?.coverUrl}
                width="100%"
                height="100%"
                playIcon={<HomePlayButton small />}
                previewAriaLabel={`ดูวิดีโอ ${content?.title}`}
                onClickPreview={() =>
                  onPlayVideo({
                    title: content?.title,
                    src: content?.mediaUrl,
                    cover: content?.coverUrl,
                  })
                }
              />
            </Box>
          </Box>
        </Box>

        <Box>
          <Typography
            component="h2"
            sx={{
              color: HOME_TEXT,
              maxWidth: 520,
              fontSize: { xs: 42, sm: 58, md: 68 },
              fontWeight: 800,
              lineHeight: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {content.title}
          </Typography>

          <Typography
            sx={{
              mt: 4,
              maxWidth: 430,
              color: 'rgba(248,246,238,0.82)',
              lineHeight: 1.75,
            }}
          >
            {content.body}
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontStyle: 'italic',
              mt: 3,
            }}
          >
            {content.quote}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontStyle: 'italic',
              mt: 3,
            }}
          >
            {content.caption}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

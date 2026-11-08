import { preload } from 'react-dom';

import { Box } from '@mui/material';

import ThailandMap from '../view/thailand-map';
import { HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

export function HomeMapSection() {
  preload('/assets/maps/thailand-home-paths.json', { as: 'fetch', crossOrigin: 'anonymous' });
  return (
    <Box
      component="section"
      id="explore-map"
      aria-label="สำรวจวัฒนธรรมผ่านแผนที่ประเทศไทย"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 96,
        pb: { xs: 3, md: 5 },
        px: HOME_SECTION_PX,
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: HOME_SECTION_MAX_WIDTH,
        }}
      >
        <ThailandMap />
      </Box>
    </Box>
  );
}

import { Box } from '@mui/material';

import ThailandMap from '../view/thailand-map';
import { HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

export function HomeMapSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 96,
        px: HOME_SECTION_PX,
        zIndex: 1,
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
        <ThailandMap />
      </Box>
    </Box>
  );
}

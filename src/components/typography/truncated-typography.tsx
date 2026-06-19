import type { TypographyProps } from '@mui/material';

import { Typography } from '@mui/material';

type TruncatedTypographyProps = TypographyProps & {
  line?: number;
};

const TruncatedTypography = ({ line = 1, children, sx, ...other }: TruncatedTypographyProps) => (
  <Typography
    sx={{
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: line,
      lineClamp: line,
      WebkitBoxOrient: 'vertical',
      wordBreak: 'break-all',
      ...sx,
    }}
    {...other}
  >
    {children}
  </Typography>
);

export default TruncatedTypography;

import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export function SignUpTerms({ sx, ...other }: BoxProps) {
  return (
    <Box
      component="span"
      sx={[
        () => ({
          mt: 3,
          display: 'block',
          textAlign: 'center',
          typography: 'caption',
          color: 'text.secondary',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {'เมื่อสมัครสมาชิก ฉันยอมรับ '}
      <Link href={paths.termsAndConditions} underline="always" color="text.primary">
        เงื่อนไขการใช้งาน
      </Link>
      {' และรับทราบ '}
      <Link href={paths.privacyPolicy} underline="always" color="text.primary">
        นโยบายความเป็นส่วนตัว
      </Link>
      .
    </Box>
  );
}

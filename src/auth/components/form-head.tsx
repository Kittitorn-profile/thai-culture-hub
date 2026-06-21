import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { Image } from 'src/components/image';

// ----------------------------------------------------------------------

type FormHeadProps = BoxProps & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
};

export function FormHead({ sx, icon, title, description, ...other }: FormHeadProps) {
  return (
    <>
      {icon && (
        <Box component="span" sx={{ mb: 3, mx: 'auto', display: 'inline-flex' }}>
          {icon}
        </Box>
      )}

      <Box
        sx={[
          () => ({
            mb: 5,
            gap: 1.5,
            display: 'flex',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            flexDirection: 'column',
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Image
          alt="Single logo"
          src={`${CONFIG.assetsDir}/logo/logo-full.svg`}
          sx={{ width: 300, mx: 'auto' }}
        />

        <Typography variant="h5" textAlign="center">
          {title}
        </Typography>

        {/* {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        )} */}
      </Box>
    </>
  );
}

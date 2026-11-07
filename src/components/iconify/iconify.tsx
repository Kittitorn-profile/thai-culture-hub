'use client';

import type { IconifyName } from './register-icons';

import { mergeClasses } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';

import { iconifyClasses } from './classes';
import { remixIcons } from './remix-icons';

export type IconifyProps = React.ComponentProps<typeof IconRoot> & {
  icon: IconifyName;
};

/** Render Remix SVGs while preserving existing styles and saved icon names. */
export function Iconify({ className, icon, width = 20, height, sx, ...other }: IconifyProps) {
  const RemixIcon = remixIcons[icon] ?? remixIcons['solar:info-circle-bold'];

  return (
    <IconRoot
      as={RemixIcon}
      className={mergeClasses([iconifyClasses.root, className])}
      sx={[
        {
          width,
          height: height ?? width,
          flexShrink: 0,
          display: 'inline-flex',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    />
  );
}

const IconRoot = styled('svg')``;

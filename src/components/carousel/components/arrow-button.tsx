'use client';

import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';

import type { CarouselOptions, CarouselArrowButtonProps } from '../types';

import { mergeClasses } from 'minimal-shared/utils';

import SvgIcon from '@mui/material/SvgIcon';
import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

import { carouselClasses } from '../classes';

// ----------------------------------------------------------------------

export function ArrowButton({
  sx,
  svgIcon,
  options,
  variant,
  className,
  svgSize = 20,
  ...other
}: CarouselArrowButtonProps) {
  const isPrev = variant === 'prev';

  return (
    <ArrowButtonRoot
      axis={options?.axis}
      direction={options?.direction}
      aria-label={isPrev ? 'Prev button' : 'Next button'}
      className={mergeClasses([carouselClasses.arrows[isPrev ? 'prev' : 'next'], className])}
      sx={sx}
      {...other}
    >
      {svgIcon ? (
        <SvgIcon className={carouselClasses.arrows.svg} sx={{ width: svgSize, height: svgSize }}>
          {svgIcon}
        </SvgIcon>
      ) : (
        <SvgIcon
          component={isPrev ? RiArrowLeftSLine : RiArrowRightSLine}
          inheritViewBox
          className={carouselClasses.arrows.svg}
          sx={{ width: svgSize, height: svgSize }}
        />
      )}
    </ArrowButtonRoot>
  );
}

// ----------------------------------------------------------------------

const ArrowButtonRoot = styled(ButtonBase, {
  shouldForwardProp: (prop: string) => !['axis', 'direction', 'sx'].includes(prop),
})<Pick<CarouselOptions, 'axis' | 'direction'>>(({ theme }) => ({
  borderRadius: '50%',
  boxSizing: 'content-box',
  padding: theme.spacing(1),
  transition: theme.transitions.create(['all'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.short,
  }),
  variants: [
    { props: { disabled: true }, style: { opacity: 0.4 } },
    {
      props: { axis: 'y' },
      style: { [`& .${carouselClasses.arrows.svg}`]: { transform: 'rotate(90deg)' } },
    },
    {
      props: { direction: 'rtl' },
      style: { [`& .${carouselClasses.arrows.svg}`]: { transform: 'scaleX(-1)' } },
    },
  ],
}));

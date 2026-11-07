import { remixIcons } from './remix-icons';

export type IconifyName = keyof typeof remixIcons;
export const allIconNames = Object.keys(remixIcons) as IconifyName[];

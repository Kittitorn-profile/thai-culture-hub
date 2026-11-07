import {
  RiAlignRight,
  RiContrast2Line,
  RiExpandWidthLine,
  RiFontSize,
  RiMoonCloudyLine,
  RiSideBarFill,
  RiSideBarLine,
} from '@remixicon/react';

export const settingIcons = {
  moon: <RiMoonCloudyLine size={24} />,
  contrast: <RiContrast2Line size={24} />,
  alignRight: <RiAlignRight size={24} />,
  autofitWidth: <RiExpandWidthLine size={24} />,
  navVertical: (
    <svg width="86" height="64" viewBox="0 0 86 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1153_603)">
        <mask id="path-2-inside-1_1153_603" fill="white">
          <path d="M0 0H32V64H0V0Z" />
        </mask>
        <path
          d="M31 0V64H33V0H31Z"
          fill="currentColor"
          fillOpacity="0.08"
          mask="url(#path-2-inside-1_1153_603)"
        />
        <circle opacity="0.8" cx="11" cy="11" r="5" fill="currentColor" />
        <rect opacity="0.48" x="6" y="20" width="20" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.24" x="6" y="28" width="14" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.2" x="36" y="4" width="46" height="56" rx="8" fill="currentColor" />
      </g>
      <defs>
        <clipPath id="clip0_1153_603">
          <path
            d="M0 12C0 5.37258 5.37258 0 12 0H74C80.6274 0 86 5.37258 86 12V52C86 58.6274 80.6274 64 74 64H12C5.37258 64 0 58.6274 0 52V12Z"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  ),
  navHorizontal: (
    <svg width="86" height="64" viewBox="0 0 86 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1153_596)">
        <mask id="path-2-inside-1_1153_596" fill="white">
          <path d="M0 0H86V22H0V0Z" />
        </mask>
        <path
          d="M86 21H0V23H86V21Z"
          fill="currentColor"
          fillOpacity="0.08"
          mask="url(#path-2-inside-1_1153_596)"
        />
        <circle opacity="0.8" cx="11" cy="11" r="5" fill="currentColor" />
        <rect opacity="0.48" x="20" y="9" width="16" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.24" x="40" y="9" width="10" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.2" x="4" y="26" width="78" height="34" rx="8" fill="currentColor" />
      </g>
      <defs>
        <clipPath id="clip0_1153_596">
          <path
            d="M0 12C0 5.37258 5.37258 0 12 0H74C80.6274 0 86 5.37258 86 12V52C86 58.6274 80.6274 64 74 64H12C5.37258 64 0 58.6274 0 52V12Z"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  ),
  navMini: (
    <svg width="86" height="64" viewBox="0 0 86 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1153_589)">
        <mask id="path-2-inside-1_1153_589" fill="white">
          <path d="M0 0H22V64H0V0Z" />
        </mask>
        <path
          d="M21 0V64H23V0H21Z"
          fill="currentColor"
          fillOpacity="0.08"
          mask="url(#path-2-inside-1_1153_589)"
        />
        <circle opacity="0.8" cx="11" cy="11" r="5" fill="currentColor" />
        <rect opacity="0.48" x="6" y="20" width="10" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.24" x="6" y="28" width="10" height="4" rx="2" fill="currentColor" />
        <rect opacity="0.2" x="26" y="4" width="56" height="56" rx="8" fill="currentColor" />
      </g>
      <defs>
        <clipPath id="clip0_1153_589">
          <path
            d="M0 12C0 5.37258 5.37258 0 12 0H74C80.6274 0 86 5.37258 86 12V52C86 58.6274 80.6274 64 74 64H12C5.37258 64 0 58.6274 0 52V12Z"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  ),
  sidebarOutline: <RiSideBarLine size={24} />,
  sidebarFill: <RiSideBarFill size={24} />,
  siderbarDuotone: <RiSideBarLine size={24} />,
  font: <RiFontSize size={24} />,
};

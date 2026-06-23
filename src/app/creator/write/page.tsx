import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { CreatorWorkspaceView } from 'src/sections/creator/view/creator-workspace-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เขียนบทความ - ${CONFIG.appName}` };

export default function Page() {
  return <CreatorWorkspaceView view="write" />;
}

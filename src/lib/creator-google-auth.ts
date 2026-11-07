import { createClient } from '@supabase/supabase-js';

import { CONFIG } from 'src/global-config';

/** Google identity verification is not an approved application session. */
export const creatorGoogleClient = createClient(CONFIG.supabase.url, CONFIG.supabase.key, {
  auth: {
    storageKey: 'creator-google-verification',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

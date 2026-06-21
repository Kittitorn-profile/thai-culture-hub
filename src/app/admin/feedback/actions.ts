'use server';

import type { FeedbackItem, FeedbackStatus } from './types';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

// ----------------------------------------------------------------------

const TABLE_NAME = 'visitor_feedback';

type FeedbackRow = {
  id: string;
  created_at: string | null;
  name: string | null;
  contact: string | null;
  message: string | null;
  path: string | null;
  status: string | null;
  user_agent: string | null;
};

type ActionError = {
  ok: false;
  status: number;
  message: string;
};

type ActionSuccess<T> = {
  ok: true;
  data: T;
};

async function verifyAdminAccess(accessToken: string): Promise<ActionError | null> {
  const result = await verifyAdminAccessToken(accessToken, ADMIN_PERMISSION.feedback);

  if (!result.ok) {
    return { ok: false, status: result.status, message: result.message };
  }

  return null;
}

function normalizeStatus(status: string | null): FeedbackStatus {
  if (status === 'reviewed' || status === 'archived') {
    return status;
  }

  return 'new';
}

function mapFeedback(row: FeedbackRow): FeedbackItem {
  return {
    id: row.id,
    createdAt: row.created_at ?? '',
    name: row.name ?? '',
    contact: row.contact ?? '',
    message: row.message ?? '',
    path: row.path ?? '',
    status: normalizeStatus(row.status),
    userAgent: row.user_agent ?? '',
  };
}

export async function getFeedbackAction(
  accessToken: string
): Promise<ActionSuccess<FeedbackItem[]> | ActionError> {
  const authError = await verifyAdminAccess(accessToken);

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('id, created_at, name, contact, message, path, status, user_agent')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  return { ok: true, data: ((data ?? []) as FeedbackRow[]).map(mapFeedback) };
}

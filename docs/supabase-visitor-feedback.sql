-- Visitor feedback for Thailand Cultural Hub
-- Run this in Supabase SQL editor before enabling the feedback admin page.

create extension if not exists pgcrypto;

create table if not exists public.visitor_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  contact text,
  message text not null,
  path text not null,
  visitor_id text,
  session_id text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived'))
);

create index if not exists visitor_feedback_created_at_idx
  on public.visitor_feedback (created_at desc);

create index if not exists visitor_feedback_status_idx
  on public.visitor_feedback (status);

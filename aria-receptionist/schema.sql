-- MissedCall.io SaaS Schema
-- Run this once in Supabase SQL Editor

-- Businesses (one row per client that signs up)
create table if not exists businesses (
  id                  uuid default gen_random_uuid() primary key,
  name                text,
  email               text unique,
  business_name       text,
  mobile_number       text,
  industry            text,
  plan                text default 'growth',
  status              text default 'trial',
  trial_ends_at       timestamptz,
  vapi_assistant_id   text,
  missedcall_number   text,
  created_at          timestamptz default now()
);

-- Leads (one row per captured lead)
create table if not exists leads (
  id             bigint generated always as identity primary key,
  business_id    uuid references businesses(id),
  call_id        text,
  name           text,
  issue          text,
  phone          text,
  caller_number  text,
  received_at    timestamptz default now()
);

-- Calls (one row per inbound call)
create table if not exists calls (
  id               text primary key,
  business_id      uuid references businesses(id),
  caller_number    text,
  started_at       timestamptz,
  ended_at         timestamptz,
  duration_seconds int,
  status           text,
  created_at       timestamptz default now()
);

-- Indexes for fast lookups
create index if not exists businesses_email_idx on businesses (email);
create index if not exists leads_business_idx on leads (business_id, received_at desc);
create index if not exists calls_business_idx on calls (business_id, started_at desc);

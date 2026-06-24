-- DOM Defender schema for Supabase Postgres. Matches db/schema.ts exactly.
-- Apply via the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- gen_random_uuid() is built into Postgres 13+ (available on Supabase).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text,
  password_hash text not null,
  profile_public boolean not null default true,
  display_name text,
  selected_skin text not null default 'default',
  unlocked_skins text[] not null default array['default']::text[],
  unlocked_achievements text[] not null default '{}'::text[],
  owned_cosmetics text[] not null default '{}'::text[],
  selected_title text,
  selected_trail text,
  selected_badge text,
  selected_sfx_pack text,
  is_pro boolean not null default false,
  pro_tier text,
  pro_since timestamptz,
  total_coins integer not null default 0,
  total_runs integer not null default 0,
  total_bugs_fixed integer not null default 0,
  longest_run_seconds integer not null default 0,
  high_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  username text not null,
  mode text not null,
  daily_key text,
  seed bigint,
  score integer not null,
  duration_sec integer not null,
  wave integer not null,
  bugs_fixed integer not null default 0,
  bosses_defeated integer not null default 0,
  max_combo integer not null default 0,
  skin_used text not null default 'default',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists scores_mode_score_idx on scores (mode, score desc, created_at desc);
create index if not exists scores_mode_daily_idx on scores (mode, daily_key, score desc);
create index if not exists scores_user_idx on scores (user_id, created_at desc);
create index if not exists scores_seed_idx on scores (seed);

create table if not exists replays (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique,
  user_id uuid references users(id) on delete set null,
  username text,
  mode text not null,
  seed bigint,
  daily_key text,
  skin_id text not null default 'default',
  duration_sec integer not null,
  score integer not null,
  wave integer not null,
  bugs_fixed integer not null,
  bosses_defeated integer not null,
  max_combo integer not null,
  events jsonb not null default '[]'::jsonb,
  snapshots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists replays_user_idx on replays (user_id, created_at desc);

create table if not exists auth_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  kind text not null,
  username text,
  created_at timestamptz not null default now()
);
create index if not exists auth_attempts_ip_kind_idx on auth_attempts (ip_hash, kind, created_at desc);

create table if not exists pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references users(id) on delete set null,
  username text,
  source text not null default 'pro_page',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null references users(id) on delete cascade,
  host_username text not null,
  seed bigint not null,
  status text not null default 'open',
  time_box_minutes integer not null default 15,
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null
);

create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower uuid not null references users(id) on delete cascade,
  following uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists follows_pair_unq on follows (follower, following);
create index if not exists follows_follower_idx on follows (follower);
create index if not exists follows_following_idx on follows (following);

create table if not exists byo_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  user_id uuid references users(id) on delete set null,
  domain text not null,
  blocked boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists byo_attempts_ip_idx on byo_attempts (ip_hash, created_at desc);

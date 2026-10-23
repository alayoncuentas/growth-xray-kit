-- Growth X-Ray · modelo de datos (docs/SPEC.md §5).
-- Toda la lectura y escritura pasa por el servidor de Next con SUPABASE_SECRET_KEY.
-- RLS queda activado sin políticas: las claves publicables (anon/authenticated) no ven nada.

create extension if not exists pgcrypto;

-- ---------- companies ----------
create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  city             text,
  state            text,
  industry         text,
  website          text,
  phone            text,
  google_place_id  text,
  -- "What we saw from the outside": { date, text, reply, replyGap, reviews, lastReview }
  outside_view     jsonb,
  created_at       timestamptz not null default now()
);

-- ---------- access_codes ----------
create table public.access_codes (
  code        text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  company_id  uuid references public.companies (id) on delete cascade,
  email       text,
  status      text not null default 'sent'
              check (status in ('sent', 'opened', 'p1_done', 'p2_done', 'booked')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index access_codes_company_idx on public.access_codes (company_id);

-- ---------- sessions ----------
-- Una sesión por código y fase: retomar reutiliza la misma fila.
create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  code              text not null references public.access_codes (code) on delete cascade,
  phase             smallint not null check (phase in (1, 2)),
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  last_question_id  text,
  user_agent        text,
  unique (code, phase)
);

-- ---------- answers ----------
-- value: id de opción (single), lista de ids (multi) u objeto de la calculadora.
create table public.answers (
  session_id   uuid not null references public.sessions (id) on delete cascade,
  question_id  text not null,
  value        jsonb not null,
  answered_at  timestamptz not null default now(),
  primary key (session_id, question_id)
);

-- ---------- scores ----------
-- Se recalcula con cada respuesta. Contiene la vista del equipo: solo para /admin.
create table public.scores (
  session_id        uuid primary key references public.sessions (id) on delete cascade,
  pillars           jsonb not null,
  need              smallint,
  potential         smallint,
  readiness         smallint,
  archetype         text,
  monthly_at_stake  integer,
  flags             text[] not null default '{}',
  verdict           text,
  computed_at       timestamptz not null default now()
);

-- ---------- events ----------
create table public.events (
  id       bigint generated always as identity primary key,
  code     text references public.access_codes (code) on delete cascade,
  type     text not null check (type in (
             'email_sent', 'link_opened', 'question_viewed', 'answered',
             'phase_done', 'booked', 'crm_synced')),
  payload  jsonb not null default '{}',
  at       timestamptz not null default now()
);
create index events_code_at_idx on public.events (code, at);
create index events_type_at_idx on public.events (type, at);

-- ---------- access_attempts ----------
-- Fuera del modelo de §5: intentos fallidos de código para la limitación de intentos (§6).
-- Guarda un hash de la IP, nunca la IP.
create table public.access_attempts (
  id       bigint generated always as identity primary key,
  ip_hash  text not null,
  at       timestamptz not null default now()
);
create index access_attempts_ip_at_idx on public.access_attempts (ip_hash, at);

-- ---------- seguridad ----------
alter table public.companies       enable row level security;
alter table public.access_codes    enable row level security;
alter table public.sessions        enable row level security;
alter table public.answers         enable row level security;
alter table public.scores          enable row level security;
alter table public.events          enable row level security;
alter table public.access_attempts enable row level security;

revoke all on public.companies, public.access_codes, public.sessions, public.answers,
              public.scores, public.events, public.access_attempts
  from anon, authenticated;

-- ============================================================================
-- GENERADO con `npm run db:dev-sql`. No editar a mano: cambiar las migraciones y regenerar.
-- SOLO PARA UN PROYECTO DE SUPABASE DE DESARROLLO, VACÍO. Nunca en producción: incluye datos de ejemplo.
-- Pegar completo en el SQL Editor del proyecto nuevo y correr una vez.
-- ============================================================================

-- >>>>> migrations/20261023000000_init.sql

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

-- >>>>> migrations/20261025000000_lang.sql

-- Idioma de la interfaz pública (en / es). Ver docs/SPEC.md §5.
-- Correr en Supabase (SQL Editor) ANTES de publicar el código que lo usa: el servidor ya lee estas columnas.

-- Idioma del código: lo elige el equipo al crear la empresa. Es el idioma con que se abre el link
-- mientras el prospecto no elija otro con el botón EN / ES.
alter table public.access_codes
  add column if not exists lang text not null default 'en';

alter table public.access_codes
  drop constraint if exists access_codes_lang_check;
alter table public.access_codes
  add constraint access_codes_lang_check check (lang in ('en', 'es'));

-- Idioma en que respondió el prospecto: se guarda con cada respuesta y al usar el botón EN / ES.
-- Null mientras no haya respondido ni elegido. Define el idioma del correo con el informe.
alter table public.sessions
  add column if not exists lang text;

alter table public.sessions
  drop constraint if exists sessions_lang_check;
alter table public.sessions
  add constraint sessions_lang_check check (lang is null or lang in ('en', 'es'));

-- >>>>> migrations/20261027000000_open_entry.sql

-- Camino abierto (docs/OPEN_ENTRY.md; modelo de datos en docs/SPEC.md §5).
-- Solo agrega: columnas nuevas con valor por defecto, tablas nuevas y checks más amplios. Las filas actuales
-- quedan como empresas invitadas. Con OPEN_ENTRY_ENABLED apagado el código publicado funciona igual con o sin esta
-- migración, pero el panel (origen, regalos) y el cron la necesitan: correrla ANTES de publicar esos commits.
-- Se puede correr más de una vez.

-- ---------- companies: origen y primer contacto ----------
-- invited = la crea el equipo en /admin; open = la persona desde "Start my X-Ray".
alter table public.companies
  add column if not exists source text not null default 'invited';
alter table public.companies drop constraint if exists companies_source_check;
alter table public.companies
  add constraint companies_source_check check (source in ('invited', 'open'));

-- UTM de la URL de llegada a / (utm_source, utm_medium, utm_campaign, utm_term, utm_content) y referrer externo.
alter table public.companies add column if not exists utm jsonb;
alter table public.companies add column if not exists referrer text;

-- En el camino abierto el nombre llega en la pantalla de datos del negocio; una empresa invitada siempre lo tiene.
alter table public.companies alter column name drop not null;
alter table public.companies drop constraint if exists companies_name_required;
alter table public.companies
  add constraint companies_name_required check (source = 'open' or name is not null);

create index if not exists companies_source_created_idx on public.companies (source, created_at);

-- ---------- access_codes: consentimiento del correo ----------
-- Cuándo aceptó la persona el texto "By continuing…" (incluye los tips de marketing) y qué versión del texto.
alter table public.access_codes add column if not exists email_consent_at timestamptz;
alter table public.access_codes add column if not exists email_consent_version text;

-- ---------- gifts ----------
-- Un regalo por código, fijo desde que se ofrece (aunque después cambien las respuestas).
-- A = Potential >= 60 y Need >= 50 (3 días hábiles); B = el resto (2). Ver lib/gifts.ts.
create table if not exists public.gifts (
  code          text primary key references public.access_codes (code) on delete cascade,
  kind          text not null check (kind in ('A', 'B')),
  offered_at    timestamptz not null default now(),
  due_at        timestamptz not null,
  delivered_at  timestamptz,
  delivered_by  text
);
create index if not exists gifts_pending_due_idx on public.gifts (due_at) where delivered_at is null;

-- ---------- events ----------
alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check check (type in (
    'email_sent', 'link_opened', 'question_viewed', 'answered',
    'phase_done', 'booked', 'crm_synced',
    'email_captured', 'gift_offered', 'gift_delivered'));

-- ---------- open_starts ----------
-- Sesiones abiertas creadas por hash de IP (nunca la IP), para el límite de 5 por hora y 20 por día.
-- Aparte de access_attempts: empezar un diagnóstico no debe bloquear el ingreso con código.
create table if not exists public.open_starts (
  id       bigint generated always as identity primary key,
  ip_hash  text not null,
  at       timestamptz not null default now()
);
create index if not exists open_starts_ip_at_idx on public.open_starts (ip_hash, at);

-- ---------- deletion_log ----------
-- Constancia de cada "Delete lead": quién y cuándo, sin datos del prospecto. crm_status sirve para
-- reintentar el borrado en GHL (skipped = sin integración configurada).
create table if not exists public.deletion_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  admin_email  text not null,
  company_id   uuid,
  codes        integer not null default 0,
  crm_status   text not null default 'skipped' check (crm_status in ('skipped', 'ok', 'failed')),
  crm_ids      text[] not null default '{}'
);

-- ---------- borrado automático (cron diario, /api/cron/cleanup) ----------
-- Empresas abiertas sin ningún código con correo, con más de 30 días desde que se crearon (en cascada: códigos,
-- sesiones, respuestas, puntajes, eventos, regalos), e intentos e inicios de más de 24 horas.
create or replace function public.cleanup_expired()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_companies integer;
  n_attempts integer;
  n_starts integer;
begin
  with d as (
    delete from public.companies c
    where c.source = 'open'
      and c.created_at < now() - interval '30 days'
      and not exists (select 1 from public.access_codes a where a.company_id = c.id and a.email is not null)
    returning 1
  ) select count(*) into n_companies from d;

  with d as (delete from public.access_attempts where at < now() - interval '24 hours' returning 1)
  select count(*) into n_attempts from d;

  with d as (delete from public.open_starts where at < now() - interval '24 hours' returning 1)
  select count(*) into n_starts from d;

  return jsonb_build_object('companies', n_companies, 'access_attempts', n_attempts, 'open_starts', n_starts);
end;
$$;

revoke execute on function public.cleanup_expired() from public, anon, authenticated;
grant execute on function public.cleanup_expired() to service_role;

-- ---------- seguridad ----------
-- Igual que el resto: RLS activado sin políticas; solo el servidor (clave secreta) lee y escribe.
alter table public.gifts        enable row level security;
alter table public.open_starts  enable row level security;
alter table public.deletion_log enable row level security;

revoke all on public.gifts, public.open_starts, public.deletion_log from anon, authenticated;

-- >>>>> seed.sql (solo desarrollo)

-- ============================================================================
-- SOLO DESARROLLO. NUNCA CORRER EN PRODUCCIÓN.
-- Datos de ejemplo para una base local (`supabase db reset` en la CLI). `supabase db push` no lo carga.
-- En producción no hay códigos públicos de demo: las demos se muestran con /admin/preview (código PREVIEW).
-- Se puede correr más de una vez: `on conflict do nothing` nunca reactiva un código vencido.
-- ============================================================================

insert into public.companies (id, name, city, state, industry, outside_view)
values (
  '00000000-0000-4000-8000-000000000001',
  'Rivera Dental Studio',
  'Austin',
  'TX',
  'dental',
  '{
    "date": "Tue, Oct 13",
    "text": "We texted your listed number at 8:42 p.m. asking about a cleaning appointment.",
    "reply": "First reply: next day at 11:20 a.m.",
    "replyGap": "14 h 38 min",
    "reviews": "4.8 stars from 23 Google reviews",
    "lastReview": "5 months ago"
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.access_codes (code, company_id, status)
values ('RIVERA-7F3K', '00000000-0000-4000-8000-000000000001', 'sent')
on conflict (code) do nothing;

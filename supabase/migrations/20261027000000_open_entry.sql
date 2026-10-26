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

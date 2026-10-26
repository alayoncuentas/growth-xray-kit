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

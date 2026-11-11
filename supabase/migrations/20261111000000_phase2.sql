-- Fase 2 (docs/SPEC.md §4 y §8). Una sola migración para producción:
--   1. evento block_done (cierre de un bloque de la fase 2, una vez por bloque);
--   2. scores.scoring_version: scores pasa a ser historial. Los puntajes que se muestran se calculan al leer, desde las
--      respuestas; esta fila es una foto con la versión de las reglas con que se calculó (fecha de la última fila de
--      SPEC §8). Las filas anteriores quedan con null: calculadas antes de registrar la versión.
-- Se puede correr más de una vez. La app tolera que todavía no esté aplicada: la foto y block_done fallan solos, en el
-- log, sin afectar las respuestas.

-- ---------- events ----------
alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check check (type in (
    'email_sent', 'link_opened', 'question_viewed', 'answered',
    'phase_done', 'booked', 'crm_synced',
    'email_captured', 'gift_offered', 'gift_delivered',
    'block_done'));

-- ---------- scores ----------
alter table public.scores add column if not exists scoring_version text;
comment on table public.scores is
  'Historial: foto de los puntajes al guardar cada respuesta (vista del equipo, solo /admin). Nunca se muestra como valor actual: el panel calcula al leer desde answers.';
comment on column public.scores.scoring_version is
  'Versión de las reglas de puntaje (lib/scoring.ts SCORING_VERSION = fecha de la última fila de docs/SPEC.md §8). null: anterior a 2026-11-11.';

-- Camino abierto: rubro de la empresa desde la respuesta a la pregunta de rubro (docs/OPEN_ENTRY.md).
-- Desde este cambio la app lo copia al responder; esto completa las empresas abiertas creadas antes.
-- Solo empresas source = 'open' sin rubro, y solo si la respuesta es un texto. Se puede correr más de una vez.
-- Correr DESPUÉS de 20261027000000_open_entry.sql (usa companies.source).

update public.companies c
set industry = a.value #>> '{}'
from public.access_codes ac
join public.sessions s on s.code = ac.code and s.phase = 1
join public.answers a on a.session_id = s.id and a.question_id = 'industry'
where ac.company_id = c.id
  and c.source = 'open'
  and c.industry is null
  and jsonb_typeof(a.value) = 'string';

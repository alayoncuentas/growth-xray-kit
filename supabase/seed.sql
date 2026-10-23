-- Negocio y código de demo del prototipo (RIVERA-7F3K). Se puede correr más de una vez.

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

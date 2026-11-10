# Growth X-Ray — Especificación de producto (v0.1)

Diagnóstico interactivo de sistemas de adquisición de clientes para negocios de servicios en EE. UU.
Este documento es la fuente de verdad para construir la versión de producción con Claude Code.
La interfaz para el empresario va en **inglés** y en **español** (botón EN / ES; ver "Idioma" en §5); el panel `/admin` va en inglés y este documento, en español.

---

## 1. Objetivo

Un diagnóstico en dos fases que:

1. **Califica** al negocio en tres ejes: Necesidad, Potencial y Preparación.
2. **Despierta conciencia** con insights en el momento: evidencia de mercado verificada, espejos y mitos.
3. **Recomienda un primer paso** concreto y dice lo que el negocio todavía *no* necesita.

Principios no negociables:

- Solo estadísticas con fuente trazable (ver `phase1.config.json → evidence`). Nunca cifras "virales" sin origen.
- El sistema puede recomendar *menos* (no vender, o no vender todavía).
- Valor primero; resultado completo a cambio del correo **en el camino abierto**: quien empezó sin código y no dejó correo ve un resultado parcial con valor real (arquetipo, índice y dinero en juego); el correo desbloquea el desglose, los hallazgos, el primer paso, el informe y el regalo. Los invitados siempre ven el resultado completo; a los que no tienen correo se les ofrece dejarlo, con el regalo como incentivo (ver `docs/OPEN_ENTRY.md`).
- Lenguaje situacional, nunca técnico ("¿qué pasa cuando…?", no "¿usa un CRM?").

## 2. Flujo

```
Correo de contacto (con código único)
  → Link con código  /x/XXXXX-XXXXX   (o ingreso manual del código)
  → Bienvenida personalizada + "Lo que vimos desde afuera"
  → FASE 1 · ~10 min · 12 preguntas · 4 partes
      → Resultado de la fase 1 (arquetipo, índice, pilares, dinero en juego, primer paso, lo que no necesita)
      → [Continuar a la fase 2] o [Guardar y seguir después]
  → FASE 2 · ~20 min · 8 bloques con pausa entre bloques
      → Informe completo + ruta en 3 fases + agendar llamada
```

En segundo plano: cada evento se registra; los puntajes se recalculan con cada respuesta; los leads calificados se envían al CRM.

## 3. Fase 1 (implementada en el prototipo)

Definida completamente en `phase1.config.json`. Resumen:

| Parte | Preguntas | Insight |
|---|---|---|
| 1. Your business | industry*, team, channels | — |
| 2. When someone reaches out | busy, speed, afterhours | HBR 2011; InsideSales 2013 |
| 3. After the first contact | tracking, followup, reviews, away, ads | espejo de canales; mito "they'll call back"; BrightLocal 2026; espejo del dueño; balde con agujeros |
| 4. Your numbers | calculadora (por semana normal: consultas, sin respuesta el mismo día, cotizaciones sin seguimiento; de cada 10 bien atendidas cuántas compran; valor del cliente) | dinero en juego + escenario cauteloso (25%) |

\* Se omite si el código ya trae el rubro.

### Pilares (fase 1 → 0-100)
`access` (primera respuesta), `pipeline` (registro de consultas), `followup`, `reputation`, `owner` (independencia del dueño).
Cada opción aporta un puntaje a uno o más pilares; el pilar es el promedio de sus aportes.
Pilares de la fase 2: `retention`, `visibility`, `readiness` (se muestran en gris con candado en la fase 1).

### Calculadora: entradas
Cantidades que el dueño puede contar, en una semana normal (`config/phase1.config.json`, pregunta `numbers`):
```
weekly      consultas nuevas            1–500   campo con − / +   inicial según team (abajo)
unanswered  sin respuesta el mismo día  0–weekly                  sugerido desde las respuestas
noFollowup  de las atendidas, cotizaciones sin seguimiento
                                        0–(weekly − unanswered)   sugerido desde las respuestas
closeOf10   de cada 10 bien atendidas, cuántas compran
                                        1–10    deslizador        inicial 2 (supuesto editable, no estadística)
value       valor de un cliente nuevo   $100–$25,000 (paso 50)    inicial $1,500
```
Consultas iniciales por tamaño (`team`): 1 → 8 · 2_5 → 15 · 6_15 → 30 · 16_50 → 60 · 50p → 120 · sin respuesta → 15.
El servidor valida solo los límites absolutos (weekly ≤ 500, etc.); los límites cruzados los aplica `calcValues`, y la
pantalla guarda los valores ya recortados. Una consulta cuenta una sola vez: sin seguimiento sale solo de las atendidas.

### Cantidades sugeridas (valores iniciales de unanswered y noFollowup)
Heurísticas para empezar, no estadísticas; en pantalla y en /admin se marcan como sugeridas hasta que el dueño las mueve.
Las tres preguntas de demora describen el mismo hueco: se combinan como unión, no se suman.
```
u = 1 − (1 − speed)(1 − afterhours)(1 − busy),  tope 0.60
    speed:      5m .02 · 1h .05 · day .10 · next .40 · dk .25 · (sin respuesta) .15
    afterhours: book 0 · auto .05 · none .10 · dk .12 · (sin respuesta) 0
    busy:       c .03 · d .05 · (otras) 0
unanswered = round(weekly × u)
noFollowup = round((weekly − unanswered) × f)
    f (followup): auto .03 · set .08 · once .20 · wait .35 · (sin respuesta) .15
```
Mientras el dueño no las mueve, siguen a `weekly`.

Cálculo:
```
lostWeek = unanswered + noFollowup
missed   = lostWeek × 52/12          (consultas perdidas al mes; el texto dice "× 4.33")
monthly  = missed × closeOf10/10 × value
annual   = monthly × 12              (= lostWeek × 52 × closeOf10/10 × value, exacto)
cautious = monthly × 0.25
leak%    = lostWeek / weekly         (solo para el aviso de anuncios)
adLeak   = adSpend × leak%
```
Cifras derivadas que muestra la pantalla de resultados (solo presentación; `lib/scoring.ts`):
```
annual          = monthly × 12                    (cifra principal, también en el parcial)
customers/year  = lostWeek × 52 × closeOf10/10    (< 1 → "less than one"; redondeado = 1 → singular)
cautious/year   = cautious × 12
per $1,000 ads  = 1,000 × lostWeek / weekly       (se omite si adSpend = 0; es otra vista del mismo dinero, no se suma)
```
Con lostWeek = 0 se omiten clientes al año y el escenario prudente (dirían "less than one" y "$0").
Cifra más larga posible: weekly 500, todas sin respuesta, 10 de 10, $25,000 → $650,000,000 al año (12 caracteres;
`?calc=max` en /admin/preview).

### Resultados guardados con la calculadora anterior
Hasta el 2026-10-29 se guardaba `{inquiries (al mes), value, leak %, close %}`. Las filas no se reescriben: se convierten
al leer (`migrateCalc` en `lib/answers.ts`), solo con lo que el usuario había movido:
```
weekly    = round(inquiries × 12/52)            (1–500)
closeOf10 = round(close / 10)                   (1–10)
lostWeek  = round(weekly × leak%)               repartido entre unanswered y noFollowup en la proporción sugerida
value     igual
```
`/api/answer` acepta el formato anterior tal cual (pestañas abiertas antes del cambio); el siguiente guardado escribe el
nuevo. `scores.monthly_at_stake` se actualiza con la siguiente respuesta de cada sesión.

Pilares en la pantalla de resultados: de menor a mayor puntaje (empates en el orden del config); los de la fase 2 en una sola fila gris con candado.

### Arquetipos (orden de evaluación)
1. `ready` si índice promedio ≥ 70
2. `leaky` si invierte en publicidad y (access < 55 o followup < 55)
3. pilar más bajo: `owner` → `bottleneck`, `reputation` → `secret`, otro → `silent`

"What to fix, in order": pilares < 70, priorizando los del arquetipo y luego de menor a mayor; máximo 3. El primero muestra "Your first step".

### Situación (dónde está la oportunidad según los números)
Capa aparte del arquetipo: el arquetipo describe el sistema según las respuestas; la situación decide el mensaje
principal, el primer paso y el regalo según la calculadora (`situation()` en `lib/scoring.ts`). Nunca cambia el índice
ni los pilares. Se evalúa en orden; gana la primera que se cumple:
```
demand  annual < $30,000  y  (weekly ≤ 4  o  (weekly ≤ 10 y lostWeek ≤ 1))
offer   annual < $30,000  y  weekly ≥ 5  y  value < $300
scale   lostWeek = 0  o  (índice ≥ 70 y weekly ≥ 20 y leak% ≤ 10)
leak    todo lo demás
```
- Con 0 perdidas nunca es `leak`. Si además se cumple índice ≥ 70, weekly ≥ 20 y leak% ≤ 10, el `scale` está
  **confirmado**; si no, el texto solo repite lo que el dueño declaró y el primer paso sale de los pilares.
- Primer paso ("Start here"):
  - `leak` y `scale` sin confirmar: el pilar más débil (como arriba).
  - `demand`: el hallazgo de reputación si ese pilar está < 70 (es visibilidad); si no, el paso de demanda.
  - `offer` y `scale` confirmado: el paso de la situación.
  - Cuando el primer paso no es el primer pilar de la lista, "Then" lleva hasta 2.
- Cifra: va en el panel naranja solo en `leak` con annual ≥ $30,000; en el resto, en un panel neutro. El aviso de
  anuncios solo aparece en `leak`. En `demand` no se muestra "More advertising" en "What you probably don't need yet".
- En `demand`, si trabaja solo (`team = 1`) o owner ≤ 25, se agrega la nota de capacidad ("si tu agenda ya está
  llena…"), para no leer poco volumen como falta de clientes.

> El tope de $30,000 al año (`SMALL_STAKES_ANNUAL`) y los demás umbrales son constantes en `lib/scoring.ts` y una
> hipótesis: calibrarlos con los primeros 30 diagnósticos reales.

### Calificación interna (vista del equipo; provisional, calibrar con datos reales)
```
Need      = 100 − índice promedio
Potential = inquiries/mes = weekly × 52/12 (≥100:40, ≥50:30, ≥20:20, else 10)
          + value(≥5000:35, ≥1000:28, ≥300:18, else 8)
          + (ads > 0 ? 15 : 0) + (team > 1 ? 10 : 0)          tope 100
Readiness = 40 + (ads > 0 ? 20) + (tracking crm|sheet ? 15) + (team > 1 ? 10)   tope 85 (preliminar)
```
Veredicto:
- situación `demand` → **Primero demanda** (con ticket alto, Potential podría dar "Alta prioridad")
- situación `offer` → **Primero la oferta**
- situación `scale` solo declarada (0 perdidas, sin confirmar): la fórmula de abajo, pero "Alta prioridad" y "Nutrir"
  bajan a **Optimización selectiva** hasta verificarlo en la llamada
- Need ≥ 50 y Potential ≥ 60 → Readiness ≥ 55 ? **Alta prioridad** : **Nutrir**
- Need ≥ 50 → **Preparar primero**
- Potential ≥ 60 → **Optimización selectiva**
- otro → **Bajo encaje por ahora**

Alertas: no mide tiempo de respuesta · demanda limitada (situación `demand`; reemplaza a volumen bajo) · volumen bajo
(<20/mes, si no es `demand`) · valor bajo por cliente (`offer`) · listo para más volumen (`scale` confirmado) · declaró 0 perdidas, verificar en la llamada (`scale` sin confirmar) · paga
por leads que se pierden · dueño cuello de botella (owner ≤ 25) · trabaja solo.

> Los pesos y umbrales son una hipótesis inicial. Después de 30 diagnósticos reales, comparar los puntajes con quién avanzó a llamada y quién cerró, y ajustar.

## 4. Fase 2 (en construcción)

8 bloques, unas 3-4 preguntas cada uno (30 a 32 visibles según el caso), con un mini-hallazgo al cerrar cada bloque y
pausa permitida entre bloques. Preguntas, opciones, puntajes y mini-hallazgos en `config/phase2.config.json` y
`config/phase2.config.es.json` (misma estructura, lo verifica `lib/config.test.ts`). El borrador de los textos, pendiente
de aprobación, está en `docs/PHASE2.md`.

| Bloque | Mide | Pilares que recibe |
|---|---|---|
| 1. Customer journey | recorrido completo | visibility, pipeline, retention, reputation |
| 2. Pipeline & follow-up | cotizaciones abiertas, motivos de pérdida, responsable | pipeline, visibility, owner |
| 3. Retention & LTV | recompra, recordatorios, lista de clientes, referidos | retention |
| 4. Reviews & proof | respuesta a reseñas, pruebas, a quién se le piden → tarjeta FTC 2024 | reputation |
| 5. Advertising & marketing history | canales, agencias, atribución → mito "marketing doesn't work" | visibility |
| 6. Visibility & forecasting | tasa de cierre, costo por cliente, proyección | visibility |
| 7. Team & capacity | quién atendería un sistema, capacidad, quién responde | readiness, owner (y capacidad del equipo) |
| 8. Technology history & readiness | herramientas probadas, decisión, presupuesto, plazo | readiness (y decisión, presupuesto y plazo del equipo) |

### Decisiones aprobadas (2026-11-10)
- **Quién entra**: solo un código con correo **y** con la fase 1 terminada (`canEnterPhase2`, función pura). Sin correo,
  "Continue to Phase 2" lleva a la pantalla del correo (`?next=phase-2`; `email_captured` con `from: phase2`); sin la fase 1
  terminada, a la primera pregunta pendiente. El servidor lo comprueba en cada ruta de la fase 2 y en `/api/answer`.
- **Recorrido único** para las cuatro situaciones, con una pregunta condicional como máximo por situación
  (`showIf: { situation: [...] }`; offer: oferta adicional en el bloque 3; demand: qué probó para conseguir consultas en el
  bloque 5) y una condicional por respuesta (`showIf: { answer: … }`: por qué dejó las herramientas, en el bloque 8). Los
  mini-hallazgos y la ruta en 3 fases del informe cambian de texto según la situación.
- **Una pregunta por pantalla**, guardada al momento como en la fase 1 (`/api/answer` con `phase: 2`, sesión `phase = 2`).
  Un bloque está **terminado** cuando todas sus preguntas visibles tienen respuesta (se calcula; sin columna nueva). Al
  cerrarlo, pantalla de pausa con el mini-hallazgo, "Continue" y "Save and finish later"; evento `block_done`
  (`payload.block`), una vez por bloque. Al cerrar el bloque 8: `phase_done` (`phase: 2`), estado `p2_done` y el correo con el
  informe completo (una vez por código, `kind: "report2"`).
- **Retomar**: la bienvenida `/x/[code]` lleva a la primera pregunta visible sin responder de la fase 2 si ya empezó, o al
  informe si terminó. El link de "Save and finish later" lleva directo a la fase 2 cuando ya empezó.
- **Mini-hallazgo**: la primera regla del bloque que se cumple (`findings.<bloque>`, con una regla `"*"` obligatoria;
  `blockFinding`). Condiciones (`FindingWhen` en `lib/types.ts`): `answer` / `notAnswer` (fase 2), `p1` / `p1Not`
  (respuestas de la fase 1), `p1Lowest` (ese pilar de la fase 1 es ≤ a todos los demás, empates incluidos), `p1Below`
  (alguno de esos pilares por debajo del número), `situation` y `flag`. Solo cuentan las respuestas de preguntas visibles.
  El texto nunca afirma más de lo que dice el dato (p. ej. "al fondo de tus puntajes" solo si el pilar es el mínimo). Sin
  cifras sin fuente.
- **Pilares** (`combinedPillars`, `pillarChanges`): cada pilar es el promedio de sus aportes de las dos fases (misma regla que la fase 1; solo preguntas single visibles). Los bloques 1, 2, 4 y 7 también aportan a
  pilares de la fase 1. El informe completo muestra los 8 pilares y el **índice completo** (promedio simple de los 8); en cada
  pilar que cambió se ve el valor de la fase 1 junto al actualizado. `/r/[code]` con la fase 1 sola no cambia.
- **Pilar `readiness` visible**: quién atendería el sistema, capacidad para 30 % más de clientes y plazo. El presupuesto y
  quién decide **no** entran en el pilar que ve el prospecto, solo en la vista del equipo.
- **Readiness del equipo** al terminar la fase 2 (reemplaza la fórmula preliminar de §3):
  ```
  capacidad = promedio(team.capacity de "quién atendería" y "30 % más")
  Readiness = round(0.30·capacidad + 0.25·decisión + 0.25·presupuesto + 0.20·plazo)      0–100
  presupuesto menor a $400 al mes (flag lowBudget) → Readiness máximo 50
  ```
  Funciones puras en `lib/scoring.ts` (`teamComponents`, `readinessRaw`, `finalReadiness`; constantes
  `READINESS_WEIGHTS` y `LOW_BUDGET_READINESS_CAP`). Si falta algún componente (fase 2 sin terminar), sigue la
  preliminar. Readiness final entra en el veredicto de §3 con el mismo umbral (≥ 55 → "Alta prioridad"); Need y Potential
  siguen saliendo de la fase 1. Casos de ejemplo frente a la fórmula preliminar en `docs/PHASE2.md` §Readiness (y en los
  tests).
  > Pesos, valores de las opciones, el tope de $400 y el umbral de 55 son una **hipótesis a calibrar** con los primeros 30
  > diagnósticos completos, igual que el tope de $30,000.
- **"Burned by tech"** (flag `burnedByTech`: probó y dejó al menos una herramienta, bloque 8) **no descalifica**: no baja
  Readiness ni el veredicto (test con casos pareados). Suma a `managedFit` (función pura): burnedByTech +40, "nadie / yo"
  atendería el sistema +30, trabaja solo +20, "el equipo no la usaba" +10. Con `managedFit` ≥ 50: alerta en `/admin`
  ("Burned by tech: lead with managed service and onboarding") y la ruta del informe usa la variante "lo operamos contigo".
  (`managedFit`, `MANAGED_FIT_MIN`.) Alertas de la fase 2 para el equipo (`phase2Flags` del resultado): burnedByTech,
  managedService, lowBudget, notDecider, notOwner, noRunner, atCapacity, reviewGating, burnedByAgency.
- Las preguntas de presupuesto y decisión van **solo** en el bloque 8 (`kind: budget | decision`; un test lo exige).
- **Resultado final** (`/x/[code]/report`, y `/r/[code]` cuando la fase 2 terminó): informe completo + ruta en 3 fases
  (Captura y organización → Atención y seguimiento → Medición y crecimiento, adaptada a lo que ya tiene y a la situación)
  + CTA para agendar.
- **Agenda**: calendario de GoHighLevel incrustado (Embed Code) en el informe. "Agendó" llega por un workflow de GHL
  (trigger "Customer Booked Appointment", filtro "In Calendar", acción Custom Webhook) a `POST /api/ghl/booked`, con
  `Authorization: Bearer <GHL_WEBHOOK_SECRET>` comparado en tiempo constante: estado `booked` y evento `booked`. Al terminar
  la fase 2, upsert del contacto en GHL con los datos de las dos fases (`/api/crm-sync`, docs/OPEN_ENTRY.md §6). Duración
  propuesta de la cita: 30 min. Precargar nombre y correo en el calendario no está documentado: solo se usa si funciona en
  una prueba.
- **Rama**: `feature/phase-2`, creada desde `feature/open-entry`.

## 5. Arquitectura recomendada

| Capa | Elección | Por qué |
|---|---|---|
| App | **Next.js (App Router) + TypeScript + Tailwind** | Un solo repo para el diagnóstico, el informe y el panel interno |
| Hosting | **Vercel** | Deploy con cada push |
| Base de datos | **Supabase (Postgres)** | Tablas simples, panel de administración, buen soporte para Claude Code |
| Motor del diagnóstico | Configuración en JSON (`phase1.config.json`, `phase2.config.json`) + funciones puras de puntaje en `lib/scoring.ts` con tests | Cambias preguntas o textos sin tocar código; el puntaje es testeable |
| Correo transaccional | **Resend** | Envío del informe y del link para retomar |
| Correo de prospección | Herramienta dedicada (Instantly, Smartlead o similar) con dominio secundario | Protege tu dominio principal; maneja bajas (CAN-SPAM) |
| CRM | Webhook a **HubSpot** o **GoHighLevel** | Crear contacto + negocio con puntajes, arquetipo y alertas |
| Agenda | **GoHighLevel** (calendario incrustado + workflow con webhook) | CTA final; mismo CRM (§4) |
| Analítica | **PostHog** | Embudo y abandono por pregunta |
| Datos externos | **Google Places API** | Calificación y número de reseñas para "Lo que vimos desde afuera" |

### Modelo de datos
```
companies       id, name (obligatorio salvo source = open), city, state, industry, website, phone,
                google_place_id, outside_view jsonb, source (invited|open, default invited),
                utm jsonb (utm_source…utm_content), referrer, created_at
access_codes    code (PK), company_id, email, status (sent|opened|p1_done|p2_done|booked),
                expires_at, lang (en|es, default en), email_consent_at, email_consent_version, created_at
sessions        id, code, phase, started_at, completed_at, last_question_id, user_agent,
                lang (en|es|null: idioma en que respondió)
answers         session_id, question_id, value jsonb, answered_at        (PK: session_id+question_id)
scores          session_id, pillars jsonb, need, potential, readiness, archetype,
                monthly_at_stake, flags text[], verdict, computed_at
events          id, code, type (email_sent|link_opened|question_viewed|answered|phase_done|
                booked|crm_synced|email_captured|gift_offered|gift_delivered), payload jsonb, at
access_attempts id, ip_hash, at        (intentos fallidos de código; hash SHA-256 de la IP, nunca la IP)
open_starts     id, ip_hash, at        (sesiones abiertas creadas, para el límite por IP; mismo hash)
gifts           code (PK), kind (A|B), offered_at, due_at, delivered_at, delivered_by
deletion_log    id, at, admin_email, company_id, codes, crm_status (skipped|ok|failed), crm_ids
                (constancia de "Delete lead", sin datos del prospecto)
cleanup_expired()  función del cron diario (solo service_role): borra empresas open sin correo con más
                de 30 días desde su creación, y access_attempts y open_starts de más de 24 h
```

Migraciones en `supabase/migrations/` (nombre `AAAAMMDDhhmmss_nombre.sql`, 14 dígitos). Para un proyecto de desarrollo vacío, `supabase/dev-setup.sql` reúne todas las migraciones en orden más el seed (lo genera `npm run db:dev-sql`; un test avisa si quedó desactualizado). Datos de ejemplo **solo para desarrollo** en `supabase/seed.sql` (nunca se cargan en producción; para demos se usa `/admin/preview`). No hay códigos públicos de demo. RLS activado sin políticas:
solo el servidor (clave secreta) lee y escribe.

Reglas de persistencia (fase 1):
- **Código válido** = existe en `access_codes` y `expires_at` es nulo o futuro. Formato `^[A-Z0-9-]{6,32}$`.
- **Limitación de intentos**: máximo 10 códigos fallidos (mal formados, inexistentes o vencidos) por IP cada 15 min, contados en `access_attempts`.
- **Sesión**: una por código y fase (`unique (code, phase)`); retomar reutiliza la misma.
- **`link_opened`**: al ver la bienvenida en el navegador (no al renderizar en el servidor, para no contar prefetches). Crea la sesión si falta; `access_codes.status` pasa a `opened`. `payload.resumed` indica si la sesión ya existía.
- **Inicio abierto** ("Start my X-Ray", solo con `OPEN_ENTRY_ENABLED=true`): valida Turnstile en el servidor, luego el límite por IP (5 por hora y 20 por día en `open_starts`), y crea empresa (`source = open`, UTM y referrer de la llegada a `/`, limpios; los UTM, si faltan en el formulario, de la URL de la página), código interno (mismo generador, sin correo ni vencimiento) y sesión con el idioma sin código. Registra `link_opened` con `payload.open = true` y lleva directo a la pregunta de rubro (sin bienvenida). Con el flag apagado la acción responde error.
- **Datos del negocio** (camino abierto): después del rubro, `/x/[code]/business` pide nombre (obligatorio, hasta 120 caracteres) y web (opcional, normalizada a `https://dominio[/ruta]`). Mientras la empresa abierta no tenga nombre, cualquier pregunta posterior al rubro, los resultados y retomar llevan a esa pantalla (`lib/flow.ts`: `nextAfter`, `businessFirst`). Solo escribe en empresas `source = open`.
- **Rubro del camino abierto**: al responder la pregunta de rubro, se copia a `companies.industry` si la empresa es `open` y todavía no tiene rubro (para el panel y el CSV). Para una empresa abierta ese valor **no** cuenta como rubro conocido (`Access.company.industry` queda vacío): la pregunta de rubro se sigue mostrando y se puede cambiar. Si la persona cambia su respuesta después, `companies.industry` conserva el primero. Las empresas abiertas anteriores se completan con `supabase/migrations/20261028000000_open_industry.sql`.
- **El código no se muestra en el camino abierto**: va en la URL, pero los textos usan las variantes `…Open` (resultados, "Save and finish later", bienvenida, informe y correos).
- **Inicio abierto en producción**: el flag además exige `IP_HASH_SALT`, y Turnstile debe responder con el hostname de `NEXT_PUBLIC_APP_URL` y la acción `start`.
- **"Delete lead"** (detalle del panel): hay que escribir el nombre del negocio (o el código si no tiene) para habilitar el botón; el servidor lo vuelve a comprobar (`lib/admin.ts`: `confirmMatches`). Primero borra en GHL los contactos con los correos de todos los códigos de la empresa (`lib/server/crm.ts`; sin `GHL_PRIVATE_INTEGRATION_TOKEN` y `GHL_LOCATION_ID` no hace nada: `skipped`). Si no puede consultar GHL, **no borra nada** y lo dice. Después borra la empresa (en cascada: códigos, sesiones, respuestas, puntajes, eventos y regalos) y registra en `deletion_log` quién, cuándo, la empresa, cuántos códigos y el resultado en GHL (`ok`, `skipped` o `failed` con los ids de contacto, para reintentar), sin datos del prospecto. Los correos enviados por Resend no se borran aquí (procedimiento manual, docs/OPEN_ENTRY.md §5).
- **Borrado automático** (`GET /api/cron/cleanup`, Vercel Cron todos los días a las 09:00 UTC según `vercel.json`): exige `Authorization: Bearer <CRON_SECRET>` (comparación en tiempo constante; sin `CRON_SECRET` o con menos de 16 caracteres, nunca pasa) y llama a `cleanup_expired()`, que borra empresas `open` sin correo con más de 30 días desde su creación (en cascada) y `access_attempts` y `open_starts` de más de 24 horas. Responde y registra en el log cuántas filas borró.
- **Entorno de pruebas sin indexar**: si `NEXT_PUBLIC_APP_URL` contiene `xray-test`, todas las páginas salen con `robots: noindex, nofollow` (metadata) y la cabecera `X-Robots-Tag: noindex, nofollow` (`lib/seo.ts`, `next.config.ts`).
- **`question_viewed`**: al ver una pregunta en el navegador (desde el cliente, no al renderizar, para no contar prefetches), una vez por pregunta y carga de página; `payload.question_id`. El servidor valida el código y que la pregunta exista y se muestre con el rubro del código (`lib/flow.ts`: `isVisibleQuestion`). La vista previa no registra nada. Sirve para el abandono por pregunta (vista sin `answered` posterior).
- **`answered`**: cada `POST /api/answer` válido. Upsert en `answers` (la calculadora se guarda como un objeto con los campos que el usuario movió), actualiza `last_question_id` y recalcula la fila de `scores`. La respuesta de la API nunca incluye puntajes.
- **`phase_done`**: con el botón "See my results" (`complete: true`), si no queda ninguna pregunta visible sin responder. Una sola vez por sesión: fija `completed_at` y el estado pasa a `p1_done`. El estado nunca retrocede.
- **Correo del informe** (Resend): una sola vez por código (si ya hay un `email_sent` con `kind = "report"`, no se repite), al correo de `access_codes.email`, con el link a `/r/[code]`: al registrar `phase_done` si el código ya tenía correo, o al dejar el correo después en la pantalla del correo o en el parcial. Sale después de responder (no demora al prospecto). Sin correo en el código no se envía. Se registra `email_sent` con `payload.kind = "report"`.
- **Pantalla del correo** (`/x/[code]/email`, docs/OPEN_ENTRY.md §1): al terminar la fase 1, si el código no tiene correo, resultados lleva primero a esta pantalla, en los dos caminos (`lib/flow.ts`: `needsEmailStep`). Nombra el regalo que tocaría con las respuestas. "Skip" lleva a resultados con `?skip=1`: en el camino abierto, al parcial; un invitado ve el resultado completo. Al dejar el correo se guarda solo si el código no tenía uno (nunca se reemplaza), con `email_consent_at` y `email_consent_version` (`EMAIL_CONSENT_VERSION` en `lib/email.ts`; se cambia cuando cambia el texto "By continuing…"), se registra `email_captured` (`payload.from`: `screen` | `partial` | `later`, `payload.open`, `payload.consent`) y sale el informe si la fase terminó.
- **Regalo** (`lib/gifts.ts`, docs/OPEN_ENTRY.md §2): A (Potential ≥ 60 y Need ≥ 50, 3 días hábiles) o B (el resto, 2 días hábiles); los plazos están en `copy.gifts` del config. Se **ofrece** una sola vez por código cuando el código tiene correo y la fase 1 terminó, al mostrar el resultado completo o al enviar el informe (lo que pase primero): fila en `gifts` (`kind`, `offered_at`, `due_at`) y evento `gift_offered` (`payload.gift`, `payload.due_at`). Queda fijo aunque después cambien las respuestas. `due_at` = medianoche de Nueva York al terminar el día hábil número N contado desde el día siguiente (lunes a viernes, `America/New_York`, sin feriados). El resultado completo muestra el bloque del regalo y el informe por correo agrega una línea con su nombre. El prospecto nunca ve los puntajes que lo deciden. Si falla (p. ej. sin la migración), la pantalla y el informe siguen sin regalo.
- **Panel y camino abierto** (`lib/admin.ts`, funciones puras con tests): `?source=invited|open` filtra la lista, el embudo y el CSV. Cada fila muestra el origen (chip "Open"), el resumen de UTM (`utm_source / utm_medium / utm_campaign`) o, si no hay, el host del referrer, y el regalo con los días hábiles que le quedan (vencido en rojo). Encima de la lista, el contador de regalos: pendientes (incluye vencidos), vencidos y entregados. El detalle muestra el origen (UTM completos y referrer como texto), el consentimiento del correo (fecha y versión) y el regalo con su plazo (último día en Nueva York) y el botón **"Mark delivered"**: fija `delivered_at` y `delivered_by` (correo del admin) solo si estaba pendiente y registra `gift_delivered` (`payload.gift`, `payload.by`). El CSV suma `source`, las 5 `utm_*`, `referrer`, `email_consent_at`, `email_consent_version`, `gift`, `gift_due_at` y `gift_delivered_at`. Una empresa abierta sin nombre aparece como "Unnamed business".
- **Resultado parcial** (`lib/flow.ts`: `resultsMode`): solo empresas `source = open` sin correo. Muestra arquetipo, índice y la cifra principal del dinero en juego; el desglose, los pilares, los hallazgos, el primer paso, lo que no necesita, el panel de la fase 2 y el regalo quedan para después del correo. Debajo, el bloque para desbloquear (mismo formulario que la pantalla del correo); al dejarlo, el resultado completo con el aviso "Unlocked…" (`?unlocked=1`). `/r/[code]` del camino abierto sin correo lleva al parcial. Los invitados siempre ven el resultado completo.
- **"Save and finish later"** (en cada pregunta y en el panel de la fase 2): guarda lo pendiente y envía el link `/x/[code]` al correo del código. Si el código no tiene correo, lo pide debajo del texto "By continuing…" y lo guarda con `email_consent_at` y `email_consent_version` más `email_captured` (`from: later`); nunca reemplaza uno existente. Máximo 3 por código y por hora. `email_sent` con `payload.kind = "resume"`.
- **`/r/[code]`**: informe de solo lectura (mismo cuerpo que la pantalla de resultados, sin vista del equipo). Valida el código igual que `/x/[code]`; si la fase 1 no terminó, invita a retomar.
- **Link con un código que no sirve** (`/x/…`, `/r/…`): pantalla clara según el motivo (`copy.codeError`): vencido ("This code has expired."), inexistente o mal formado, o demasiados intentos. Nunca una página de error técnica.
- Sin `RESEND_API_KEY` en desarrollo, los correos se imprimen en el log del servidor; en producción es un error.
- **Idioma** (en / es). Textos en `config/phase1.config.json` (inglés) y `config/phase1.config.es.json` (español, neutro latinoamericano, tuteo). Los dos tienen exactamente la misma estructura (ids, opciones, puntajes, valores, evidencia con fuente y url sin traducir); solo cambian los textos. Lo verifica `lib/config.test.ts`.
  - `access_codes.lang`: lo elige el equipo al crear la empresa (por defecto `en`); un código nuevo para la misma empresa conserva el idioma. Es el idioma en que se abre el link.
  - Botón **EN / ES** en el encabezado de todas las pantallas públicas (no en `/admin`). Guarda la elección en una cookie (`gxr-lang`) y, en un link con código, en `sessions.lang`.
  - Idioma de una pantalla con código = cookie de este navegador si eligió, si no `sessions.lang`, si no `access_codes.lang`. Sin código (inicio, página no encontrada, código que no sirve): cookie; si no hay, el idioma del navegador (`Accept-Language`, el de mayor preferencia entre en y es); si no es ninguno de los dos, inglés. El camino abierto crea la sesión con ese idioma.
  - Cada respuesta guarda en `sessions.lang` el idioma en que se respondió. Abrir el link no lo fija (puede abrirlo alguien del equipo).
  - Correos: el del informe sale en `sessions.lang`; el de "Save and finish later", en el idioma de la pantalla. `email_sent` registra `payload.lang`. El informe `/r/[code]` sigue la misma regla que las pantallas.
  - La vista externa (`companies.outside_view`) es texto libre: el equipo la escribe en el idioma del link.
  - Panel: en inglés; muestra el idioma del link y el idioma en que respondió (lista, detalle y CSV). `/admin/preview` tiene un selector EN / ES para ver todo el mapa en los dos idiomas.
- **Retomar**: la bienvenida lleva a la primera pregunta visible sin responder (no a la siguiente de `last_question_id`, porque el usuario pudo volver atrás); si no falta ninguna, a resultados. La calculadora cuenta como respondida cuando tiene fila guardada.

### Rutas
```
/                      ingreso de código; con OPEN_ENTRY_ENABLED, además "Start my X-Ray" (docs/OPEN_ENTRY.md)
/x/[code]              entrada directa desde el correo (valida y crea la sesión)
/x/[code]/q/[qid]      pregunta (permite volver y retomar)
/x/[code]/business     datos del negocio (solo camino abierto, después del rubro)
/x/[code]/email        pantalla del correo (al terminar la fase 1 sin correo)
/x/[code]/results      resultado de la fase 1 (parcial en el camino abierto sin correo; ?skip=1, ?unlocked=1)
/x/[code]/phase-2       entrada de la fase 2 (correo y fase 1 terminada; lleva a la primera pendiente)
/x/[code]/phase-2/q/[qid]  pregunta de la fase 2
/x/[code]/phase-2/b/[block] pausa al cerrar un bloque (mini-hallazgo)
/x/[code]/report       informe completo + ruta en 3 fases + agendar
/r/[code]              informe compartible (solo lectura)
/admin                 panel interno (protegido con Supabase Auth): lista, embudo, puntajes, vista del equipo; ?source=invited|open
/admin/export          CSV (?status=sent, ?source=invited|open)
/admin/preview         vista previa de todas las pantallas (también las del camino abierto), variantes de insights
                       y los 5 arquetipos (solo lectura). Parámetros solo con código de vista previa: /?preview=open,
                       /x/[code]/email?open=1, /x/[code]/results?partial=1
/api/answer            POST: guarda respuesta y recalcula puntajes
/api/cron/cleanup      GET (Vercel Cron, Bearer CRON_SECRET): borrado automático diario
/api/crm-sync          webhook al CRM cuando termina una fase
/api/ghl/booked        POST (workflow de GHL, Bearer GHL_WEBHOOK_SECRET): marca la cita agendada
```

## 6. Seguridad, privacidad y cumplimiento (EE. UU.)

> Informativo; que un abogado revise los textos finales.

- **CAN-SPAM** (correos de prospección): asunto veraz, identificarse como mensaje comercial, dirección física postal y forma clara de darse de baja respetada en 10 días hábiles.
- **TCPA**: si el sistema que se implemente al cliente envía SMS o llamadas automatizadas, requiere consentimiento previo del destinatario.
- **Regla de la FTC sobre reseñas y testimonios** (16 CFR Part 465, vigente desde el 21-oct-2024): prohíbe reseñas y testimonios falsos (incluidos los generados con IA), pagar o dar incentivos por reseñas condicionados a que digan algo positivo o negativo, ciertas reseñas de personas de la empresa sin divulgarlo, sitios de reseñas controlados por la empresa presentados como independientes, suprimir reseñas negativas con amenazas o intimidación (o presentar como completas las reseñas mostradas cuando se filtraron por puntaje) e indicadores falsos de influencia en redes. La regla **no** prohíbe expresamente pedir reseñas solo a los clientes satisfechos, pero la FTC advierte que esa práctica podría violar la ley de la FTC (Guías de respaldos, 16 CFR 255.2): pedirlas a **todos** los clientes es la práctica recomendada. Fuente: [preguntas y respuestas de la FTC](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers).
- Códigos: aleatorios, no adivinables (≥ 8 caracteres en base32), con vencimiento y limitación de intentos (rate limiting).
  Implementado: 10 caracteres `XXXXX-XXXXX` con el alfabeto base32 `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (sin 0, 1, I ni O), 50 bits; vencimiento de 30/60/90 días o sin vencimiento (`lib/admin.ts`).
- Vista previa (`/admin/preview`): los códigos `PREVIEW` y `PREVIEW-PLAIN` (config/preview.json) solo existen con sesión de admin; para cualquier otro son inexistentes y cuentan como intento fallido. Con ellos no se lee ni se escribe nada en la base: `/api/answer` valida y responde sin guardar, y no se registran eventos. No pueden salir del generador de códigos porque contienen I y O.
- `/admin`: enlace mágico de Supabase Auth, solo para los correos de `ADMIN_EMAILS`; cada página, acción y descarga verifica la sesión. En desarrollo, `npm run admin:link -- correo` imprime un enlace sin enviar correo (no corre en producción).
- **Camino abierto** (`docs/OPEN_ENTRY.md`): Turnstile validado en el servidor; límite de sesiones nuevas por hash de IP; en producción el flag exige `IP_HASH_SALT`. El consentimiento del correo ("By continuing…", incluye tips de marketing) se guarda con fecha y versión del texto. Los anónimos sin correo se borran a los 30 días de creados; "Delete lead" borra toda la empresa y deja constancia en `deletion_log`.
- Política de privacidad visible; no pedir datos sensibles (de salud ni financieros personales) en el diagnóstico.
- Prueba de cliente incógnito ("Lo que vimos desde afuera"): hacerla con mensajes reales y honestos (una consulta genuina), sin hacerse pasar por otra empresa.

## 7. Hoja de ruta

| Etapa | Entregable | Criterio para avanzar |
|---|---|---|
| 0. Validación (ahora) | Prototipo de la fase 1 probado con 5–10 empresarios reales | ¿Reconocen sus problemas? ¿Quieren seguir a la fase 2? |
| 1. MVP de producción | Fase 1 en Next.js + Supabase, códigos, informe por correo, panel interno básico | Funciona de punta a punta con 20 empresas |
| 2. Fase 2 | `phase2.config.json`, bloques con pausa, informe completo, agenda | % de quienes terminan la fase 1 y pasan a la fase 2 |
| 3. Integraciones | CRM, PostHog, Google Places para la vista externa | Leads llegan al CRM con puntaje |
| 4. Calibración | Ajuste de pesos con datos de 30+ diagnósticos; casos propios en el banco de evidencia | Correlación puntaje ↔ cierre |

## 8. Registro de cambios de pesos, topes y umbrales

Regla: cada cambio de un peso, tope o umbral de la calificación (constantes de `lib/scoring.ts`, fórmulas de §3 y §4, o
puntajes de las opciones en los configs) agrega una fila aquí **en el mismo commit**, con la fecha, el valor anterior y
el nuevo, y el motivo (y los datos que lo justifican, cuando los haya). Antes del 2026-11-02 rigen los valores iniciales
de §3, sin registro.

| Fecha | Qué | Antes → después | Motivo | Commit |
|---|---|---|---|---|
| 2026-11-02 | Situación: `SMALL_STAKES_ANNUAL`, `DEMAND_*`, `OFFER_*`, `SCALE_*` (§3) | — → $30,000; 4 / 10 / 1 consultas; 5 consultas y $300; 20 consultas, 10 % y índice 70 | Separar "cerrar fugas" de demanda, oferta y escala; hipótesis inicial a calibrar con 30 diagnósticos | `d784402` |
| 2026-11-02 | Veredictos `demand` y `offer` | fórmula Need / Potential → veredicto propio | Con poca demanda o ticket bajo, el problema no es de seguimiento | `d784402` |
| 2026-11-02 | `scale` solo declarado (0 perdidas sin confirmar) | "Alta prioridad" / "Nutrir" → como máximo "Optimización selectiva" | Lo declarado se verifica en la llamada antes de priorizar | `923ae31` |
| 2026-11-10 | Readiness al terminar la fase 2 (`READINESS_WEIGHTS`) | preliminar `40 + 20 + 15 + 10`, tope 85 → `0.30·capacidad + 0.25·decisión + 0.25·presupuesto + 0.20·plazo` | La fase 2 mide capacidad, decisión, presupuesto y plazo; hipótesis a calibrar | `bdf317c` |
| 2026-11-10 | Tope por presupuesto (`LOW_BUDGET_READINESS_CAP`) | sin tope → con menos de $400 al mes, Readiness máximo 50 | En los casos de prueba, un negocio con presupuesto mínimo llegaba a 62 y pasaba a "Alta prioridad"; corte en $400 decidido por el dueño del producto | `bdf317c` |
| 2026-11-10 | Umbral de "Alta prioridad" (Readiness ≥ 55) | 55 → 55 (sin cambio) | Revisado con 5 casos frente a la fórmula preliminar (`docs/PHASE2.md` §Readiness); se mantiene con el tope | `bdf317c` |

> **Cómo se guardan hoy los puntajes.** Need, Potential, Readiness, el veredicto y las alertas se calculan con funciones
> puras a partir de las respuestas guardadas. La tabla `scores` guarda además una **copia** que se recalcula con la
> fórmula vigente cada vez que llega una respuesta (`lib/server/diagnostic.ts`). El detalle de un lead en `/admin`
> recalcula al leer, desde las respuestas; la lista, el embudo y el CSV leen la copia de `scores`. Por eso, si cambia un
> peso, las filas de los leads que no vuelven a responder conservan el valor anterior hasta que se recalculen. Esto se
> resuelve en la etapa 3 de la fase 2 (persistencia).

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
| 4. Your numbers | calculadora (consultas/mes, valor del cliente, % que se escapa, tasa de cierre) | dinero en juego + escenario cauteloso (25%) |

\* Se omite si el código ya trae el rubro.

### Pilares (fase 1 → 0-100)
`access` (primera respuesta), `pipeline` (registro de consultas), `followup`, `reputation`, `owner` (independencia del dueño).
Cada opción aporta un puntaje a uno o más pilares; el pilar es el promedio de sus aportes.
Pilares de la fase 2: `retention`, `visibility`, `readiness` (se muestran en gris con candado en la fase 1).

### Porcentaje que se escapa (valor por defecto de la calculadora)
```
base por followup: auto 8 | set 15 | once 30 | wait 40   (sin respuesta: 25)
+ afterhours: none/dk +8, auto +3
+ speed: next/dk +7, day +3
+ busy = d: +5
límites: 5–65 %
```
Cálculo:
```
missed   = inquiries × leak%
monthly  = missed × close% × value
cautious = monthly × 0.25
adLeak   = adSpend × leak%
```

### Arquetipos (orden de evaluación)
1. `ready` si índice promedio ≥ 70
2. `leaky` si invierte en publicidad y (access < 55 o followup < 55)
3. pilar más bajo: `owner` → `bottleneck`, `reputation` → `secret`, otro → `silent`

"What to fix, in order": pilares < 70, priorizando los del arquetipo y luego de menor a mayor; máximo 3. El primero muestra "Your first step".

### Calificación interna (vista del equipo; provisional, calibrar con datos reales)
```
Need      = 100 − índice promedio
Potential = inquiries(≥100:40, ≥50:30, ≥20:20, else 10)
          + value(≥5000:35, ≥1000:28, ≥300:18, else 8)
          + (ads > 0 ? 15 : 0) + (team > 1 ? 10 : 0)          tope 100
Readiness = 40 + (ads > 0 ? 20) + (tracking crm|sheet ? 15) + (team > 1 ? 10)   tope 85 (preliminar)
```
Veredicto:
- Need ≥ 50 y Potential ≥ 60 → Readiness ≥ 55 ? **Alta prioridad** : **Nutrir**
- Need ≥ 50 → **Preparar primero**
- Potential ≥ 60 → **Optimización selectiva**
- otro → **Bajo encaje por ahora**

Alertas: no mide tiempo de respuesta · volumen bajo (<20/mes) · paga por leads que se pierden · dueño cuello de botella (owner ≤ 25) · trabaja solo.

> Los pesos y umbrales son una hipótesis inicial. Después de 30 diagnósticos reales, comparar los puntajes con quién avanzó a llamada y quién cerró, y ajustar.

## 4. Fase 2 (por construir)

8 bloques, unas 3-4 preguntas cada uno, con un mini-hallazgo al cerrar cada bloque y pausa permitida entre bloques.

| Bloque | Mide | Preguntas tentativas |
|---|---|---|
| 1. Customer journey | recorrido completo | Del primer contacto al pago, ¿cuántos pasos hay? ¿Dónde se traba más gente? ¿Qué pasa después de la venta? |
| 2. Pipeline & follow-up | pipeline, followup | ¿Cuántas cotizaciones abiertas hay hoy? ¿Sabes su valor total? ¿Registras por qué pierdes ventas? ¿Quién es responsable de cada oportunidad? |
| 3. Retention & LTV | retention | ¿Cada cuánto vuelve un cliente? ¿Le recuerdas renovaciones o mantenimientos? ¿Tienes una lista de clientes anteriores que puedas contactar? ¿Pides referidos con un proceso? |
| 4. Reviews & proof | reputation | ¿Respondes las reseñas: todas, solo las malas, ninguna? ¿Tienes testimonios en video o casos con números? ¿Dónde los usas: web, anuncios, cotizaciones? → tarjeta FTC 2024 |
| 5. Advertising & marketing history | demand, ads | ¿Cuánto inviertes y en qué? ¿Trabajaste con agencias? ¿Qué pasó? ¿Sabes qué anuncio trajo a qué cliente? → mito "marketing doesn't work" |
| 6. Visibility & forecasting | visibility | ¿Sabes tu tasa de cierre? ¿Tu costo por cliente? ¿Puedes proyectar los ingresos del próximo trimestre? |
| 7. Team & capacity | readiness, owner | ¿Quién atendería un sistema nuevo? ¿Puedes absorber un 30% más de clientes? ¿Quién responde este diagnóstico? |
| 8. Technology history & readiness | readiness | ¿Qué herramientas probaste y por qué las dejaste? ¿Quién decide la inversión? Rango de presupuesto mensual. ¿Cuándo quieres resolver esto? |

Reglas de la fase 2:
- Las preguntas de presupuesto y decisión van **solo** en el bloque 8.
- "Burned by tech" (probó y abandonó herramientas) **no descalifica**: sube el peso de la oferta de servicio gestionado y del acompañamiento.
- Resultado final: informe completo + ruta en 3 fases (Captura y organización → Atención y seguimiento → Medición y crecimiento, adaptada a lo que ya tiene) + CTA para agendar.

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
| Agenda | **Cal.com** o **Calendly** (link) | CTA final |
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
- **El código no se muestra en el camino abierto**: va en la URL, pero los textos usan las variantes `…Open` (resultados, "Save and finish later", bienvenida, informe y correos).
- **Inicio abierto en producción**: el flag además exige `IP_HASH_SALT`, y Turnstile debe responder con el hostname de `NEXT_PUBLIC_APP_URL` y la acción `start`.
- **`answered`**: cada `POST /api/answer` válido. Upsert en `answers` (la calculadora se guarda como un objeto con los campos que el usuario movió), actualiza `last_question_id` y recalcula la fila de `scores`. La respuesta de la API nunca incluye puntajes.
- **`phase_done`**: con el botón "See my results" (`complete: true`), si no queda ninguna pregunta visible sin responder. Una sola vez por sesión: fija `completed_at` y el estado pasa a `p1_done`. El estado nunca retrocede.
- **Correo del informe** (Resend): una sola vez por código (si ya hay un `email_sent` con `kind = "report"`, no se repite), al correo de `access_codes.email`, con el link a `/r/[code]`: al registrar `phase_done` si el código ya tenía correo, o al dejar el correo después en la pantalla del correo o en el parcial. Sale después de responder (no demora al prospecto). Sin correo en el código no se envía. Se registra `email_sent` con `payload.kind = "report"`.
- **Pantalla del correo** (`/x/[code]/email`, docs/OPEN_ENTRY.md §1): al terminar la fase 1, si el código no tiene correo, resultados lleva primero a esta pantalla, en los dos caminos (`lib/flow.ts`: `needsEmailStep`). Nombra el regalo que tocaría con las respuestas. "Skip" lleva a resultados con `?skip=1`: en el camino abierto, al parcial; un invitado ve el resultado completo. Al dejar el correo se guarda solo si el código no tenía uno (nunca se reemplaza), con `email_consent_at` y `email_consent_version` (`EMAIL_CONSENT_VERSION` en `lib/email.ts`; se cambia cuando cambia el texto "By continuing…"), se registra `email_captured` (`payload.from`: `screen` | `partial`, `payload.open`, `payload.consent`) y sale el informe si la fase terminó.
- **Regalo** (`lib/gifts.ts`, docs/OPEN_ENTRY.md §2): A (Potential ≥ 60 y Need ≥ 50, 3 días hábiles) o B (el resto, 2 días hábiles); los plazos están en `copy.gifts` del config. Se **ofrece** una sola vez por código cuando el código tiene correo y la fase 1 terminó, al mostrar el resultado completo o al enviar el informe (lo que pase primero): fila en `gifts` (`kind`, `offered_at`, `due_at`) y evento `gift_offered` (`payload.gift`, `payload.due_at`). Queda fijo aunque después cambien las respuestas. `due_at` = medianoche de Nueva York al terminar el día hábil número N contado desde el día siguiente (lunes a viernes, `America/New_York`, sin feriados). El resultado completo muestra el bloque del regalo y el informe por correo agrega una línea con su nombre. El prospecto nunca ve los puntajes que lo deciden. Si falla (p. ej. sin la migración), la pantalla y el informe siguen sin regalo.
- **Resultado parcial** (`lib/flow.ts`: `resultsMode`): solo empresas `source = open` sin correo. Muestra arquetipo, índice y la cifra principal del dinero en juego; el desglose, los pilares, los hallazgos, el primer paso, lo que no necesita, el panel de la fase 2 y el regalo quedan para después del correo. Debajo, el bloque para desbloquear (mismo formulario que la pantalla del correo); al dejarlo, el resultado completo con el aviso "Unlocked…" (`?unlocked=1`). `/r/[code]` del camino abierto sin correo lleva al parcial. Los invitados siempre ven el resultado completo.
- **"Save and finish later"** (en cada pregunta y en el panel de la fase 2): guarda lo pendiente y envía el link `/x/[code]` al correo del código. Si el código no tiene correo, lo pide y lo guarda (nunca reemplaza uno existente). Máximo 3 por código y por hora. `email_sent` con `payload.kind = "resume"`.
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
/x/[code]/phase-2/...  bloques de la fase 2
/r/[code]              informe compartible (solo lectura)
/admin                 panel interno (protegido con Supabase Auth): lista, embudo, puntajes, vista del equipo
/admin/preview         vista previa de todas las pantallas, variantes de insights y los 5 arquetipos (solo lectura)
/api/answer            POST: guarda respuesta y recalcula puntajes
/api/crm-sync          webhook al CRM cuando termina una fase
```

## 6. Seguridad, privacidad y cumplimiento (EE. UU.)

> Informativo; que un abogado revise los textos finales.

- **CAN-SPAM** (correos de prospección): asunto veraz, identificarse como mensaje comercial, dirección física postal y forma clara de darse de baja respetada en 10 días hábiles.
- **TCPA**: si el sistema que se implemente al cliente envía SMS o llamadas automatizadas, requiere consentimiento previo del destinatario.
- **Regla de la FTC sobre reseñas y testimonios** (vigente desde el 21-oct-2024): nada de reseñas falsas o generadas con IA, incentivos condicionados a reseñas positivas, filtrar o suprimir reseñas negativas, ni reseñas de empleados sin divulgarlo. Las solicitudes de reseña deben enviarse a **todos** los clientes, no solo a los satisfechos.
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

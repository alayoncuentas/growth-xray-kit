# Camino abierto (sin código): decisiones aprobadas

Estado: **aprobado; construido en `feature/open-entry` (sin publicar).** Hecho: el inicio (botón, Turnstile, límite por IP, UTM y referrer, empresa + código + sesión; detrás del flag), la migración, los datos del negocio, el código oculto en el camino abierto, la pantalla del correo con consentimiento, el resultado parcial, los regalos (ofrecimiento, plazos, bloque en resultados y línea en el informe), el panel (origen, UTM, referrer, filtro, contador de regalos y "Mark delivered"), el cron diario de borrado, "Delete lead", la vista previa de las pantallas nuevas y el noindex del entorno de pruebas. Falta: `/privacy` (con eso se puede encender el flag), el sync con GHL (`/api/crm-sync`) y el procedimiento de borrado en Resend. Este documento manda sobre `docs/SPEC.md` en todo lo que toca el camino abierto.
Los textos de interfaz van en **inglés y en español**, con la misma estructura, en `config/phase1.config.json` y `config/phase1.config.es.json` (lo verifica `lib/config.test.ts`). Los del panel van solo en inglés, en `config/team.config.json`. Aquí se copia el inglés como referencia aprobada; el español es su traducción (neutro latinoamericano, tuteo).
**Idioma sin código**: el elegido con el botón EN / ES (cookie); si no, el del navegador (`Accept-Language`); si no es inglés ni español, inglés. La sesión anónima nace con ese idioma (`access_codes.lang` y `sessions.lang`).

El camino con código de invitación (`/x/[code]`) se mantiene igual.

### Decisiones tomadas al planear la construcción (2026-10-26)

1. **Base de desarrollo aparte**: las pruebas con el flag encendido van contra un proyecto de Supabase de desarrollo, creado con `supabase/dev-setup.sql`. La migración en producción la aplica el dueño después de probar.
2. **El parcial muestra el dinero en juego** (cifra principal), además de arquetipo e índice. Quedan bloqueados: el desglose, el primer paso, "What to fix" y el regalo.
3. **Días hábiles**: lunes a viernes, zona `America/New_York`, **sin feriados** por ahora.
4. **Invitados sin correo ven el resultado completo.** La pantalla del correo les aparece como opcional, con el regalo como incentivo. El parcial aplica solo a empresas `source = 'open'` sin correo.
5. **Borrado a 30 días desde la creación** de la empresa (no desde la última actividad).
6. **Consentimiento**: "By continuing…" con el texto de los tips, registrado con fecha y versión (`access_codes.email_consent_at` / `email_consent_version`).
7. **"Delete lead" borra toda la empresa** (todos sus códigos), con constancia en `deletion_log`.
8. **El regalo queda fijo al ofrecerlo**, aunque después cambien las respuestas.
9. Se acepta que el límite por IP no sea atómico (contar y luego insertar): en una carrera puede pasar uno de más.
10. **En producción, el flag exige `IP_HASH_SALT`**: sin sal, el camino abierto queda apagado.

### Orden de despliegue (obligatorio)

1. **Aplicar primero las migraciones en producción**, en orden, en el SQL editor de Supabase: `supabase/migrations/20261027000000_open_entry.sql` y después `20261028000000_open_industry.sql` (rubro de las empresas abiertas desde sus respuestas). Son aditivas y se pueden correr más de una vez; el código publicado hoy sigue funcionando con ellas.
2. **Después, publicar el código** (merge a `main`).

Por qué: aunque `OPEN_ENTRY_ENABLED` esté apagado, desde la pantalla del correo los **invitados sin correo** ya ven esa pantalla al terminar la fase 1, y "Save and finish later" guarda el consentimiento. Las dos cosas escriben `access_codes.email_consent_at` / `email_consent_version`, y el regalo usa la tabla `gifts`. Si el código sale antes que la migración, dejar el correo falla con "We couldn't save that…" (el regalo se omite sin romper la pantalla). Lo mismo vale para el panel (origen, regalos) y el cron.

---

## 1. Flujo

```
/  (inicio)
  → [Start my X-Ray]  (principal; detrás de OPEN_ENTRY_ENABLED)
      → Turnstile + límite por IP (servidor)
      → crea empresa + código interno + sesión anónima (source = open)
      → pregunta de rubro (sin bienvenida)
      → datos del negocio: nombre (obligatorio) + web (opcional)
      → resto de la fase 1 (las mismas preguntas, insights y calculadora)
      → pantalla del correo
          ├─ deja el correo → resultado completo + informe por correo + regalo
          └─ "Skip for now"  → resultado parcial (puede volver a dejar el correo desde ahí)
  → [Have an access code?]  (secundario: el formulario de código actual)
```

- **Sesión anónima**: tiene su propio código interno, generado con el mismo generador (`lib/admin.ts`, `XXXXX-XXXXX`). La interfaz nunca lo muestra a quien entró por el camino abierto (por ejemplo, se oculta "Your answers are saved to code …"). El código sí va en la URL (`/x/[code]/…`): así funcionan retomar y "Save and finish later".
- **"Save and finish later"** en el camino abierto pide el correo, como ya hace cuando el código no tiene correo. Debajo del campo va el mismo texto "By continuing…", y al guardar el correo se registran `email_consent_at` y `email_consent_version` y el evento `email_captured` (`from: later`), igual que en la pantalla del correo.
- **Pantalla del correo**: aparece siempre que el código no tenga correo. En el camino abierto, "Skip" lleva al parcial; para un invitado sin correo es opcional y "Skip" lleva al resultado completo. Los invitados con correo ven el resultado completo como hoy (y también reciben regalo).
- **Resultado parcial (sin correo, solo camino abierto)**: arquetipo, índice y dinero en juego (cifra principal), con valor real suficiente para decidir si continuar. Debajo, el bloque para desbloquear con el correo. Si no deja el correo, puede seguir viendo el parcial.
- **El correo desbloquea**: el desglose del dinero en juego, los hallazgos ("What to fix, in order"), el primer paso, el envío del informe (`/r/[code]`) y el regalo.


## 2. Regalo según calificación

Se calcula con la vista del equipo (`lib/scoring.ts`), pero el prospecto nunca ve Need, Potential ni Readiness: solo ve qué regalo le tocó.

| Regalo | Regla | Plazo |
|---|---|---|
| **A** · Free response-time test + website review | Potential ≥ 60 **y** Need ≥ 50 | 3 días hábiles |
| **B** · Free Google reviews audit | todos los demás | 2 días hábiles |

- Los plazos van en el config (no en el código).
- **Ofrecido** = cuando el código tiene correo y se muestra el regalo. Se registra el evento `gift_offered` con `{ gift: "A" | "B", due_at }`.
- **Panel**: cada regalo pendiente muestra cuántos días hábiles le quedan; si está vencido, en rojo. Botón "Mark delivered", que registra `gift_delivered`.
- El correo del informe agrega una línea con el regalo.

## 3. Seguridad y datos

- **Cloudflare Turnstile** en el inicio abierto (widget *Managed*, hostname `xray.123spice.com`). Se valida en el servidor (`siteverify`) antes de crear la sesión.
- **Límite de sesiones nuevas por IP**: 5 por hora y 20 por día, con el mismo hash de IP de `access_attempts`, contadas en la tabla `open_starts` (aparte de `access_attempts`, para que empezar no bloquee el ingreso con código).
- **UTM y referrer**: primer contacto (first touch). Se capturan al llegar a `/` y se guardan en la empresa al tocar "Start my X-Ray". Las 5 claves `utm_*`, sin caracteres de control y recortadas a 200 caracteres (referrer: 500) sin partir emojis. Si los campos ocultos del formulario no traen UTM, se toman de la URL de la página (el Referer de la acción, solo del propio sitio).
- **Migración** `supabase/migrations/20261027000000_open_entry.sql` (detalle en `docs/SPEC.md` §5):
  - `companies`: `source` (`invited` | `open`), `utm jsonb`, `referrer`; `name` opcional solo para `open`.
  - `access_codes`: `email_consent_at`, `email_consent_version`.
  - Tablas `gifts`, `open_starts` y `deletion_log`; función `cleanup_expired()` para el cron.
  - `events.type` suma `email_captured`, `gift_offered` y `gift_delivered` (los de GHL se agregan con el sync).
- **Panel**: origen (Invited / Open), UTM y referrer en el detalle y en la lista; filtro por origen.
- **Borrado automático** (Vercel Cron, una vez por día, protegido con `CRON_SECRET`):
  - sesiones anónimas (`source = open`) **sin correo** con más de 30 días: se borra la empresa (en cascada: código, sesiones, respuestas, puntajes, eventos);
  - `access_attempts` con más de 24 horas.
- **"Delete lead"** en `/admin`: borra la empresa y todo lo asociado en Supabase **y** el contacto en GHL. Confirmación antes de borrar.

## 4. Flag `OPEN_ENTRY_ENABLED`

- Variable de entorno del servidor. **Apagada por defecto** (sin la variable, o con cualquier valor distinto de `true`).
- Apagada: el inicio muestra solo el ingreso con código, y la acción que crea sesiones anónimas responde error aunque alguien la llame directo.
- Se enciende solo después de publicar `/privacy` sin placeholders.
- El resto (migración, panel, regalos para invitados, cron, Delete lead, GHL) se puede publicar con el flag apagado.

## 5. Privacidad

- **Solicitudes de privacidad** (acceso o borrado):
  - principal: un **formulario de GHL**;
  - alternativo: correo **privacy@[DOMINIO CORRECTO]**.
- Los contactos que llenan el formulario llevan la etiqueta **`privacy-request`** y se **excluyen de marketing**.
- El **borrado** cubre Supabase, GHL y Resend.
  - Supabase y GHL: "Delete lead".
  - Resend: **manual por ahora**. "Delete lead" no lo toca (lo dice la pantalla). Pendiente: verificar qué permite su API (registros de envío y contactos) y documentar el procedimiento.
- **"Delete lead"** (construido): confirmación escribiendo el nombre del negocio (o el código), GHL primero (si no responde, no se borra nada), después la empresa en cascada y la constancia en `deletion_log`. El gancho de GHL (`lib/server/crm.ts`) busca cada correo con `GET /contacts/search/duplicate` y borra con `DELETE /contacts/{id}` (API v2, `Version: 2021-07-28`); está probado con un `fetch` simulado, **no contra una cuenta real**: verificarlo antes de configurar las variables.
- **`/privacy`** debe nombrar como proveedores a **Supabase, Vercel, Resend y GHL**.
  - Pendiente de confirmar: Turnstile es de **Cloudflare** y también procesa datos del navegador; probablemente deba nombrarse.
- La parte de hechos de `/privacy` (qué se guarda, para qué, retención) se redacta a partir del código; la parte legal (empresa, dirección, contacto, derechos, menores, cambios) la completa el dueño. La página no se publica mientras quede un placeholder.
- `IP_HASH_SALT` debe estar puesta en Vercel para poder decir que la IP se guarda como hash de una vía.
- El consentimiento incluye "occasional tips": eso es correo de marketing y necesita baja funcional y dirección física (CAN-SPAM) en la herramienta desde la que salgan.

## 6. Integración con GoHighLevel (`/api/crm-sync`)

- **Cuándo**: al terminar la fase 1 (`phase_done`) y, en el camino abierto, al dejar el correo.
- **Cómo**: upsert de contacto por correo (API de LeadConnector, con `GHL_PRIVATE_INTEGRATION_TOKEN` y `GHL_LOCATION_ID`).
- **Campos**: nombre, correo, negocio, rubro, arquetipo, índice, Need, Potential, Readiness, veredicto, tipo de regalo, origen y UTM. Los campos que no son estándar se crean como *custom fields* en GHL.
- **Etiquetas**: `xray-completed`, el arquetipo (p. ej. `xray-leaky`) y el regalo (p. ej. `xray-gift-a`).
- **Evento** `crm_synced` con el id del contacto en GHL.
- **Reintento sin romper la pantalla**: la sincronización corre después de responder (`after()`), nunca bloquea ni muestra errores al prospecto. Si falla, se reintenta (por ejemplo, desde el cron diario: fases terminadas o correos sin `crm_synced` posterior).
- Sin un correo no se sincroniza.
- Variables: `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`.

## 7. Cambio de principio en `docs/SPEC.md` §1

Antes: "El resultado de la fase 1 se entrega completo, sin retener información a cambio de nada."
Ahora: **"Valor primero; resultado completo a cambio del correo"**, en el camino abierto. Sin correo se ve un resultado parcial con valor real; el correo desbloquea el desglose, los hallazgos, el primer paso, el informe y el regalo. Los invitados siempre ven el resultado completo (decisión 4).

## 8. Variables de entorno nuevas

| Variable | Dónde | Para qué |
|---|---|---|
| `OPEN_ENTRY_ENABLED` | Vercel (y `.env.local` para probar) | Enciende el camino abierto. Apagada por defecto. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel y `.env.local` | Clave pública de Turnstile. En local: `1x00000000000000000000AA` (prueba de Cloudflare). |
| `TURNSTILE_SECRET_KEY` | Vercel y `.env.local` | Clave secreta de Turnstile. En local: `1x0000000000000000000000000000000AA`. |
| `CRON_SECRET` | Vercel | Protege la tarea diaria de borrado y reintentos. |
| `GHL_PRIVATE_INTEGRATION_TOKEN` | Vercel y `.env.local` | Token de la integración privada de GHL. |
| `GHL_LOCATION_ID` | Vercel y `.env.local` | Subcuenta (location) de GHL. |
| `IP_HASH_SALT` | Vercel | Ya existe en el código; debe estar puesta en producción (sin ella el flag no enciende). |
| `NEXT_PUBLIC_APP_URL` | Vercel | Ya existía. Si contiene `xray-test` (entorno de pruebas), todas las páginas salen con `noindex` (metadata y cabecera `X-Robots-Tag`); se lee al compilar. |

Todas están en `.env.example`.

Todas se agregan a `.env.example` sin valores.

## 9. Textos aprobados (referencia para el config)

### Inicio (`/`)
```
Eyebrow:     Free diagnostic · About 10 minutes
Title:       Find out where new customers slip away.
Sub:         Answer 12 quick questions about how you handle new inquiries.
             You'll see where they slip through and roughly what it costs you.
Button:      Start my X-Ray
Note:        No sign-up to start. Your answers save as you go.
Secondary:   Have an access code?
  Label:     Access code   ·  placeholder XXXXX-XXXXX  ·  button: Continue
Errors:
  Turnstile: We couldn't confirm the request. Refresh the page and try again.
  Limit:     Too many new diagnostics from this connection. Try again later,
             or use the link in your email if you have one.
```
Agregados al construir (no estaban en la aprobación; en `copy.start` de los dos configs):
```
Verifying:   Checking your connection…        (mientras Turnstile no da el token)
Flag off:    Starting without a code isn't available right now. If you have an
             access code, use it below.       (si alguien llama la acción con el flag apagado)
Generic:     Something went wrong on our side. Try again in a minute.
```

### Datos del negocio (después de la pregunta de rubro)
```
Title:       What's your business called?
Sub:         So we can tailor your results.
Field 1:     Business name          placeholder: e.g. Lakeview Plumbing
Field 2:     Website (optional)     placeholder: example.com
Button:      Continue
Errors:      Add your business name to continue.
             That website doesn't look right. Check it or leave it empty.
```
Agregado al construir (`copy.business.errorSave`): `We couldn't save that just now. Try again in a minute.`
Variantes sin código (`…Open` en `copy.unlock`, `later`, `welcome`, `results`, `report` y `email`): mismos textos sin mencionar el código; por ejemplo, el pie del correo dice "this address was entered on Growth X-Ray".

### Correo (antes del resultado completo)
```
Eyebrow:     Your results are ready
Title:       Where should we send your full results?
Sub:         You'll see everything here right away: what to fix first, your
             first step, and a private link to come back to.
Gift:        Also included: {giftTitle}
Field:       Email                  placeholder: you@yourbusiness.com
Button:      Show my full results
Skip:        Skip for now and see a summary
Error:       Enter a valid email address.

Consent:
  By continuing, you agree that we can email you your results, follow up about
  your {giftShort}, and send occasional tips on winning more customers.
  Unsubscribe anytime. Privacy policy
```

Agregados al construir (no estaban en la aprobación; en `copy.capture`):
```
Skip (invitado):  Skip for now and see my results    (un invitado sin correo ve el resultado completo)
Error al guardar: We couldn't save that just now. Try again in a minute.   (mismo texto que copy.business.errorSave)
```
"Privacy policy" enlaza a `/privacy` (todavía no publicada: el flag sigue apagado hasta entonces). Versión del consentimiento: `EMAIL_CONSENT_VERSION` en `lib/email.ts`.

### Resultado parcial (bloque para desbloquear)
```
Title:       See what to fix first
Text:        Add your email to unlock your findings, your first step and your
             {giftShort}. We'll also send you a private link to your results.
             [same field, button and consent as the email screen]
After:       Unlocked. We sent your results to {to}.
```

### Regalos
```
A · Potential ≥ 60 and Need ≥ 50
  Title:   Free response-time test + website review
  Short:   free response-time test
  Text:    We'll contact your business the way a new customer would, time how
           long the first reply takes, and send you what we found along with a
           5-minute review of your website within 3 business days.
  Status:  Requested. We'll email you at {to} to set it up.

B · Everyone else
  Title:   Free Google reviews audit
  Short:   free Google reviews audit
  Text:    We'll look at your Google profile and reviews the way a new customer
           sees them, and send you a short list of what to fix first within
           2 business days.
  Status:  Requested. We'll send it to {to} within 2 business days.
```

Línea en el correo del informe: `Your free extra: {giftTitle}. We'll email you separately to set it up.`

Agregado al construir (`copy.gifts.eyebrow`): `Your free extra` (encabezado del bloque del regalo en el resultado completo).

### Panel (`config/team.config.json`, solo inglés; agregados al construir)
```
Filtro:      All · Invited · Open            (sources.invited / sources.open; filterLabel: Source)
Sin nombre:  Unnamed business
Contador:    Gifts  {pending} pending · {overdue} overdue · {delivered} delivered
Chip:        Gift {kind} · {n} bd left | overdue | delivered
Detalle:     Origin · Source · UTM · Referrer · None
             Email consent: {date} · version {version} | Not recorded
             Gift · Offered · Due: {date} · end of day, New York
             {n} business days left | 1 business day left | Overdue
             Delivered {date} by {by} · [Mark delivered]
             No gift offered yet. It's offered once the lead has an email and finishes Phase 1.
Regalos:     A · Response-time test + website review · B · Google reviews audit
```

## 10. Al construir

- Hecho: `docs/SPEC.md` (flujo, rutas, modelo de datos, eventos, reglas de persistencia), la vista previa y los tests (regla del regalo, días hábiles, UTM, límites, flag, consentimiento, cron, Delete lead).
- La regla del regalo y el cálculo de días hábiles son funciones puras con tests (`lib/gifts.ts`).
- **Vista previa** (`/admin/preview`): suma el inicio abierto (`/?preview=open`, botón inactivo, aunque el flag esté apagado), los datos del negocio, la pantalla del correo (camino abierto con `?open=1` y regalo A; invitado con regalo B), el resumen parcial (`?partial=1`) y los resultados con cada regalo. Esos parámetros solo valen con un código de vista previa (sesión de admin); nada se guarda.

Textos de la vista previa agregados (panel, solo inglés): `Open entry`, `Start · open entry (shown only with OPEN_ENTRY_ENABLED; the button is inactive here)`, `Business details · after the industry question`, `Email screen · open entry (gift A)`, `Email screen · invited without an email (gift B)`, `Summary · open entry without an email`, `Results · with an email (gift A)` (antes `Results`) y `Results · with an email (gift B)`.

### Para publicar

1. Migraciones en producción (ver "Orden de despliegue").
2. Variables en Vercel: `CRON_SECRET` (el cron responde 401 sin ella), `IP_HASH_SALT`; las de Turnstile y GHL cuando corresponda.
3. Merge a `main` (el flag sigue apagado: el camino abierto no aparece).
4. Publicar `/privacy` sin placeholders y recién entonces `OPEN_ENTRY_ENABLED=true`.

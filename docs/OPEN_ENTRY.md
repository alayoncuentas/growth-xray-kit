# Camino abierto (sin código): decisiones aprobadas

Estado: **aprobado, sin construir.** Este documento manda sobre `docs/SPEC.md` en todo lo que toca el camino abierto.
Los textos de interfaz van en inglés y viven en `config/phase1.config.json` (y `config/team.config.json` para el panel); aquí se copian solo como referencia aprobada.

El camino con código de invitación (`/x/[code]`) se mantiene igual.

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
- **"Save and finish later"** en el camino abierto pide el correo, como ya hace cuando el código no tiene correo.
- **Pantalla del correo**: aparece siempre que el código no tenga correo, también para un invitado sin correo. Los invitados con correo ven el resultado completo como hoy (y también reciben regalo).
- **Resultado parcial (sin correo)**: arquetipo e índice, con valor real suficiente para decidir si continuar. Debajo, el bloque para desbloquear con el correo. Si no deja el correo, puede seguir viendo el parcial.
- **El correo desbloquea**: los hallazgos ("What to fix, in order"), el primer paso, el envío del informe (`/r/[code]`) y el regalo.

> Pendiente de confirmar: en la aprobación anterior el parcial también mostraba **dinero en juego**. Aquí queda "arquetipo + índice"; decidir si el dinero en juego entra en el parcial.

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
- **Límite de sesiones nuevas por IP**: 5 por hora y 20 por día, con el mismo hash de IP de `access_attempts`.
- **UTM y referrer**: primer contacto (first touch). Se capturan al llegar a `/` y se guardan en la empresa al tocar "Start my X-Ray".
- **Migración nueva** en `companies`:
  - `source text not null default 'invited' check (source in ('invited', 'open'))`
  - `utm jsonb` (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
  - `referrer text`
  - `name` pasa a ser opcional (se completa en la pantalla de datos del negocio).
  - Ampliar el `check` de `events.type` con `gift_offered`, `gift_delivered` y los que use la sincronización con GHL.
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
  - Resend: verificar qué permite su API (registros de envío y contactos) y documentar el procedimiento.
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
Ahora: **"Valor primero; resultado completo a cambio del correo."** Sin correo se ve un resultado parcial con valor real; el correo desbloquea los hallazgos, el primer paso, el informe y el regalo.

## 8. Variables de entorno nuevas

| Variable | Dónde | Para qué |
|---|---|---|
| `OPEN_ENTRY_ENABLED` | Vercel (y `.env.local` para probar) | Enciende el camino abierto. Apagada por defecto. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel y `.env.local` | Clave pública de Turnstile. En local: `1x00000000000000000000AA` (prueba de Cloudflare). |
| `TURNSTILE_SECRET_KEY` | Vercel y `.env.local` | Clave secreta de Turnstile. En local: `1x0000000000000000000000000000000AA`. |
| `CRON_SECRET` | Vercel | Protege la tarea diaria de borrado y reintentos. |
| `GHL_PRIVATE_INTEGRATION_TOKEN` | Vercel y `.env.local` | Token de la integración privada de GHL. |
| `GHL_LOCATION_ID` | Vercel y `.env.local` | Subcuenta (location) de GHL. |
| `IP_HASH_SALT` | Vercel | Ya existe en el código; debe estar puesta en producción. |

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

## 10. Al construir

- Actualizar `docs/SPEC.md` (flujo, rutas, modelo de datos, eventos, reglas de persistencia), la vista previa (`/admin/preview`: inicio abierto, datos del negocio, correo, parcial y los dos regalos) y los tests (regla del regalo, días hábiles, UTM, límites, flag).
- La regla del regalo y el cálculo de días hábiles van como funciones puras con tests.

# CLAUDE.md — Growth X-Ray

## Qué es este proyecto
Diagnóstico interactivo en dos fases para calificar negocios de servicios en EE. UU. y mostrarles dónde pierden clientes.
La especificación completa está en `docs/SPEC.md`. Léela antes de cualquier cambio de lógica.
El prototipo de referencia (comportamiento y diseño) está en `docs/prototype.html`.

## Stack
Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres) · Resend · Vercel.

## Reglas
- La interfaz para el usuario final va en **inglés** (EE. UU.). Comentarios y documentación pueden ir en español.
- Preguntas, opciones, puntajes, insights, mitos, evidencia y arquetipos viven en `config/phase1.config.json` (y `phase2.config.json`). **No hardcodear textos de preguntas en componentes.**
- Toda la lógica de puntaje va en `lib/scoring.ts` como funciones puras, con tests en `lib/scoring.test.ts`. Si cambias una regla, actualiza `docs/SPEC.md` en el mismo commit.
- Nunca agregar estadísticas sin `source` y `url` verificables en `evidence`. Nada de cifras sin origen.
- Mobile first: la mayoría de los usuarios responde desde el teléfono.
- Las respuestas se guardan en cada paso (`/api/answer`), para que el usuario pueda retomar con su código.
- La vista del equipo (Need / Potential / Readiness, alertas) solo existe en `/admin`; nunca se expone en rutas públicas.
- Los códigos de acceso se validan del lado del servidor, con limitación de intentos.

## Comandos
- `npm run dev` — desarrollo
- `npm test` — tests de puntaje
- `npm run lint`

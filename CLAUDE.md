# CLAUDE.md — Growth X-Ray

## Qué es este proyecto
Diagnóstico interactivo en dos fases para calificar negocios de servicios en EE. UU. y mostrarles dónde pierden clientes.
La especificación completa está en `docs/SPEC.md`. Léela antes de cualquier cambio de lógica.
El prototipo de referencia (comportamiento y diseño) está en `docs/prototype.html`.
El camino abierto (inicio sin código, datos progresivos, resultado parcial, regalos, Turnstile, UTM, privacidad y GHL) está definido en `docs/OPEN_ENTRY.md`: decisiones y textos aprobados. Léelo antes de tocar el inicio, los resultados, los regalos, `/privacy` o la integración con el CRM.

## Stack
Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres) · Resend · Vercel.

## Reglas
- La interfaz para el usuario final va en **inglés** (EE. UU.) y en **español** (neutro latinoamericano, tuteo), con el botón EN / ES. El panel `/admin` va en inglés. Comentarios y documentación pueden ir en español.
- Preguntas, opciones, puntajes, insights, mitos, evidencia y arquetipos viven en `config/phase1.config.json` y su versión en español `config/phase1.config.es.json` (y `phase2.config.json`). **No hardcodear textos de preguntas en componentes.** Todo texto nuevo va en los dos idiomas con la misma estructura (lo verifica `lib/config.test.ts`); en componentes se leen con `useConfig()` (`lib/i18n.tsx`) o `getConfig(lang)`.
- Toda la lógica de puntaje va en `lib/scoring.ts` como funciones puras, con tests en `lib/scoring.test.ts`. Si cambias una regla, actualiza `docs/SPEC.md` en el mismo commit.
- Nunca agregar estadísticas sin `source` y `url` verificables en `evidence`. Nada de cifras sin origen.
- Mobile first: la mayoría de los usuarios responde desde el teléfono.
- Las respuestas se guardan en cada paso (`/api/answer`), para que el usuario pueda retomar con su código.
- La vista del equipo (Need / Potential / Readiness, alertas) solo existe en `/admin`; nunca se expone en rutas públicas.
- Los códigos de acceso se validan del lado del servidor, con limitación de intentos.
- El camino abierto va detrás de `OPEN_ENTRY_ENABLED` (apagado por defecto) y no se enciende hasta que `/privacy` esté publicada.

## Comandos
- `npm run dev` — desarrollo
- `npm test` — tests de puntaje
- `npm run lint`

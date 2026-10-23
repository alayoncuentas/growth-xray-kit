# Cómo construirlo con Claude Code — prompts en orden

## Preparación (una vez)
1. Crea una carpeta vacía, por ejemplo `growth-xray`, y ábrela con Claude Code.
2. Copia ahí:
   - `CLAUDE.md` → raíz del proyecto
   - `SPEC.md` → `docs/SPEC.md`
   - `growth-xray.html` → `docs/prototype.html`
   - `phase1.config.json` → `config/phase1.config.json`
3. Crea un proyecto en Supabase y otro en Vercel. Ten a mano la URL y las claves de Supabase.

Usa un prompt por etapa. Revisa y prueba antes de pasar a la siguiente.

---

### Prompt 1 — Base del proyecto
> Lee CLAUDE.md, docs/SPEC.md y docs/prototype.html. Crea una app Next.js (App Router, TypeScript, Tailwind) en esta carpeta sin borrar los archivos de docs/ y config/. Copia el sistema visual del prototipo (colores en modo claro y oscuro, tipografías Bricolage Grotesque, IBM Plex Sans e IBM Plex Mono) como tokens de Tailwind. Todavía no conectes la base de datos. Antes de escribir código, muéstrame el plan de carpetas.

### Prompt 2 — Motor de puntaje con tests
> Implementa lib/scoring.ts con funciones puras que lean config/phase1.config.json: pillarScores, leakFromAnswers, calcVals, archetype, rankedFindings y teamView (Need/Potential/Readiness, veredicto y alertas), exactamente como en la sección 3 de docs/SPEC.md y en el prototipo. Escribe tests con Vitest que cubran cada arquetipo y los límites de leak (5 y 65). Corre los tests.

### Prompt 3 — Flujo de la fase 1 sin base de datos
> Construye el flujo de la fase 1 igual al prototipo: ingreso de código, bienvenida con "What we saw from the outside", una pregunta por pantalla con barra de 4 partes, insights según la respuesta, calculadora y página de resultados. Por ahora guarda el estado en memoria y usa el código de demo RIVERA-7F3K. Debe verse bien a 400 px de ancho.

### Prompt 4 — Supabase
> Crea las migraciones de Supabase para las tablas de la sección 5 de docs/SPEC.md. Implementa /x/[code] (valida el código del lado del servidor, con limitación de intentos), /api/answer (guarda la respuesta y recalcula los puntajes en la tabla scores) y la opción de retomar desde la última pregunta. Registra eventos (link_opened, answered, phase_done). Usa variables de entorno para las claves; nunca las escribas en el código.

### Prompt 5 — Panel interno
> Crea /admin protegido con Supabase Auth (solo mi correo). Debe mostrar la lista de empresas con su estado (sent, opened, p1_done, p2_done, booked), el arquetipo, Need/Potential/Readiness, monto en juego y alertas; un embudo simple; y el detalle de cada empresa con sus respuestas y la "vista del equipo" del prototipo. Agrega un formulario para crear empresas y generar códigos (8+ caracteres, base32, sin ambigüedades) y exportarlos en CSV para la herramienta de correos.

### Prompt 6 — Informe y correo
> Al terminar la fase 1, envía con Resend un correo con un link al informe de solo lectura /r/[code]. Agrega el botón "Save and finish later", que envía el link para retomar. Textos en inglés, cortos, sin lenguaje de venta agresivo.

### Prompt 7 — Fase 2
> Crea config/phase2.config.json a partir de la tabla de la sección 4 de docs/SPEC.md: 8 bloques con 3-4 preguntas cada uno, opciones situacionales en inglés, puntajes para retention/visibility/readiness y un insight al cerrar cada bloque. Usa solo la evidencia que ya está en phase1.config.json, o marca con TODO_SOURCE las que necesiten fuente. Muéstrame el JSON antes de construir la interfaz.

### Prompt 8 — Integraciones
> Agrega: (1) webhook a [HubSpot / GoHighLevel] al terminar cada fase, creando o actualizando el contacto con arquetipo, puntajes, alertas y monto en juego; (2) PostHog con un evento por pregunta vista y respondida; (3) un script que, dado un google_place_id, traiga rating, cantidad de reseñas y fecha de la reseña más reciente con Google Places API y lo guarde en companies.outside_view.

---

## Consejos
- Si Claude Code propone cambiar la lógica de puntaje, pídele que actualice primero docs/SPEC.md y los tests.
- Para cambiar textos o preguntas, edita solo el JSON de configuración.
- Haz deploy en Vercel desde la etapa 3 y prueba en tu teléfono.

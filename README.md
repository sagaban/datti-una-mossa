# Datti una mossa

PWA para repasar italiano en ratos libres, pensada para hispanohablantes. Funciona offline y guarda todo en el dispositivo.

## Qué tiene

- **Repaso con repetición espaciada (FSRS v6, vía `ts-fsrs`)**: cada tarjeta vuelve justo antes de olvidarla.
- **Primero ves, después recordás**: lo nuevo se presenta y se pregunta unas tarjetas más tarde, en la misma sesión.
- **Autoevaluación** en cada respuesta (Otra vez / Difícil / Bien / Fácil, con el intervalo resultante). En las respuestas escritas la app corrige y sugiere una nota: tolera acentos, artículos faltantes y errores de tipeo.
- **Test por nivel** (A1 a C1): 20 preguntas mezcladas, resultado por área y opción de mandar los errores al repaso.
- **Contenido**: ~420 palabras en 20 temas (A1–C1, con expresiones idiomáticas), 136 verbos en 11 tiempos (incluido el passato remoto) y con reflexivos (conjugador con reglas + irregulares), 52 lecciones de gramática de A1 a C1 con 352 ejercicios y 39 falsos amigos español–italiano.
- Pronunciación con la voz italiana del sistema (Web Speech API).
- Secciones para recorrer vocabulario (con audio y estado de cada palabra), gramática y verbos, con práctica libre.
- Exportar/importar el progreso en JSON.

## Desarrollo

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm test
pnpm typecheck
pnpm build      # dist/client: sitio estático + service worker
pnpm preview
```

TanStack Start en **modo SPA**: el build prerenderiza un shell (`dist/client/index.html`) y `scripts/sw.mjs` genera el service worker con Workbox. Para publicarlo alcanza con cualquier hosting estático que reescriba las rutas desconocidas a `/index.html` (Netlify, Vercel, Cloudflare Pages).

## Estructura

- `src/data/`: contenido (vocabulario, verbos, gramática, falsos amigos)
- `src/lib/conjugate.ts`: conjugador
- `src/lib/answer.ts`: corrección de respuestas
- `src/lib/cards.ts`: catálogo de tarjetas y armado de preguntas
- `src/lib/store.ts`: estado en localStorage, scheduler FSRS, sesiones y estadísticas
- `src/routes/`: pantallas (file-based routing)

# Datti una mossa

PWA para repasar italiano en ratos libres, pensada para hispanohablantes. Funciona offline y guarda todo en el dispositivo.

## Qué tiene

- **Repaso con repetición espaciada (FSRS v6, vía `ts-fsrs`)**: cada tarjeta vuelve justo antes de olvidarla.
- **Primero ves, después recordás**: lo nuevo se presenta y se pregunta unas tarjetas más tarde, en la misma sesión.
- **Autoevaluación** en cada respuesta (Otra vez / Difícil / Bien / Fácil, con el intervalo resultante). En las respuestas escritas la app corrige y sugiere una nota: tolera acentos, artículos faltantes y errores de tipeo.
- **Test por nivel** (A1, A2, B1): 20 preguntas mezcladas, resultado por área y opción de mandar los errores al repaso.
- **Contenido**: ~340 palabras por temas, 62 verbos en 6 tiempos (conjugador con reglas + irregulares), 18 lecciones de gramática con 128 ejercicios y 39 falsos amigos español–italiano.
- Pronunciación con la voz italiana del sistema (Web Speech API).
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

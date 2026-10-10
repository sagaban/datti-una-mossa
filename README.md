# Datti una mossa

PWA para repasar italiano en ratos libres, pensada para hispanohablantes. Funciona offline y guarda todo en el dispositivo.

## Qué tiene

- **Repaso con repetición espaciada (FSRS v6, vía `ts-fsrs`)**: cada tarjeta vuelve justo antes de olvidarla.
- **Primero ves, después recordás**: lo nuevo se presenta y se pregunta unas tarjetas más tarde, en la misma sesión.
- **Autoevaluación** en cada respuesta (Otra vez / Difícil / Bien / Fácil, con el intervalo resultante). En las respuestas escritas la app corrige y sugiere una nota: tolera acentos, artículos faltantes y errores de tipeo.
- **Test por nivel** (A1 a C1): 20 preguntas mezcladas, resultado por área y opción de mandar los errores al repaso.
- **Contenido**: ~2.800 palabras en 107 temas (A1–C1, elegidas con una lista de frecuencias del italiano hablado y revisadas), 136 verbos en 11 tiempos (incluido el passato remoto) y con reflexivos, 52 lecciones de gramática de A1 a C1 con 352 ejercicios y 39 falsos amigos español–italiano.
- **Palabras transparentes** (≈ iguales al español y sin trampa de género ni falso amigo): sólo se practican en reconocimiento, no hace falta escribirlas.
- Pronunciación con la voz italiana del sistema (Web Speech API).
- Secciones para recorrer vocabulario (con audio y estado de cada palabra), gramática y verbos, con práctica libre.
- **Sincronización entre dispositivos** sin cuentas: un código aleatorio de 160 bits (o un link) empareja el celular y la compu. El progreso se guarda en Netlify Blobs bajo el hash del código; por tarjeta gana el repaso más reciente y las estadísticas se llevan por dispositivo. Funciona offline y sincroniza al abrir, al volver la conexión, al pasar a segundo plano y después de repasar.
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

TanStack Start en **modo SPA**: el build prerenderiza un shell (`dist/client/index.html`) y `scripts/sw.mjs` genera el service worker con Workbox. Se publica en Netlify (`netlify.toml`) con cada push a `main`: build `pnpm build`, carpeta `dist/client` y redirección de todas las rutas a `/index.html`.

## Estructura

- `src/data/`: contenido (vocabulario, verbos, gramática, falsos amigos)
- `src/lib/conjugate.ts`: conjugador
- `src/lib/answer.ts`: corrección de respuestas
- `src/lib/cards.ts`: catálogo de tarjetas y armado de preguntas
- `src/lib/store.ts`: estado en localStorage, scheduler FSRS, sesiones y estadísticas
- `src/lib/sync-core.ts`: fusión y validación de la sincronización (compartido con el servidor)
- `src/lib/sync.ts`: cuándo sincronizar, en el cliente
- `netlify/functions/sync.mts`: endpoint `/api/sync` (Netlify Function + Blobs)
- `src/routes/`: pantallas (file-based routing)

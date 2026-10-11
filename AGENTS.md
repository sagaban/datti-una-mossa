# AGENTS.md — Datti una mossa

Guía para agentes de IA (y personas) que trabajen en este repo. Leela entera antes de cambiar contenido o datos: hay invariantes que, si se rompen, **corrompen el progreso guardado de los usuarios** sin que falle ningún test.

## Qué es

PWA para aprender italiano en ratos libres, pensada para **hispanohablantes rioplatenses**. Es offline-first y no tiene cuentas.

- **Repaso con repetición espaciada:** FSRS v6 vía `ts-fsrs`, con tarjetas de vocabulario (IT→ES y ES→IT), verbos (conjugación), gramática (huecos) y falsos amigos.
- **Autoevaluación:** el usuario califica cada respuesta con 4 botones FSRS. En las respuestas escritas la app corrige y sugiere una nota (tolera acentos, artículo faltante y errores de tipeo).
- **Secciones para explorar:** Palabras (vocabulario por tema), Gramática (lecciones A1–C1 con práctica), Verbos (tablas de 11 tiempos), Test (autoevaluación por nivel) y Progreso.
- **Escucha (dictado):** la app lee una frase de un ejercicio de gramática ya practicado y se escribe completa.
- **Suspender tarjetas** y **reportar errores de contenido** desde el menú "⋯" de cada tarjeta.
- **Pronunciación:** botón 🎙️ con el reconocimiento de voz del navegador (`lib/pronounce.ts`). No afecta FSRS.
- **Puntos débiles** en Progreso (`weakCards`: lapses ≥ 2 o dificultad ≥ 8), con sesión propia (`/repaso?weak=true`).
- **Sincronización opcional entre dispositivos** con un código aleatorio (Netlify Function + Netlify Blobs).

Idioma: la UI, los comentarios y los commits van en **español rioplatense** (voseo: "tocá", "revisá"). El contenido de estudio es italiano estándar.

Producción: https://datti-una-mossa.netlify.app. Repo: https://github.com/sagaban/datti-una-mossa.

## Stack

- **TanStack Start en modo SPA** (`vite.config.ts`: `spa.enabled`). El build prerenderiza un shell en `dist/client/index.html` y todo se renderiza en el cliente. El estado vive en `localStorage`, por eso el layout raíz envuelve las rutas en `<ClientOnly>`.
- **React 19 + TanStack Router** con rutas por archivos en `src/routes/`. `src/routeTree.gen.ts` es generado: no lo edites a mano, se regenera con `pnpm dev` / `pnpm build`.
- **PWA:** `public/manifest.webmanifest` y un service worker generado con Workbox **después** del build, en `scripts/sw.mjs` (TanStack Start no tiene integración PWA oficial).
- **Netlify:** hosting estático + una función (`netlify/functions/sync.mts`) + Blobs (store `progress`).
- **Tests:** Vitest. TypeScript estricto.

## Comandos

```sh
pnpm install
pnpm dev          # http://localhost:3000 (la sincronización no funciona acá: no hay funciones)
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm build        # vite build + service worker → dist/client
pnpm preview      # sirve el build (ojo: hay que reiniciarlo después de cada build)
pnpm content:lock # regenera src/data/content-lock.json (sólo tras corregir entradas en el lugar)
```

- **pnpm 10:** `pnpm-workspace.yaml` declara `packages: ['.']`, así que para agregar dependencias hay que usar `pnpm add -w …`. No cambies de gestor de paquetes.
- Antes de commitear: `pnpm test && pnpm typecheck && pnpm build`.

## Deploy

Cada push a `main` se publica solo en Netlify (repo vinculado; config en `netlify.toml`: build `pnpm test && pnpm build` (si falla un test no se publica), publish `dist/client`, redirección SPA `/* → /index.html`, `sw.js` con `no-cache`). Para probar sin tocar producción: `netlify deploy --build`, que crea un deploy draft con función y Blobs reales.

⚠️ Las funciones y deploys draft usan el **mismo store de Blobs que producción**. Si probás la API, usá códigos aleatorios y borralos después (`DELETE /api/sync`).

## Mapa del código

```
src/
  data/                     contenido de estudio (TS puro, sin lógica)
    vocab/                  vocabulario por archivo/nivel; index.ts los une y ordena por nivel
      base.ts               temas originales + tipo VocabTheme + constante G
      vocab.test.ts         valida duplicados, verbos repetidos y formato
    verbs.ts                136 verbos (irregularidades declarativas) + LEVELS + TENSE_LEVEL
    grammar.ts              lecciones A1–B1 base; GRAMMAR = base + advanced + extra, ordenado por nivel
    grammar-advanced.ts     B2/C1
    grammar-extra.ts        temas que completan cada nivel
    falseFriends.ts         falsos amigos ES↔IT
    content-lock.json       candado de posiciones (ver invariante 1)
  lib/
    conjugate.ts            conjugador (regulares por reglas + irregulares + reflexivos + compuestos)
    cards.ts                catálogo de tarjetas (CATALOG), armado de preguntas e introducciones
    answer.ts               corrección de respuestas (acentos, artículo, typo)
    transparent.ts          palabras "fáciles" (≈ español): sin tarjeta ES→IT
    store.ts                estado en localStorage, FSRS, sesiones, estadísticas, payload de sync
    sync-core.ts            fusión/validación de sync: código puro compartido con el servidor
    sync.ts                 cuándo sincronizar (cliente)
    speech.ts               voz italiana (Web Speech API)
    pronounce.ts            reconocimiento de voz y comparación de lo dicho
    reports.ts              reportes de errores con cola offline
  components/               Practice (práctica libre), SpeakBtn, SyncPanel
  routes/                   index (inicio), repaso (sesión), vocab/, lezioni/, verbi/, test, progressi, impostazioni, sincronizar
netlify/functions/sync.mts  POST/DELETE /api/sync
netlify/functions/report.mts POST /api/report (reportes de errores → Blobs store `reports`)
scripts/sw.mjs              genera dist/client/sw.js
```

## Invariantes críticas (leer antes de tocar `src/data`)

### 1. Los ids de tarjeta dependen de la posición

El progreso FSRS se guarda por id de tarjeta:

| Tipo | Id | Depende de |
|---|---|---|
| Vocabulario | `v:{themeId}:{índice}:r` (IT→ES) y `…:p` (ES→IT) | id del tema + **posición** de la palabra |
| Verbo | `c:{infinitivo}:{tiempo}` | infinitivo + clave del tiempo en `TENSES` |
| Gramática | `g:{topicId}:{índice}` | id de la lección + **posición** del ejercicio |
| Falso amigo | `f:{índice}` | **posición** en `FALSE_FRIENDS` |
| Dictado | `d:{topicId}:{índice}` | id de la lección + **posición** del ejercicio (frase completa vía `dictationText`) |
| Lección vista | `g:{topicId}` en `data.seen` | id de la lección |

Por eso:

- **Nunca borres, insertes en el medio ni reordenes** palabras de un tema, ejercicios de una lección ni falsos amigos. Agregá **al final**. Para corregir una entrada, editala **en el lugar**; para eliminarla, reemplazala en el lugar por otra.
- **Nunca cambies** ids de tema o lección, infinitivos ni claves de tiempos (`'passato prossimo'`, `'congiuntivo'`, etc.).
- Mover un tema a otro archivo está bien (el id no cambia). Cambiar su `level` también: sólo afecta el orden de las tarjetas nuevas.
- **Candado de contenido:** `src/data/content-lock.test.ts` compara el contenido contra `src/data/content-lock.json`, que guarda qué hay en cada posición, y falla si algo se borró, se movió o se renombró. Agregar al final pasa sin tocar el candado. Si corregiste una entrada en el lugar, regenerá el candado con `pnpm content:lock` y revisá el diff del JSON: tiene que mostrar sólo las entradas que quisiste corregir. **Nunca regeneres el candado para "arreglar" un test que falla por haber reordenado o borrado contenido.**

### 2. Sincronización

- `sync-core.ts` no debe importar nada del navegador ni de la app: lo usa la Netlify Function.
- Fusión: **por tarjeta gana el `last_review` más reciente**. Las estadísticas diarias se guardan **por dispositivo** (`devices[deviceId][fecha]`) y se fusionan con `max`, nunca sumando: así sincronizar dos veces no duplica. `allDays()` en el store suma los dispositivos para mostrar.
- El historial de repasos (`data.logs`: `[cardId, ms, nota, estadoPrevio, segundos]`) también se sincroniza, como unión sin duplicados por `cardId|ms`. Sirve para optimizar los parámetros de FSRS más adelante. Hay un tope de 200.000 entradas; con el límite de 4 MB por sincronización alcanza para años, pero si crece mucho habrá que compactarlo.
- Si agregás campos a `Data` que deban viajar entre dispositivos, sumalos a `SyncPayload`, `parsePayload` (saneo), `mergePayload`, `toPayload` y `applyRemote`, con tests.
- Los commits locales del usuario llaman a `onLocalChange` (dispara la sync con debounce). Los que vienen de la sync usan `commit(…, { fromSync: true })` para no entrar en loop.
- El servidor guarda bajo `sha256(código)` y nunca el código. El código viaja en el header `x-sync-code`, y en los links va en el `#` (no se manda al servidor).
- Cambios de esquema en `localStorage` (`datti-una-mossa:v1`): `revive()` en `store.ts` tiene que completar con valores por defecto todo lo que falte, porque hay datos guardados de versiones anteriores.

### 3. Conjugador

Los verbos se declaran en `data/verbs.ts`; la lógica está en `lib/conjugate.ts`. Campos de `Verb`:

- `pp`: participio irregular
- `fut`: raíz de futuro y condicional
- `imp`: raíz de imperfetto, congiuntivo imperfetto y personas regulares del passato remoto
- `rem`: raíz del passato remoto en patrón 1-3-3
- `isc`: -ire con infijo
- `aux`: auxiliar
- `forms`: tablas completas por tiempo

Los reflexivos se detectan por terminar en `-si`. Las formas con `/` indican variantes: `andato/a` es concordancia de género y `credei/credetti` son alternativas, y `expandForms` las separa. Cada verbo o irregularidad nueva lleva su test en `conjugate.test.ts`.

### 4. Sesiones

- **Tarjetas nuevas:** salen de `CATALOG` (intercalado por área, nivel por nivel) empezando en `settings.startLevel`; los niveles anteriores quedan al final. El cupo `newPerDay` es por persona: se suma entre dispositivos.
- **Repasos:** se ordenan por vencimiento (los más atrasados primero) y se cortan en `settings.maxReviews` por día (0 = sin límite).
- **Atraso:** si quedan pendientes que no entran hoy, las nuevas se pausan (`buildSession`), salvo pedido explícito (`extraNew`).

- **Prerrequisitos:** la producción de vocabulario (`:p`) se habilita cuando su reconocimiento (`:r`) está en estado Review; el dictado `d:x:i`, cuando el ejercicio `g:x:i` lo está. El dictado además necesita la voz del sistema (`canSpeak()`).
- **Suspensiones:** `data.suspended[id] = { on, at }` se sincroniza por "gana el `at` más reciente", así reactivar también se propaga. En vocabulario se suspende la palabra entera (`:r` y `:p`).

## Reportes de errores de contenido

Los usuarios reportan errores desde el menú "⋯" de cada tarjeta. Llegan anónimos al store de Blobs `reports` con esta forma: `{ cardId, reason: traduccion|italiano|correccion|otro, comment, question, expected, given, at }`. Para procesarlos:

```sh
netlify blobs:list reports --json        # listar
netlify blobs:get reports "<key>"        # leer uno
```

1. Ubicá la entrada por `cardId` (ver tabla de ids): `v:` → `src/data/vocab/*`, `g:`/`d:` → `src/data/grammar*.ts`, `f:` → `falseFriends.ts`.
2. Si el reporte tiene razón, corregí **en el lugar**, corré `pnpm content:lock` y revisá que el diff del candado muestre sólo esa entrada.
3. Si es `correccion` (respuesta correcta marcada como error), suele faltar una alternativa: agregala al campo de respuestas (`' / '` en vocabulario, `a: [...]` en gramática).
4. Borrá el reporte procesado: `netlify blobs:delete reports "<key>" --force`.

⚠️ No borres nada del store `progress`: es el progreso sincronizado de usuarios reales.

## Convenciones de contenido

Vocabulario: `['italiano', 'español', nota?]`.

- **Sustantivos con artículo en los dos idiomas** (`'il tavolo', 'la mesa'`). Apóstrofo tipográfico `’`.
- **Alternativas:** van separadas por ` / ` y cada una tiene que ser una respuesta válida por sí sola (`'el dolor de panza / el dolor de estómago'`, no `'… / de estómago'`). Rioplatense + neutro: `'el auto / el coche'`.
- **`G`** (= "Género distinto al español") cuando el género difiere de la traducción principal. Si ya hay otra nota, combinala así: `` `${G}. otra nota` ``.
- **Notas para falsos amigos, plurales irregulares y régimen.** Cualquier nota hace que la palabra **no** cuente como transparente, así que conserva su tarjeta ES→IT.
- **Sin duplicados:** el italiano exacto (con artículo) no puede repetirse entre temas (lo valida `vocab.test.ts`). `dolce` (adj.) e `il dolce` (postre) son entradas distintas. Las palabras que ya están en `VERBS` no van en vocabulario.
- **Gramática:** cada ejercicio tiene un solo `___`. Si hay `opts`, la respuesta correcta tiene que estar entre ellas (lo valida `cards.test.ts`). La pista entre paréntesis no puede revelar la respuesta.
- **Exactitud:** el contenido lo escribieron agentes y lo revisaron otros agentes. Todo contenido nuevo pasa por una revisión independiente antes de mergear: italiano, acentos, artículos (`il`/`lo`/`l’`), traducciones y notas `G`.

## Verificación en navegador

- Para probar flujos completos, Playwright con Chrome headless contra `pnpm preview`, o contra un deploy draft si interviene la sincronización.
- Si después de un build el preview devuelve 404 en los assets, quedó un `vite preview` viejo corriendo con el build anterior: matá los procesos del puerto y relanzalo.
- Viewport de celular (390×844): la app es mobile-first y tiene barra inferior de 6 pestañas.

## Decisiones tomadas (y por qué)

- **Sin backend propio ni cuentas:** el progreso es local; la sync es opcional y anónima, con un código como secreto. No hace falta Postgres.
- **Netlify Function suelta en vez de server functions de TanStack Start:** el sitio sigue siendo estático más un único endpoint.
- **FSRS en vez de SM-2:** menos repasos para la misma retención.
- **Lo nuevo se presenta antes de preguntarlo:** la tarjeta nueva muestra una intro y la pregunta aparece unas tarjetas después. Así se respeta "exposición → recuperación".
- **Palabras transparentes:** sin tarjeta de escritura, para no gastar repasos en `il telefono`.
- **Contenido priorizado por frecuencia:** se eligió con una lista de frecuencias de subtítulos (FrequencyWords, CC-BY-SA). La lista no está en el repo; sólo se usó para elegir palabras.

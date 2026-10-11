# Datti una mossa

PWA para repasar italiano en ratos libres, pensada para hispanohablantes. Funciona offline y guarda el progreso en el dispositivo, con sincronización opcional entre dispositivos.

https://datti-una-mossa.netlify.app

## Qué tiene

- **Repaso con repetición espaciada (FSRS v6, vía `ts-fsrs`)**: cada tarjeta vuelve justo antes de olvidarla.
- **Primero ves, después recordás**: lo nuevo se presenta y se pregunta unas tarjetas más tarde, en la misma sesión.
- **Autoevaluación** en cada respuesta (Otra vez / Difícil / Bien / Fácil, con el intervalo resultante). En las respuestas escritas la app corrige y sugiere una nota: tolera acentos, artículos faltantes y errores de tipeo.
- **Test por nivel** (A1 a C1): 20 preguntas mezcladas, resultado por área y opción de mandar los errores al repaso. Si dominás un nivel, te ofrece arrancar las tarjetas nuevas desde el siguiente.
- **Nivel inicial**: al empezar elegís cuánto italiano sabés (o hacés un test) y las tarjetas nuevas arrancan desde ese nivel; lo anterior queda para después.
- **Límite diario de repasos** configurable: si se acumulan, van primero los más atrasados y las nuevas se pausan hasta ponerte al día.
- **Historial de repasos** guardado y sincronizado, para poder optimizar FSRS con tus propios datos.
- **Contenido**: ~2.800 palabras en 107 temas (A1–C1, elegidas con una lista de frecuencias del italiano hablado y revisadas), 136 verbos en 11 tiempos (incluido el passato remoto) y con reflexivos, 52 lecciones de gramática de A1 a C1 con 352 ejercicios y 39 falsos amigos español–italiano.
- **Palabras transparentes** (≈ iguales al español y sin trampa de género ni falso amigo): sólo se practican en reconocimiento, no hace falta escribirlas.
- Pronunciación con la voz italiana del sistema (Web Speech API).
- **Escucha (dictado)**: la app lee una frase de los ejercicios que ya practicaste y la escribís completa, con opción de escucharla más lento o ver la traducción.
- **Suspender tarjetas** ("ya la sé" / "no me interesa") y **reportar errores** de contenido desde el menú ⋯ de cada tarjeta.
- Secciones para recorrer vocabulario (con audio y estado de cada palabra), gramática y verbos, con práctica libre.
- **Sincronización entre dispositivos** sin cuentas: un código aleatorio de 160 bits (o un link) empareja el celular y la compu. El progreso se guarda en Netlify Blobs bajo el hash del código; por tarjeta gana el repaso más reciente y las estadísticas se llevan por dispositivo. Funciona offline y sincroniza al abrir, al volver la conexión, al pasar a segundo plano y después de repasar.
- Exportar/importar el progreso en JSON.

## Métodos de aprendizaje en los que se basa

La investigación en adquisición de segundas lenguas y en psicología del aprendizaje coincide en un puñado de prácticas con buen respaldo. Esta tabla muestra cuáles aplica la app y cómo:

| Método | Qué dice la evidencia | Cómo lo aplica la app |
|---|---|---|
| **Repetición espaciada** | Repasar a intervalos crecientes retiene mucho más que estudiar todo junto. Los estudios con vocabulario muestran ganancias claras frente al repaso masivo. | Cada tarjeta se programa con **FSRS v6**, el algoritmo que usa Anki hoy. Modela tu memoria por tarjeta y la vuelve a mostrar justo antes de que la olvides. Retención objetivo configurable (85–95%). |
| **Práctica de recuperación** (*testing effect*) | Intentar recordar fija más que releer. El esfuerzo de recuperar es una "dificultad deseable". | Todas las tarjetas piden recordar antes de mostrar la respuesta: escribir la palabra en italiano, conjugar o completar la frase. Primero se reconoce (IT→ES) y, cuando ya la reconocés, se habilita la producción (ES→IT). |
| **Feedback inmediato** | La recuperación rinde más si después se ve la respuesta correcta enseguida. | La corrección es instantánea, con la forma correcta, su audio y una nota cuando hace falta (género distinto, falso amigo, plural irregular). Tolera acentos y errores de tipeo, pero los marca. |
| **Exposición antes de recuperar** | La recuperación espaciada funciona cuando ya hubo suficiente contacto previo con el material. Preguntar algo nunca visto sólo frustra. | Lo nuevo se **presenta primero** (palabra con traducción y audio, tabla del verbo o explicación de la lección) y se pregunta **unas tarjetas después**, en la misma sesión. Lo fallado vuelve a aparecer antes de terminar. |
| **Práctica intercalada** | Mezclar temas y tipos de ejercicio mejora la retención y la capacidad de elegir la forma correcta, frente a practicar en bloques. | Cada sesión mezcla vocabulario, verbos, gramática y falsos amigos. Las tarjetas nuevas de cada área entran de a poco, intercaladas con los repasos. |
| **Instrucción explícita de gramática** (*focus on form*) | El input por sí solo no alcanza para dominar la forma. Combinarlo con enseñanza explícita da mejores resultados. | 52 lecciones cortas de A1 a C1, cada una con ejercicios que después entran al repaso. |
| **Contraste con la lengua materna** | Para lenguas cercanas, señalar explícitamente las diferencias con la L1 previene errores fosilizados y aprovecha lo que ya se sabe. | Las lecciones explican qué es igual y qué cambia respecto del español (*penso che **sia***, *sono andato* y no *ho andato*). Hay 39 falsos amigos con su trampa y su traducción real, y avisos de género distinto (*il latte*, *la macchina*). |
| **Vocabulario por frecuencia** | Unas pocas miles de palabras cubren la mayor parte de lo que se oye y se lee. Conviene aprender primero las más usadas. | Las ~2.800 palabras se eligieron con una lista de frecuencias del italiano hablado (subtítulos) y se ordenan por nivel. |
| **Aprovechar los cognados** | Los cognados se aprenden casi gratis. El esfuerzo conviene ponerlo en lo que no se parece al español. | Las palabras transparentes (*il telefono*, *importante*) sólo se repasan en reconocimiento; las que no se parecen o tienen trampa también se practican escribiéndolas. |
| **Práctica distribuida en sesiones cortas** | Pocos minutos frecuentes rinden más que sesiones largas y espaciadas. | "Sesión rápida" de ~3 minutos, cupo diario de tarjetas nuevas y racha de días para sostener el hábito. |
| **Autoevaluación y metacognición** | Juzgar qué tan bien se sabe algo, y comprobarlo, ayuda a dirigir el estudio. | Después de cada respuesta calificás qué tan bien la sabías (Otra vez / Difícil / Bien / Fácil) y ves cuándo volverá. Los **tests por nivel** muestran tu resultado por área y mandan los errores al repaso. |
| **Pronunciación y escucha** | Asociar la palabra escrita con su sonido ayuda a recordarla y a reconocerla al oírla. | Audio en italiano (voz del sistema) en palabras, conjugaciones y frases, con lectura automática opcional. |

### Lo que la app no cubre (y conviene sumar)

La evidencia es clara en que la repetición espaciada y los ejercicios **consolidan**, pero no reemplazan el contacto real con el idioma. Los mejores resultados aparecen al combinarlos con input y uso:

- **Input comprensible abundante:** leer y escuchar mucho material que entiendas casi todo. Por ejemplo, lecturas graduadas, podcasts para estudiantes (como *Coffee Break Italian*) o series con subtítulos en italiano.
- **Producción oral e interacción:** hablar con personas, intercambios de idioma o clases de conversación.
- **Escritura libre:** mensajes, un diario corto en italiano, y que alguien te corrija.

Usá la app para fijar lo que encontrás en ese input: si una palabra o estructura te aparece seguido leyendo o escuchando, practicala en "Palabras" o en la lección correspondiente.

#### Referencias

- Karpicke, J. D. y Roediger, H. L. (2008). *The critical importance of retrieval for learning*. Science, 319, 966–968.
- Cepeda, N. J. et al. (2006). *Distributed practice in verbal recall tasks: A review and quantitative synthesis*. Psychological Bulletin, 132(3), 354–380.
- Nakata, T. y Suzuki, Y. (2019). *Mixing grammar exercises facilitates long-term retention: Effects of blocking, interleaving, and increasing practice*. The Modern Language Journal, 103(3), 629–647.
- Norris, J. M. y Ortega, L. (2000). *Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis*. Language Learning, 50(3), 417–528.
- Nation, I. S. P. (2006). *How large a vocabulary is needed for reading and listening?* Canadian Modern Language Review, 63(1), 59–82.
- Bjork, R. A. (1994). *Memory and metamemory considerations in the training of human beings* (dificultades deseables).
- Panorama de la evidencia aplicada a la enseñanza de idiomas: [Teaching MFL: A Research-Informed Guide](https://www.structural-learning.com/post/teaching-mfl) y [Have We Overdone Retrieval Practice? (G. Conti, 2026)](https://gianfrancoconti.com/2026/04/14/), sobre ubicar la recuperación después del input.
- FSRS frente a SM-2: [documentación de Anki](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm) y [diferencias entre SM-2 y FSRS](https://l-m-sherlock.notion.site/What-are-the-main-differences-between-SM-2-and-FSRS-135c250163a180ca9029ea460136254c).

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

Guía para agentes de IA y contribuciones: [AGENTS.md](AGENTS.md) (invariantes de datos, convenciones de contenido, sincronización).

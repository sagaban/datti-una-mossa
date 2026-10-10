@AGENTS.md

## Notas para Claude Code

- Respondé y commiteá en español rioplatense, como el resto del repo.
- Antes de editar algo en `src/data/`, releé la sección "Invariantes críticas" de AGENTS.md.
- Contenido nuevo de italiano (vocabulario, ejercicios): después de escribirlo, pedí una revisión independiente con un subagente que no lo haya escrito.
- Verificación: `pnpm test && pnpm typecheck && pnpm build`. Para flujos de UI, Playwright headless contra `pnpm preview`.

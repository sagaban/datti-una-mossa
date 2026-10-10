import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FALSE_FRIENDS } from './falseFriends'
import { GRAMMAR } from './grammar'
import { VERBS } from './verbs'
import { VOCAB } from './vocab'

/**
 * El progreso de cada usuario se guarda por id de tarjeta, y esos ids dependen de la
 * POSICIÓN del contenido (ver AGENTS.md). Este candado registra qué hay en cada posición:
 * si algo se borra, se mueve o se renombra, el test falla.
 *
 * - Agregar contenido al final de un tema/lección, o temas/lecciones nuevos: permitido.
 * - Corregir una entrada en el lugar (typo, traducción): permitido, pero hay que
 *   regenerar el candado a propósito con `pnpm content:lock`.
 */
const LOCK = join(__dirname, 'content-lock.json')

interface Lock {
  vocab: Record<string, string[]>
  grammar: Record<string, string[]>
  falseFriends: string[]
  verbs: string[]
}

const current = (): Lock => ({
  vocab: Object.fromEntries(VOCAB.map((t) => [t.id, t.words.map((w) => w[0])])),
  grammar: Object.fromEntries(GRAMMAR.map((g) => [g.id, g.ex.map((e) => e.s)])),
  falseFriends: FALSE_FRIENDS.map((f) => f.it),
  verbs: VERBS.map((v) => v.inf),
})

describe('candado de contenido', () => {
  if (process.env.UPDATE_CONTENT_LOCK) {
    it('regenera el candado', () => writeFileSync(LOCK, JSON.stringify(current(), null, 1) + '\n'))
    return
  }

  it('existe el candado', () => expect(existsSync(LOCK), 'Falta content-lock.json: corré pnpm content:lock').toBe(true))

  const lock: Lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : { vocab: {}, grammar: {}, falseFriends: [], verbs: [] }
  const now = current()
  const hint = '— no se puede borrar ni reordenar contenido (ver AGENTS.md). Si corregiste una entrada en el lugar, corré pnpm content:lock.'

  it('ningún tema de vocabulario perdió ni movió palabras', () => {
    const bad: string[] = []
    for (const [id, words] of Object.entries(lock.vocab)) {
      if (!now.vocab[id]) bad.push(`tema "${id}" eliminado o renombrado`)
      else words.forEach((w, i) => now.vocab[id][i] !== w && bad.push(`${id}[${i}]: "${w}" → "${now.vocab[id][i] ?? '(nada)'}"`))
    }
    expect(bad, hint).toEqual([])
  })

  it('ninguna lección perdió ni movió ejercicios', () => {
    const bad: string[] = []
    for (const [id, exs] of Object.entries(lock.grammar)) {
      if (!now.grammar[id]) bad.push(`lección "${id}" eliminada o renombrada`)
      else exs.forEach((s, i) => now.grammar[id][i] !== s && bad.push(`${id}[${i}] cambió`))
    }
    expect(bad, hint).toEqual([])
  })

  it('falsos amigos y verbos en su lugar', () => {
    const ff = lock.falseFriends.flatMap((it, i) => (now.falseFriends[i] !== it ? [`falso amigo [${i}]: ${it}`] : []))
    const vb = lock.verbs.filter((v) => !now.verbs.includes(v)).map((v) => `verbo eliminado o renombrado: ${v}`)
    expect([...ff, ...vb], hint).toEqual([])
  })
})

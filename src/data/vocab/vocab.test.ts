import { describe, expect, it } from 'vitest'
import { VERBS } from '../verbs'
import { VOCAB } from './index'

// con artículo: "dolce" (dulce) e "il dolce" (el postre) son entradas distintas
const key = (it: string) => it.split(' / ')[0].toLowerCase().replace(/'/g, '’').trim()

describe('vocabulario', () => {
  it('ids de tema únicos', () => {
    const ids = VOCAB.map((t) => t.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  it('sin palabras repetidas entre temas', () => {
    const seen = new Map<string, string>()
    const dups: string[] = []
    for (const t of VOCAB)
      for (const [it] of t.words) {
        const k = key(it)
        if (seen.has(k)) dups.push(`${it} (${seen.get(k)} / ${t.id})`)
        else seen.set(k, t.id)
      }
    expect(dups).toEqual([])
  })

  it('no repite verbos de la sección Verbos', () => {
    // "piacere" en saludos es "encantado", no el verbo
    const verbs = new Set(VERBS.map((v) => v.inf).filter((v) => v !== 'piacere'))
    const clash = VOCAB.flatMap((t) => t.words.filter(([it]) => verbs.has(it)).map(([it]) => `${it} (${t.id})`))
    expect(clash).toEqual([])
  })

  it('formato de las entradas', () => {
    const bad: string[] = []
    for (const t of VOCAB)
      for (const w of t.words) {
        const [it, es] = w
        if (!it.trim() || !es.trim()) bad.push(`${t.id}: vacío`)
        if (/'/.test(it)) bad.push(`${t.id}: apóstrofo recto en "${it}"`)
        if (/\S\/|\/\S/.test(it) || /\S\/|\/\S/.test(es)) bad.push(`${t.id}: alternativa sin espacios en "${it}" / "${es}"`)
      }
    expect(bad).toEqual([])
  })
})

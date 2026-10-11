import { describe, expect, it } from 'vitest'
import { isVerbLemma, vocabCardFor, wordsOf } from '../../lib/reading'
import { LEVELS } from '../verbs'
import { READINGS } from './index'

/** rango de palabras por nivel (orientativo, con margen) */
const LENGTH: Record<string, [number, number]> = { A1: [40, 140], A2: [80, 200], B1: [120, 300], B2: [160, 380], C1: [200, 450] }

describe('lecturas', () => {
  it('ids únicos y estables (kebab-case)', () => {
    const ids = READINGS.map((r) => r.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
    expect(ids.filter((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toEqual([])
  })

  for (const r of READINGS) {
    describe(r.id, () => {
      const words = wordsOf(r.text)

      it('nivel y longitud adecuados', () => {
        expect(LEVELS).toContain(r.level)
        const n = r.text.split(/\s+/).filter(Boolean).length
        const [min, max] = LENGTH[r.level]
        expect(n, `${n} palabras`).toBeGreaterThanOrEqual(min)
        expect(n, `${n} palabras`).toBeLessThanOrEqual(max)
      })

      it('cada clave del glosario aparece en el texto', () => {
        expect(Object.keys(r.glossary).filter((k) => !words.has(k))).toEqual([])
      })

      it('los lemas existen en el vocabulario o en los verbos de la app', () => {
        const bad = Object.values(r.glossary).filter((g) => g.lemma && !vocabCardFor(g.lemma) && !isVerbLemma(g.lemma))
        expect(bad.map((g) => g.lemma)).toEqual([])
      })

      it('el glosario cubre la mayoría de las palabras con contenido', () => {
        const content = [...words].filter((w) => w.length >= 4)
        const covered = content.filter((w) => r.glossary[w] || vocabCardFor(w)).length
        expect(covered / Math.max(1, content.length), `${covered}/${content.length}`).toBeGreaterThanOrEqual(0.6)
      })

      it('preguntas de comprensión válidas', () => {
        expect(r.questions.length).toBeGreaterThanOrEqual(3)
        for (const q of r.questions) {
          expect(q.options.length).toBeGreaterThanOrEqual(3)
          expect(new Set(q.options).size).toBe(q.options.length)
          expect(q.answer).toBeGreaterThanOrEqual(0)
          expect(q.answer).toBeLessThan(q.options.length)
        }
      })
    })
  }
})

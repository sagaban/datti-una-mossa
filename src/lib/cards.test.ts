import { describe, expect, it } from 'vitest'
import { CATALOG, buildPrompt } from './cards'

describe('catálogo', () => {
  it('ids únicos', () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length)
  })
  it('todas las tarjetas generan una pregunta válida', () => {
    for (const def of CATALOG) {
      const p = buildPrompt(def)
      expect(p.answers.length, def.id).toBeGreaterThan(0)
      if (p.mode === 'choice') {
        // la respuesta correcta tiene que estar entre las opciones
        const opts = p.options!.map((o) => o.toLowerCase())
        expect(p.answers.some((a) => opts.includes(a.toLowerCase())), def.id).toBe(true)
      }
      if (def.kind === 'grammar') expect(p.question, def.id).toContain('___')
    }
  })
  it('empieza por A1 y mezcla áreas', () => {
    const first = CATALOG.slice(0, 30)
    expect(first.every((c) => c.level === 'A1')).toBe(true)
    expect(new Set(first.map((c) => c.area)).size).toBeGreaterThanOrEqual(3)
  })
})

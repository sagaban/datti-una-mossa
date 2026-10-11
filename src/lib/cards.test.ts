import { describe, expect, it } from 'vitest'
import { GRAMMAR } from '../data/grammar'
import { LEVELS } from '../data/verbs'
import { CATALOG, buildPrompt, fillBlank } from './cards'

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
  it('hay lecciones de gramática en todos los niveles', () => {
    for (const lv of LEVELS) expect(GRAMMAR.some((g) => g.level === lv), lv).toBe(true)
  })
  it('ids de lecciones únicos', () => {
    expect(new Set(GRAMMAR.map((g) => g.id)).size).toBe(GRAMMAR.length)
  })
  it('fillBlank: mayúscula al inicio de oración y apóstrofo pegado', () => {
    expect(fillBlank({ s: '___ mi ha chiamato oggi.', a: ['nessuno'], es: '' })).toBe('Nessuno mi ha chiamato oggi.')
    expect(fillBlank({ s: 'Che ore sono? ___ le dieci.', a: ['saranno'], es: '' })).toBe('Che ore sono? Saranno le dieci.')
    expect(fillBlank({ s: '___ amica di Marco è simpatica.', a: ['l’'], es: '' })).toBe('L’amica di Marco è simpatica.')
    expect(fillBlank({ s: 'Sì, ce ___ ho.', a: ['l’'], es: '' })).toBe('Sì, ce l’ho.')
  })
})

import { describe, expect, it } from 'vitest'
import { VERBS } from '../data/verbs'
import { TENSES, conjugate, expandForms } from './conjugate'

const v = (inf: string) => VERBS.find((x) => x.inf === inf)!

describe('conjugate', () => {
  it('presente regular de las tres conjugaciones', () => {
    expect(conjugate(v('parlare'), 'presente')).toEqual(['parlo', 'parli', 'parla', 'parliamo', 'parlate', 'parlano'])
    expect(conjugate(v('credere'), 'presente')).toEqual(['credo', 'credi', 'crede', 'crediamo', 'credete', 'credono'])
    expect(conjugate(v('dormire'), 'presente')).toEqual(['dormo', 'dormi', 'dorme', 'dormiamo', 'dormite', 'dormono'])
    expect(conjugate(v('capire'), 'presente')).toEqual(['capisco', 'capisci', 'capisce', 'capiamo', 'capite', 'capiscono'])
  })

  it('ajustes ortográficos en -care, -gare, -iare, -ciare', () => {
    expect(conjugate(v('cercare'), 'presente')[1]).toBe('cerchi')
    expect(conjugate(v('pagare'), 'presente')[3]).toBe('paghiamo')
    expect(conjugate(v('studiare'), 'presente')[1]).toBe('studi')
    expect(conjugate(v('mangiare'), 'presente')[3]).toBe('mangiamo')
    expect(conjugate(v('cercare'), 'futuro')[0]).toBe('cercherò')
    expect(conjugate(v('mangiare'), 'futuro')[0]).toBe('mangerò')
    expect(conjugate(v('cominciare'), 'condizionale')[0]).toBe('comincerei')
    expect(conjugate(v('lasciare'), 'futuro')[3]).toBe('lasceremo')
    expect(conjugate(v('studiare'), 'futuro')[0]).toBe('studierò')
    expect(conjugate(v('giocare'), 'congiuntivo')).toEqual(['giochi', 'giochi', 'giochi', 'giochiamo', 'giochiate', 'giochino'])
    expect(conjugate(v('studiare'), 'congiuntivo')[5]).toBe('studino')
  })

  it('imperfetto, futuro y condicional', () => {
    expect(conjugate(v('fare'), 'imperfetto')[0]).toBe('facevo')
    expect(conjugate(v('dire'), 'imperfetto')[3]).toBe('dicevamo')
    expect(conjugate(v('essere'), 'imperfetto')[2]).toBe('era')
    expect(conjugate(v('finire'), 'imperfetto')[5]).toBe('finivano')
    expect(conjugate(v('andare'), 'futuro')).toEqual(['andrò', 'andrai', 'andrà', 'andremo', 'andrete', 'andranno'])
    expect(conjugate(v('volere'), 'condizionale')[0]).toBe('vorrei')
    expect(conjugate(v('parlare'), 'condizionale')[3]).toBe('parleremmo')
    expect(conjugate(v('bere'), 'futuro')[0]).toBe('berrò')
  })

  it('congiuntivo', () => {
    expect(conjugate(v('parlare'), 'congiuntivo')).toEqual(['parli', 'parli', 'parli', 'parliamo', 'parliate', 'parlino'])
    expect(conjugate(v('prendere'), 'congiuntivo')[5]).toBe('prendano')
    expect(conjugate(v('finire'), 'congiuntivo')[0]).toBe('finisca')
    expect(conjugate(v('essere'), 'congiuntivo')[0]).toBe('sia')
  })

  it('passato prossimo con avere y essere', () => {
    expect(conjugate(v('mangiare'), 'passato prossimo')[0]).toBe('ho mangiato')
    expect(conjugate(v('prendere'), 'passato prossimo')[3]).toBe('abbiamo preso')
    expect(conjugate(v('andare'), 'passato prossimo')[0]).toBe('sono andato/a')
    expect(conjugate(v('partire'), 'passato prossimo')[5]).toBe('sono partiti/e')
    expect(conjugate(v('essere'), 'passato prossimo')[2]).toBe('è stato/a')
    expect(conjugate(v('credere'), 'passato prossimo')[0]).toBe('ho creduto')
  })

  it('expandForms separa la concordancia de género', () => {
    expect(expandForms('sono andato/a')).toEqual(['sono andato', 'sono andata'])
    expect(expandForms('ho mangiato')).toEqual(['ho mangiato'])
  })

  it('todos los verbos producen 6 formas no vacías en cada tiempo', () => {
    for (const verb of VERBS)
      for (const t of TENSES) {
        const forms = conjugate(verb, t)
        expect(forms, `${verb.inf} ${t}`).toHaveLength(6)
        forms.forEach((f) => expect(f.trim().length, `${verb.inf} ${t}`).toBeGreaterThan(0))
      }
  })
})

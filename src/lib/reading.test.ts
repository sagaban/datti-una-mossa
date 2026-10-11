import { describe, expect, it } from 'vitest'
import type { Reading } from '../data/readings'
import { lookup, tokenize, vocabCardFor, wordsOf } from './reading'

const reading: Reading = {
  id: 'test',
  level: 'A1',
  title: 'T',
  titleEs: 'T',
  text: 'L’amico prende un caffè. C’è un po’ di zucchero.',
  glossary: {
    'amico': { es: 'amigo', lemma: 'l’amico' },
    'prende': { es: 'toma', lemma: 'prendere' },
    'c’': { es: 'ahí (c’è = hay)' },
  },
  questions: [],
}

describe('tokenize', () => {
  it('separa la elisión y conserva puntuación y espacios', () => {
    const t = tokenize(reading.text)
    expect(t.map((x) => x.text).join('')).toBe(reading.text)
    expect(t.filter((x) => x.key).map((x) => x.key)).toEqual(['l’', 'amico', 'prende', 'un', 'caffè', 'c’', 'è', 'un', 'po’', 'di', 'zucchero'])
  })
  it('normaliza el apóstrofo recto', () => {
    expect([...wordsOf("l'amico")]).toEqual(['l’', 'amico'])
  })
})

describe('lookup', () => {
  const tok = (k: string) => tokenize(reading.text).find((t) => t.key === k)!
  it('usa el glosario y vincula con la tarjeta de vocabulario del lema', () => {
    const l = lookup(reading, tok('amico'))!
    expect(l.es).toBe('amigo')
    expect(l.cardId).toBe(vocabCardFor('l’amico'))
    expect(l.cardId).toMatch(/^v:famiglia:\d+:r$/)
  })
  it('reconoce verbos para enlazar a su conjugación', () => {
    expect(lookup(reading, tok('prende'))!.verb).toBe('prendere')
  })
  it('sin glosario busca la palabra tal cual en el vocabulario', () => {
    // "zucchero" está en la app como "lo zucchero": se encuentra igual
    expect(lookup(reading, tok('zucchero'))!.cardId).toBe(vocabCardFor('lo zucchero'))
    expect(lookup(reading, tok('di'))).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { TENSES } from '../../lib/conjugate'
import { findForm } from '../../lib/verb-example'
import { VERBS } from '../verbs'
import { VERB_EXAMPLES } from '.'

const BY_INF = new Map(VERBS.map((v) => [v.inf, v]))

describe('ejemplos de verbos', () => {
  it('sólo hay ejemplos de verbos que existen', () => {
    expect(Object.keys(VERB_EXAMPLES).filter((inf) => !BY_INF.has(inf))).toEqual([])
  })

  it('cada verbo tiene un ejemplo por tiempo', () => {
    const missing = VERBS.flatMap((v) => TENSES.filter((t) => !VERB_EXAMPLES[v.inf]?.[t]).map((t) => `${v.inf} · ${t}`))
    expect(missing).toEqual([])
  })

  for (const [inf, byTense] of Object.entries(VERB_EXAMPLES)) {
    it(inf, () => {
      const verb = BY_INF.get(inf)!
      const problems: string[] = []
      for (const [tense, [itS, es]] of Object.entries(byTense) as [keyof typeof byTense, [string, string]][]) {
        if (!findForm(itS, verb, tense)) problems.push(`${tense}: no aparece la forma conjugada en «${itS}»`)
        if (!/[.!?…]$/.test(itS.trim()) || !/[.!?…]$/.test(es.trim())) problems.push(`${tense}: falta el punto final`)
        if (itS.length > 110) problems.push(`${tense}: demasiado larga`)
        if (/'/.test(itS)) problems.push(`${tense}: usar apóstrofo tipográfico ’`)
        if (!es.trim()) problems.push(`${tense}: falta la traducción`)
      }
      expect(problems).toEqual([])
    })
  }
})

describe('findForm', () => {
  const v = (inf: string) => BY_INF.get(inf)!
  it('encuentra formas simples y compuestas, con concordancia y palabras en el medio', () => {
    expect(findForm('Domani parlo con lui.', v('parlare'), 'presente')).not.toBeNull()
    expect(findForm('Le ho viste ieri.', v('vedere'), 'passato prossimo')).not.toBeNull()
    expect(findForm('Non ho ancora mangiato.', v('mangiare'), 'passato prossimo')).not.toBeNull()
    expect(findForm('Stamattina mi sono alzata tardi.', v('alzarsi'), 'passato prossimo')).not.toBeNull()
    expect(findForm('L’ho visto ieri.', v('vedere'), 'passato prossimo')).not.toBeNull()
  })
  it('no confunde otro tiempo', () => {
    expect(findForm('Ieri ho parlato con lui.', v('parlare'), 'presente')).toBeNull()
    expect(findForm('Parlavo con lui.', v('parlare'), 'passato remoto')).toBeNull()
  })
})

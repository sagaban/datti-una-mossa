import type { Verb } from './conjugate'
import { type Tense, conjugate, expandForms } from './conjugate'

const COMPOUND = new Set<Tense>(['passato prossimo', 'trapassato prossimo', 'futuro anteriore', 'condizionale passato'])
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Dónde aparece la forma conjugada dentro de la oración de ejemplo, para resaltarla.
 * En los tiempos compuestos tolera la concordancia del participio (le ho viste) y una
 * palabra entre auxiliar y participio (ho già mangiato, non mi sono mai alzato).
 */
export function findForm(sentence: string, verb: Verb, tense: Tense): [start: number, end: number] | null {
  const forms = conjugate(verb, tense).flatMap(expandForms)
  const patterns = forms.map((f) => {
    const words = f.split(' ').map(esc)
    if (COMPOUND.has(tense) && words.length >= 2) {
      const pp = words.pop()!
      words.push(`(?:\\p{L}+\\s+)?${pp.slice(0, -1)}[oaie]`)
    }
    return words.join('\\s+')
  })
  // las formas más largas primero (mi sono alzato antes que sono)
  patterns.sort((a, b) => b.length - a.length)
  const re = new RegExp(`(?<!\\p{L})(?:${patterns.join('|')})(?!\\p{L})`, 'iu')
  const m = re.exec(sentence.replace(/'/g, '’'))
  return m ? [m.index, m.index + m[0].length] : null
}

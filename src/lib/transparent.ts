import { levenshtein, normalize, stripAccents } from './answer'

const IT_ART = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)')/
const ES_ART = /^(?:el|la|los|las|un|una|unos|unas)\s+/

const bare = (s: string, art: RegExp) => stripAccents(normalize(s).replace(art, ''))

/**
 * Una palabra es "transparente" si un hispanohablante la adivina sin estudiarla:
 * se compara con su traducción real (no con lo que parece), así los falsos
 * amigos nunca cuentan como transparentes.
 */
export function isTransparent(it: string, es: string): boolean {
  const its = it.split(' / ').map((x) => bare(x, IT_ART))
  const ess = es.split(' / ').map((x) => bare(x, ES_ART))
  return its.some((a) =>
    ess.some((b) => {
      const len = Math.max(a.length, b.length)
      return len >= 4 && levenshtein(a, b) / len <= 0.25
    }),
  )
}

/**
 * Palabra fácil = transparente y sin nada especial que aprender: si tiene nota
 * (género distinto, falso amigo, plural irregular…) conviene practicarla igual.
 */
export const isEasyWord = (it: string, es: string, note?: string) => !note && isTransparent(it, es)

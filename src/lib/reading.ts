import type { GlossEntry, Reading } from '../data/readings'
import { VERBS } from '../data/verbs'
import { VOCAB } from '../data/vocab'

export interface Token {
  text: string
  /** clave para buscar en el glosario (minúsculas); null si no es una palabra */
  key: string | null
}

// una palabra = letras, con el apóstrofo final de la elisión pegado ("l’", "dell’", "po’")
const WORD = /\p{L}+[’']?/gu

export function tokenize(text: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), key: null })
    out.push({ text: m[0], key: wordKey(m[0]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), key: null })
  return out
}

export const wordKey = (w: string) => w.toLowerCase().replace(/'/g, '’')

/** Palabras distintas de un texto */
export const wordsOf = (text: string) => new Set(tokenize(text).flatMap((t) => (t.key ? [t.key] : [])))

// ——— Vínculo con el vocabulario de la app ———

const ARTICLE = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)’)/
let lemmaIndex: Map<string, string> | null = null

/** forma de diccionario → id de la tarjeta de reconocimiento */
function index(): Map<string, string> {
  if (lemmaIndex) return lemmaIndex
  lemmaIndex = new Map()
  for (const t of VOCAB)
    t.words.forEach(([it], i) => {
      for (const alt of it.split(' / ')) {
        const k = wordKey(alt.trim())
        // también sin artículo: "lo zucchero" se encuentra tocando "zucchero"
        for (const key of [k, k.replace(ARTICLE, '')]) if (!lemmaIndex!.has(key)) lemmaIndex!.set(key, `v:${t.id}:${i}:r`)
      }
    })
  return lemmaIndex
}

/** id de la tarjeta de vocabulario de ese lema, si existe */
export const vocabCardFor = (lemma: string) => index().get(wordKey(lemma)) ?? null

export const isVerbLemma = (lemma: string) => VERBS.some((v) => v.inf === lemma)

export interface Lookup extends GlossEntry {
  word: string
  /** tarjeta de vocabulario para sumar al repaso */
  cardId: string | null
  /** verbo que tiene su página de conjugación */
  verb: string | null
}

export function lookup(reading: Reading, token: Token): Lookup | null {
  if (!token.key) return null
  const g = reading.glossary[token.key]
  if (!g) {
    // sin glosario: quizás la palabra tal cual está en el vocabulario
    const cardId = vocabCardFor(token.key)
    return cardId ? { word: token.text, es: '', cardId, verb: null } : null
  }
  const lemma = g.lemma ?? token.key
  return {
    word: token.text,
    ...g,
    cardId: vocabCardFor(lemma),
    verb: isVerbLemma(lemma) ? lemma : null,
  }
}

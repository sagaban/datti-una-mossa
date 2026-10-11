import { levenshtein, normalize, stripAccents } from './answer'

const ARTICLE = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)')/
const clean = (s: string) => stripAccents(normalize(s))

/**
 * ¿Lo que reconoció el navegador coincide con lo esperado? Tolera mayúsculas, acentos,
 * artículo omitido y pequeños errores del reconocedor (≈20% de la longitud).
 */
export function matchSpeech(heard: string[], expected: string): { ok: boolean; best: string } {
  const targets = expected.split(' / ').flatMap((t) => {
    const c = clean(t)
    return [c, c.replace(ARTICLE, '')]
  })
  let best = heard[0] ?? ''
  let bestScore = Infinity
  for (const h of heard) {
    const c = clean(h)
    for (const t of targets) {
      const score = levenshtein(c, t) / Math.max(1, t.length)
      if (score < bestScore) {
        bestScore = score
        best = h
      }
    }
  }
  return { ok: bestScore <= 0.2, best }
}

// ——— Reconocimiento de voz del navegador (Chrome, Edge, Safari) ———

interface RecognitionResult {
  readonly length: number
  [i: number]: { transcript: string }
}
interface Recognition {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  onresult: ((e: { results: { [i: number]: RecognitionResult } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => !!ctor()

export type ListenError = 'not-allowed' | 'no-speech' | 'unsupported' | 'other'

/** Escucha una frase en italiano y devuelve las alternativas reconocidas */
export function listen(timeoutMs = 7000): Promise<string[]> {
  const C = ctor()
  if (!C) return Promise.reject<string[]>('unsupported' satisfies ListenError)
  return new Promise((resolve, reject) => {
    const rec = new C()
    rec.lang = 'it-IT'
    rec.maxAlternatives = 5
    rec.interimResults = false
    let done = false
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(timer)
      fn()
    }
    const timer = setTimeout(() => (rec.abort(), finish(() => reject('no-speech' satisfies ListenError))), timeoutMs)
    rec.onresult = (e) => {
      const r = e.results[0]
      const alts: string[] = []
      for (let i = 0; i < r.length; i++) alts.push(r[i].transcript)
      finish(() => resolve(alts))
    }
    rec.onerror = (e) => {
      const err: ListenError = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed' : e.error === 'no-speech' ? 'no-speech' : 'other'
      finish(() => reject(err))
    }
    rec.onend = () => finish(() => reject('no-speech' satisfies ListenError))
    rec.start()
  })
}

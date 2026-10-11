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
  readonly isFinal: boolean
  [i: number]: { transcript: string }
}
interface Recognition {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: RecognitionResult } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  start(): void
  stop(): void
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

/**
 * Escucha una frase en italiano y devuelve las alternativas reconocidas.
 * En el celular hay que ser tolerante: Safari en iOS a veces nunca marca un resultado
 * como final y termina igual, y Chrome en Android corta enseguida. Por eso se piden
 * resultados parciales y, si al terminar hay algo reconocido, se usa eso.
 */
export function listen(timeoutMs = 8000, onReady?: () => void): Promise<string[]> {
  const C = ctor()
  if (!C) return Promise.reject<string[]>('unsupported' satisfies ListenError)
  // la voz de la app sonando mientras se abre el micrófono lo confunde (y en iOS lo bloquea)
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  return new Promise((resolve, reject) => {
    let rec = new C()
    let heard: string[] = []
    /** Chrome en Android corta a los pocos segundos de silencio: si no oyó nada, se vuelve a escuchar hasta el límite */
    let deadline = 0
    let retries = 0
    let done = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(timer)
      fn()
    }
    // el tiempo corre desde que el micrófono está abierto, no mientras se pide el permiso;
    // al vencer se usa stop() (no abort()) para que el navegador entregue lo que ya oyó
    const arm = () => {
      if (deadline) return
      deadline = Date.now() + timeoutMs
      clearTimeout(timer)
      timer = setTimeout(() => rec.stop(), timeoutMs)
      onReady?.()
    }
    const silentEnd = () => !heard.length && deadline > 0 && Date.now() < deadline - 1000 && retries < 3
    const restart = () => {
      retries++
      rec = setup(new C())
      try {
        rec.start()
      } catch {
        finish(() => reject('other' satisfies ListenError))
      }
    }
    const setup = (rec: Recognition) => {
      rec.lang = 'it-IT'
      rec.maxAlternatives = 5
      rec.interimResults = true
      rec.continuous = false
      rec.onaudiostart = arm
      rec.onresult = (e) => {
        const alts: string[] = []
        const parts = Array.from({ length: e.results.length }, (_, i) => e.results[i])
        const first = parts[0]
        if (!first) return
        // con una sola frase alcanzan las alternativas del primer resultado; si el navegador
        // la partió en varios, se arma la frase completa con la mejor de cada uno
        if (parts.length === 1) for (let i = 0; i < first.length; i++) alts.push(first[i].transcript)
        else alts.push(parts.map((r) => r[0]?.transcript ?? '').join(' '))
        if (alts.some((a) => a.trim())) heard = alts.map((a) => a.trim()).filter(Boolean)
        if (heard.length && parts.every((r) => r.isFinal)) finish(() => resolve(heard))
      }
      rec.onerror = (e) => {
        if (heard.length && e.error !== 'not-allowed') return finish(() => resolve(heard))
        // el reintento lo hace onend, que llega después del error
        if (e.error === 'no-speech' && silentEnd()) return
        const err: ListenError =
          e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed' : e.error === 'no-speech' || e.error === 'aborted' ? 'no-speech' : 'other'
        finish(() => reject(err))
      }
      rec.onend = () => {
        if (done) return
        if (silentEnd()) return restart()
        finish(() => (heard.length ? resolve(heard) : reject('no-speech' satisfies ListenError)))
      }
      return rec
    }
    setup(rec)
    // por si el navegador nunca avisa que abrió el micrófono
    timer = setTimeout(() => rec.stop(), timeoutMs + 7000)
    try {
      rec.start()
    } catch {
      finish(() => reject('other' satisfies ListenError))
    }
  })
}

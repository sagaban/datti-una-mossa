import { afterEach, describe, expect, it, vi } from 'vitest'
import { listen, matchSpeech } from './pronounce'

describe('matchSpeech', () => {
  it('acepta lo dicho aunque el reconocedor cambie mayúsculas, acentos o puntuación', () => {
    expect(matchSpeech(['Città'], 'la città').ok).toBe(true)
    expect(matchSpeech(['perche'], 'perché').ok).toBe(true)
    expect(matchSpeech(['Il libro è sul tavolo.'], 'Il libro è sul tavolo.').ok).toBe(true)
  })
  it('busca entre las alternativas del reconocedor y del contenido', () => {
    expect(matchSpeech(['la mamma mia', 'la mamma'], 'la madre / la mamma').ok).toBe(true)
  })
  it('tolera un error chico en palabras largas pero no otra palabra', () => {
    expect(matchSpeech(['formagio'], 'il formaggio').ok).toBe(true)
    expect(matchSpeech(['finestra'], 'la porta').ok).toBe(false)
  })
  it('devuelve lo que mejor se reconoció para mostrarlo', () => {
    expect(matchSpeech(['ciao', 'chiaro'], 'chiaro').best).toBe('chiaro')
  })
})

// Reconocedor falso: cada test dispara los eventos como lo hace cada navegador
type Fake = Record<string, any> & { stopped?: boolean }
function fakeRecognizer() {
  let rec!: Fake
  class C {
    constructor() {
      rec = this as unknown as Fake
    }
    start() {}
    stop() {
      rec.stopped = true
      queueMicrotask(() => rec.onend?.())
    }
    abort() {}
  }
  vi.stubGlobal('window', { webkitSpeechRecognition: C })
  return () => rec
}
const result = (isFinal: boolean, ...alts: string[]) => Object.assign(alts.map((transcript) => ({ transcript })), { isFinal })
const event = (...results: ReturnType<typeof result>[]) => ({ resultIndex: 0, results: Object.assign(results, { length: results.length }) })

describe('listen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('devuelve las alternativas del resultado final (Chrome)', async () => {
    const rec = fakeRecognizer()
    const p = listen()
    rec().onresult(event(result(false, 'il')))
    rec().onresult(event(result(true, 'il libro', 'il libero')))
    await expect(p).resolves.toEqual(['il libro', 'il libero'])
  })

  it('usa lo parcial si el navegador termina sin resultado final (iOS)', async () => {
    const rec = fakeRecognizer()
    const p = listen()
    rec().onresult(event(result(false, 'buongiorno')))
    rec().onend()
    await expect(p).resolves.toEqual(['buongiorno'])
  })

  it('usa lo parcial aunque después llegue un error no-speech', async () => {
    const rec = fakeRecognizer()
    const p = listen()
    rec().onresult(event(result(false, 'grazie')))
    rec().onerror({ error: 'no-speech' })
    await expect(p).resolves.toEqual(['grazie'])
  })

  it('arma la frase si el navegador la parte en varios resultados', async () => {
    const rec = fakeRecognizer()
    const p = listen()
    rec().onresult(event(result(true, 'il libro'), result(true, 'è sul tavolo')))
    await expect(p).resolves.toEqual(['il libro è sul tavolo'])
  })

  it('al vencer el tiempo pide lo oído con stop() en vez de descartarlo', async () => {
    vi.useFakeTimers()
    const rec = fakeRecognizer()
    const p = listen(1000)
    rec().onaudiostart()
    rec().onresult(event(result(false, 'ciao')))
    await vi.advanceTimersByTimeAsync(1000)
    expect(rec().stopped).toBe(true)
    await expect(p).resolves.toEqual(['ciao'])
  })

  it('si el navegador corta por silencio, vuelve a escuchar hasta el límite (Android)', async () => {
    vi.useFakeTimers()
    const rec = fakeRecognizer()
    const ready = vi.fn()
    const p = listen(8000, ready)
    const first = rec()
    first.onaudiostart()
    expect(ready).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(3000)
    first.onerror({ error: 'no-speech' })
    first.onend()
    const second = rec()
    expect(second).not.toBe(first)
    second.onaudiostart()
    second.onresult(event(result(true, 'arrivederci')))
    await expect(p).resolves.toEqual(['arrivederci'])
    expect(ready).toHaveBeenCalledOnce()
  })

  it('sin nada reconocido avisa no-speech, y permiso denegado es otro error', async () => {
    let rec = fakeRecognizer()
    let p = listen()
    rec().onend()
    await expect(p).rejects.toBe('no-speech')
    rec = fakeRecognizer()
    p = listen()
    rec().onerror({ error: 'not-allowed' })
    await expect(p).rejects.toBe('not-allowed')
  })
})

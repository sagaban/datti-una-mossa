import { describe, expect, it } from 'vitest'
import { matchSpeech } from './pronounce'

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

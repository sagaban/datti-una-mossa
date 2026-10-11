import { describe, expect, it } from 'vitest'
import { check } from './answer'

describe('check', () => {
  it('acepta respuestas exactas ignorando mayúsculas y signos', () => {
    expect(check('  Ciao! ', ['ciao']).verdict).toBe('correct')
  })
  it('acepta cualquier alternativa', () => {
    expect(check('la mamma', ['la madre', 'la mamma']).verdict).toBe('correct')
  })
  it('detecta acentos faltantes', () => {
    expect(check('citta', ['città']).verdict).toBe('accent')
  })
  it('detecta artículo faltante', () => {
    expect(check('latte', ['il latte']).verdict).toBe('article')
  })
  it('no confunde el inicio de una palabra con un artículo', () => {
    expect(check('tte', ['latte']).verdict).toBe('wrong')
    expect(check('eri', ['ieri']).verdict).toBe('wrong')
    expect(check('amico', ['l’amico']).verdict).toBe('article')
  })
  it('tolera un error de tipeo en palabras largas', () => {
    expect(check('formagio', ['il formaggio']).verdict).toBe('typo')
    expect(check('lo', ['la']).verdict).toBe('wrong')
  })
  it('normaliza apóstrofos tipográficos', () => {
    expect(check("l'amico", ['l’amico']).verdict).toBe('correct')
    expect(check('c’è', ["c'è"]).verdict).toBe('correct')
  })
  it('respuesta vacía es incorrecta', () => {
    expect(check('', ['sono']).verdict).toBe('wrong')
  })
  it('en frases ignora comillas y puntuación, y tolera hasta 2 errores', () => {
    const s = 'Mi ha detto che sarebbe venuto.'
    expect(check('mi ha detto che sarebbe venuto', [s]).verdict).toBe('correct')
    expect(check('mi ha deto che sarebe venuto', [s]).verdict).toBe('typo')
    expect(check('mi ha deto che sarebe venut', [s]).verdict).toBe('wrong')
    expect(check('Ho detto: «basta»', ['ho detto basta']).verdict).toBe('correct')
  })
})

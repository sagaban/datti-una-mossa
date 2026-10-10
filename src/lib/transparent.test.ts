import { describe, expect, it } from 'vitest'
import { isEasyWord, isTransparent } from './transparent'

describe('isTransparent', () => {
  it('detecta palabras casi iguales al español', () => {
    expect(isTransparent('il telefono', 'el teléfono')).toBe(true)
    expect(isTransparent('importante', 'importante')).toBe(true)
    expect(isTransparent('la famiglia', 'la familia')).toBe(true)
    expect(isTransparent('il problema', 'el problema')).toBe(true)
  })
  it('no marca palabras distintas ni falsos amigos', () => {
    expect(isTransparent('la finestra', 'la ventana')).toBe(false)
    expect(isTransparent('lungo', 'largo')).toBe(false)
    expect(isTransparent('il burro', 'la manteca / la mantequilla')).toBe(false)
    expect(isTransparent('caldo', 'caliente / calor')).toBe(false)
    expect(isTransparent('sì', 'sí')).toBe(false) // demasiado corta para juzgar
  })
  it('una nota (género, falso amigo) excluye la palabra de las fáciles', () => {
    expect(isEasyWord('il sale', 'la sal', 'Género distinto al español')).toBe(false)
    expect(isEasyWord('il telefono', 'el teléfono')).toBe(true)
  })
})

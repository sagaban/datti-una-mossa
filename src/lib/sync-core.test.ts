import { describe, expect, it } from 'vitest'
import {
  type CardState,
  type SyncPayload,
  generateCode,
  isValidCode,
  mergePayload,
  normalizeCode,
  parsePayload,
  sumDays,
} from './sync-core'

const card = (last: string | undefined, reps: number, due = '2026-10-20T00:00:00.000Z'): CardState => ({
  due,
  stability: 1,
  difficulty: 5,
  elapsed_days: 0,
  scheduled_days: 1,
  learning_steps: 0,
  reps,
  lapses: 0,
  state: 2,
  ...(last ? { last_review: last } : {}),
})

const payload = (p: Partial<SyncPayload>): SyncPayload => ({
  v: 1,
  cards: {},
  seen: [],
  settings: {},
  settingsUpdatedAt: 0,
  devices: {},
  logs: [],
  suspended: {},
  ...p,
})

describe('código de sincronización', () => {
  it('genera códigos válidos y distintos', () => {
    const a = generateCode()
    expect(isValidCode(a)).toBe(true)
    expect(a).toMatch(/^(\w{4}-){7}\w{4}$/)
    expect(generateCode()).not.toBe(a)
  })
  it('normaliza lo que pega la persona', () => {
    const code = generateCode()
    expect(normalizeCode(` ${code.toUpperCase().replace(/-/g, ' ')} `)).toBe(code)
    expect(isValidCode('hola')).toBe(false)
  })
})

describe('mergePayload', () => {
  it('por tarjeta gana el repaso más reciente', () => {
    const a = payload({ cards: { x: card('2026-10-10T10:00:00Z', 3), y: card('2026-10-01T00:00:00Z', 1) } })
    const b = payload({ cards: { x: card('2026-10-09T10:00:00Z', 9), z: card('2026-10-05T00:00:00Z', 1) } })
    const m = mergePayload(a, b)
    expect(m.cards.x.reps).toBe(3)
    expect(Object.keys(m.cards).sort()).toEqual(['x', 'y', 'z'])
  })

  it('una tarjeta repasada le gana a una recién agregada sin repasos', () => {
    const m = mergePayload(payload({ cards: { x: card(undefined, 0) } }), payload({ cards: { x: card('2026-10-01T00:00:00Z', 1) } }))
    expect(m.cards.x.reps).toBe(1)
  })

  it('es conmutativa en las tarjetas', () => {
    const a = payload({ cards: { x: card('2026-10-10T10:00:00Z', 3) } })
    const b = payload({ cards: { x: card('2026-10-11T10:00:00Z', 4) } })
    expect(mergePayload(a, b).cards).toEqual(mergePayload(b, a).cards)
  })

  it('las estadísticas se guardan por dispositivo y no se duplican al sincronizar dos veces', () => {
    const day = { reviews: 10, correct: 8, introduced: 2, seconds: 300 }
    const a = payload({ devices: { cel: { '2026-10-10': day } } })
    const b = payload({ devices: { pc: { '2026-10-10': { ...day, reviews: 5 } } } })
    const once = mergePayload(a, b)
    const twice = mergePayload(once, mergePayload(a, b))
    expect(twice.devices).toEqual(once.devices)
    expect(sumDays(Object.values(twice.devices))['2026-10-10'].reviews).toBe(15)
  })

  it('el mismo dispositivo con más repasos ese día se queda con el máximo', () => {
    const a = payload({ devices: { cel: { '2026-10-10': { reviews: 4, correct: 4, introduced: 1, seconds: 60 } } } })
    const b = payload({ devices: { cel: { '2026-10-10': { reviews: 9, correct: 7, introduced: 1, seconds: 200 } } } })
    expect(mergePayload(a, b).devices.cel['2026-10-10'].reviews).toBe(9)
  })

  it('los ajustes más recientes ganan y lo visto se une', () => {
    const a = payload({ settings: { newPerDay: 10 }, settingsUpdatedAt: 100, seen: ['g:a'] })
    const b = payload({ settings: { newPerDay: 20 }, settingsUpdatedAt: 200, seen: ['g:b'] })
    const m = mergePayload(a, b)
    expect(m.settings).toEqual({ newPerDay: 20 })
    expect(m.seen.sort()).toEqual(['g:a', 'g:b'])
  })
})

describe('parsePayload', () => {
  it('rechaza lo que no es un payload', () => {
    expect(() => parsePayload(null)).toThrow()
    expect(() => parsePayload({ v: 2 })).toThrow()
  })
  it('descarta tarjetas y fechas inválidas y conserva las buenas', () => {
    const p = parsePayload({
      v: 1,
      cards: { 'v:città:0:r': card('2026-10-10T00:00:00Z', 1), 'c:andare:passato prossimo': card(undefined, 0), mala: { due: 'nunca' } },
      seen: ['g:articoli-det', 42],
      devices: { cel: { '2026-10-10': { reviews: 3 }, 'no-es-fecha': {} }, '<script>': {} },
      settingsUpdatedAt: 'x',
    })
    expect(Object.keys(p.cards).sort()).toEqual(['c:andare:passato prossimo', 'v:città:0:r'])
    expect(p.seen).toEqual(['g:articoli-det'])
    expect(Object.keys(p.devices)).toEqual(['cel'])
    expect(p.devices.cel['2026-10-10']).toEqual({ reviews: 3, correct: 0, introduced: 0, seconds: 0 })
    expect(p.settingsUpdatedAt).toBe(0)
  })
})

describe('historial de repasos', () => {
  it('une historiales de dos dispositivos sin duplicar y en orden', () => {
    const a = payload({ logs: [['x', 100, 3, 0, 5], ['y', 300, 1, 2, 4]] })
    const b = payload({ logs: [['x', 100, 3, 0, 5], ['z', 200, 4, 0, 2]] })
    expect(mergePayload(a, b).logs.map((e) => e[0])).toEqual(['x', 'z', 'y'])
  })
  it('descarta entradas inválidas', () => {
    const p = parsePayload({ v: 1, logs: [['x', 1, 3, 0, 5], ['x', 'nope', 3, 0, 5], ['x', 2, 9, 0, 5], [42, 3, 3, 0, 1]] })
    expect(p.logs).toEqual([['x', 1, 3, 0, 5]])
  })
})

describe('suspensiones', () => {
  it('gana el cambio más reciente: reactivar en otro dispositivo se propaga', () => {
    const a = payload({ suspended: { x: { on: true, at: 100 }, y: { on: true, at: 100 } } })
    const b = payload({ suspended: { x: { on: false, at: 200 } } })
    const m = mergePayload(a, b)
    expect(m.suspended.x.on).toBe(false)
    expect(m.suspended.y.on).toBe(true)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import {
  applyRemote,
  buildSession,
  dueCards,
  getData,
  isSuspended,
  makeDue,
  nextNewCards,
  resetAll,
  review,
  reviewsLeft,
  setSuspended,
  siblingKey,
  updateSettings,
  weakCards,
} from './store'
import { CATALOG } from './cards'

beforeEach(() => resetAll())

describe('nivel inicial', () => {
  it('las nuevas empiezan en el nivel elegido', () => {
    updateSettings({ startLevel: 'B1' })
    expect(nextNewCards(30).every((d) => d.level !== 'A1' && d.level !== 'A2')).toBe(true)
  })
  it('los niveles anteriores no se pierden: quedan al final', () => {
    updateSettings({ startLevel: 'B2' })
    const all = nextNewCards(Infinity)
    expect(all.length).toBeGreaterThan(0)
    const firstA1 = all.findIndex((d) => d.level === 'A1')
    expect(firstA1).toBeGreaterThan(all.map((d) => d.level).lastIndexOf('C1'))
  })
  it('con A1 el orden es el del catálogo', () => {
    expect(nextNewCards(5).map((d) => d.id)).toEqual(CATALOG.filter((d) => d.kind !== 'vocab-p' && d.kind !== 'dictation').slice(0, 5).map((d) => d.id))
  })
})

describe('tarjetas hermanas', () => {
  it('la misma palabra no sale en los dos sentidos en una ronda; la otra queda para la próxima', () => {
    const w = CATALOG.find((d) => d.kind === 'vocab-p')!
    const r = w.id.replace(/:p$/, ':r')
    makeDue([r, w.id])
    updateSettings({ newPerDay: 0 })
    const ids = buildSession({}).map((i) => i.def.id)
    expect(ids.filter((id) => id === r || id === w.id)).toHaveLength(1)
    expect(dueCards().map((d) => d.id)).toEqual(expect.arrayContaining([r, w.id]))
  })
  it('un ejercicio de gramática y su dictado tampoco salen juntos', () => {
    const d = CATALOG.find((c) => c.kind === 'dictation')!
    expect(siblingKey(d.id)).toBe(siblingKey(d.id.replace(/^d:/, 'g:')))
  })
})

describe('límite diario de repasos', () => {
  it('la sesión no pasa del tope y prioriza los más atrasados', () => {
    const ids = CATALOG.slice(0, 30).map((d) => d.id)
    makeDue(ids)
    updateSettings({ maxReviews: 10, newPerDay: 0 })
    const s = buildSession({})
    expect(s.length).toBe(10)
    expect(s.every((i) => !i.isNew)).toBe(true)
  })
  it('lo ya repasado hoy descuenta del tope, y se puede pedir una tanda extra', () => {
    updateSettings({ maxReviews: 3, newPerDay: 0 })
    makeDue(CATALOG.slice(0, 10).map((d) => d.id))
    review(CATALOG[0].id, Rating.Good, 2)
    review(CATALOG[1].id, Rating.Good, 2)
    expect(reviewsLeft()).toBe(1)
    expect(buildSession({}).length).toBe(1)
    expect(buildSession({ extraReviews: 4 }).length).toBe(5)
  })
  it('con atraso que no entra hoy, las nuevas se pausan salvo pedido explícito', () => {
    updateSettings({ maxReviews: 2, newPerDay: 10 })
    makeDue(CATALOG.slice(0, 5).map((d) => d.id))
    expect(buildSession({}).filter((i) => i.isNew)).toHaveLength(0)
    expect(buildSession({ extraNew: 3 }).filter((i) => i.isNew)).toHaveLength(3)
  })
  it('sin atraso, las nuevas siguen entrando', () => {
    updateSettings({ maxReviews: 10, newPerDay: 4 })
    makeDue(CATALOG.slice(0, 2).map((d) => d.id))
    expect(buildSession({}).filter((i) => i.isNew)).toHaveLength(4)
  })
  it('0 es sin límite', () => {
    updateSettings({ maxReviews: 0 })
    expect(reviewsLeft()).toBe(Infinity)
  })
})

describe('historial de repasos', () => {
  it('cada repaso queda registrado con estado previo, nota y duración', () => {
    const id = CATALOG[0].id
    review(id, Rating.Good, 7)
    review(id, Rating.Again, 3)
    const logs = getData().logs
    expect(logs).toHaveLength(2)
    expect(logs[0]).toEqual([id, expect.any(Number), Rating.Good, 0, 7])
    expect(logs[1][2]).toBe(Rating.Again)
    expect(logs[1][3]).not.toBe(0) // ya no era nueva
  })
})

describe('suspender tarjetas', () => {
  it('una tarjeta suspendida no aparece ni en repasos ni como nueva, y se puede reactivar', () => {
    const [a, b] = CATALOG.filter((d) => d.kind === 'vocab-r')
    makeDue([a.id, b.id])
    setSuspended([a.id], true)
    expect(isSuspended(a.id)).toBe(true)
    expect(dueCards().map((d) => d.id)).toEqual([b.id])
    expect(nextNewCards(Infinity).some((d) => d.id === a.id)).toBe(false)
    setSuspended([a.id], false)
    expect(dueCards().map((d) => d.id).sort()).toEqual([a.id, b.id].sort())
  })
})

describe('dictado', () => {
  it('la frase se habilita para dictado cuando ya practicaste el ejercicio', () => {
    const d = CATALOG.find((c) => c.kind === 'dictation')!
    const g = d.id.replace(/^d:/, 'g:')
    updateSettings({ newPerDay: 10_000 })
    expect(nextNewCards(Infinity).some((c) => c.id === d.id)).toBe(false)
    // simular que el ejercicio ya está aprendido
    review(g, Rating.Easy, 1)
    review(g, Rating.Easy, 1)
    expect(getData().cards[g].state).toBe(2)
    // sin voz del sistema (como en Node) el dictado se desactiva
    expect(nextNewCards(Infinity).some((c) => c.id === d.id)).toBe(false)
    const g2 = globalThis as { window?: unknown }
    g2.window = { speechSynthesis: {} }
    try {
      expect(nextNewCards(Infinity).some((c) => c.id === d.id)).toBe(true)
    } finally {
      delete g2.window
    }
  })
})

describe('puntos débiles', () => {
  const card = (lapses: number, difficulty: number) => ({
    due: new Date(Date.now() + 864e5).toISOString(),
    stability: 2,
    difficulty,
    elapsed_days: 0,
    scheduled_days: 1,
    learning_steps: 0,
    reps: 6,
    lapses,
    state: 2,
    last_review: new Date().toISOString(),
  })
  it('lista primero las más falladas, sin las fáciles ni las suspendidas, y arma una sesión con ellas', () => {
    const [a, b, c, d] = CATALOG.filter((x) => x.kind === 'vocab-r')
    applyRemote(
      { v: 1, cards: { [a.id]: card(2, 6), [b.id]: card(5, 7), [c.id]: card(0, 3), [d.id]: card(3, 9) }, seen: [], settings: {}, settingsUpdatedAt: 0, devices: {}, logs: [], suspended: {} },
      {},
    )
    setSuspended([d.id], true)
    expect(weakCards().map((x) => x.id)).toEqual([b.id, a.id])
    expect(buildSession({ weak: true }).map((i) => i.def.id)).toEqual([b.id, a.id])
  })
})

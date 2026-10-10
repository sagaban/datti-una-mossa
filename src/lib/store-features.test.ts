import { beforeEach, describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { buildSession, getData, makeDue, nextNewCards, resetAll, review, reviewsLeft, updateSettings } from './store'
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
    expect(nextNewCards(5).map((d) => d.id)).toEqual(CATALOG.filter((d) => d.kind !== 'vocab-p').slice(0, 5).map((d) => d.id))
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

import { beforeEach, describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { allDays, applyRemote, getData, newBudget, resetAll, review, setSync, today, toPayload } from './store'
import type { SyncPayload } from './sync-core'

const remote = (p: Partial<SyncPayload>): SyncPayload => ({
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

describe('store + sincronización', () => {
  beforeEach(() => resetAll())

  it('el payload lleva las estadísticas bajo el id de este dispositivo', () => {
    review('v:saluti:0:r', Rating.Good, 5)
    const p = toPayload()
    expect(p.devices[getData().deviceId][today()].reviews).toBe(1)
    expect(p.cards['v:saluti:0:r']).toBeDefined()
  })

  it('aplica tarjetas más nuevas del otro dispositivo y conserva las propias más nuevas', () => {
    review('v:saluti:0:r', Rating.Good, 5)
    const mine = getData().cards['v:saluti:0:r']
    const later = new Date(Date.now() + 60_000).toISOString()
    const older = new Date(Date.now() - 86_400_000).toISOString()
    setSync({ code: 'x' })
    applyRemote(
      remote({
        cards: {
          'v:saluti:1:r': { ...mine, due: later, last_review: later, reps: 7 },
          'v:saluti:0:r': { ...mine, due: older, last_review: older, reps: 99 },
        },
      }),
      { lastSync: 1 },
    )
    const d = getData()
    expect(d.cards['v:saluti:1:r'].reps).toBe(7)
    expect(d.cards['v:saluti:1:r'].due).toBeInstanceOf(Date)
    expect(d.cards['v:saluti:0:r'].reps).toBe(mine.reps)
    expect(d.sync?.lastSync).toBe(1)
  })

  it('suma las estadísticas de otros dispositivos y comparte el cupo de nuevas', () => {
    review('v:saluti:0:r', Rating.Good, 5) // 1 nueva acá
    const budgetBefore = newBudget()
    applyRemote(
      remote({ devices: { otro: { [today()]: { reviews: 20, correct: 18, introduced: 4, seconds: 600 } } } }),
      {},
    )
    expect(allDays()[today()].reviews).toBe(21)
    expect(newBudget()).toBe(budgetBefore - 4)
    // sincronizar de nuevo lo mismo no duplica
    applyRemote(
      remote({ devices: { otro: { [today()]: { reviews: 20, correct: 18, introduced: 4, seconds: 600 } } } }),
      {},
    )
    expect(allDays()[today()].reviews).toBe(21)
  })

  it('los ajustes remotos más nuevos se aplican completando valores por defecto', () => {
    applyRemote(remote({ settings: { newPerDay: 20 }, settingsUpdatedAt: Date.now() + 1000 }), {})
    expect(getData().settings.newPerDay).toBe(20)
    expect(getData().settings.areas.vocab).toBe(true)
  })
})

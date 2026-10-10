import { useSyncExternalStore } from 'react'
import { type Card, type Grade, Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import { CARD_BY_ID, CATALOG, type Area, type CardDef } from './cards'
import { type DayLog, type SyncPayload, mergePayload, sumDays } from './sync-core'

export type { DayLog }

const KEY = 'datti-una-mossa:v1'

export interface Settings {
  newPerDay: number
  areas: Record<Area, boolean>
  autoSpeak: boolean
  retention: number
}

export interface SyncState {
  code: string
  lastSync?: number
  lastError?: string
}

export interface Data {
  cards: Record<string, Card>
  days: Record<string, DayLog>
  /** temas/lecciones ya presentados (para no repetir la intro) */
  seen: string[]
  settings: Settings
  settingsUpdatedAt: number
  /** identifica este dispositivo en la sincronización */
  deviceId: string
  /** estadísticas diarias de los otros dispositivos sincronizados */
  remoteDays: Record<string, Record<string, DayLog>>
  sync: SyncState | null
}

const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  areas: { vocab: true, verbi: true, grammatica: true, falsi: true },
  autoSpeak: false,
  retention: 0.9,
}

const newDeviceId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`

const empty = (): Data => ({
  cards: {},
  days: {},
  seen: [],
  settings: DEFAULT_SETTINGS,
  settingsUpdatedAt: 0,
  deviceId: newDeviceId(),
  remoteDays: {},
  sync: null,
})

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function revive(raw: Data): Data {
  for (const c of Object.values(raw.cards)) {
    c.due = new Date(c.due)
    if (c.last_review) c.last_review = new Date(c.last_review)
  }
  return { ...empty(), ...raw, settings: { ...DEFAULT_SETTINGS, ...raw.settings, areas: { ...DEFAULT_SETTINGS.areas, ...raw.settings?.areas } } }
}

function load(): Data {
  if (typeof localStorage === 'undefined') return empty()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<Data>
    const d = revive(parsed as Data)
    // datos de antes de la sincronización: fijar el id de dispositivo ya mismo
    if (!parsed.deviceId) localStorage.setItem(KEY, JSON.stringify(d))
    return d
  } catch {
    return empty()
  }
}

let data: Data = load()
const listeners = new Set<() => void>()
const localListeners = new Set<() => void>()

function commit(next: Data, { fromSync = false } = {}) {
  data = next
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // almacenamiento lleno o bloqueado: se mantiene en memoria
  }
  listeners.forEach((l) => l())
  if (!fromSync) localListeners.forEach((l) => l())
}

/** Cambios hechos en este dispositivo (no los que llegan por sincronización) */
export function onLocalChange(cb: () => void) {
  localListeners.add(cb)
  return () => localListeners.delete(cb)
}

export function useData(): Data {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => data,
    () => data,
  )
}

export const getData = () => data

function scheduler() {
  return fsrs(generatorParameters({ request_retention: data.settings.retention, enable_fuzz: true }))
}

function bumpDay(patch: Partial<DayLog>): Record<string, DayLog> {
  const key = today()
  const d = data.days[key] ?? { reviews: 0, correct: 0, introduced: 0, seconds: 0 }
  const next = { ...d }
  for (const k of Object.keys(patch) as (keyof DayLog)[]) next[k] += patch[k] ?? 0
  return { ...data.days, [key]: next }
}

export function review(id: string, grade: Grade, seconds: number) {
  const now = new Date()
  const prev = data.cards[id]
  const card = prev ?? createEmptyCard(now)
  const { card: next } = scheduler().next(card, now, grade)
  commit({
    ...data,
    cards: { ...data.cards, [id]: next },
    days: bumpDay({ reviews: 1, correct: grade === Rating.Again ? 0 : 1, introduced: prev ? 0 : 1, seconds }),
  })
  return next
}

/** Intervalos que resultarían de cada calificación, para mostrarlos en los botones */
export function previewIntervals(id: string): Record<Grade, string> {
  const now = new Date()
  const card = data.cards[id] ?? createEmptyCard(now)
  const rec = scheduler().repeat(card, now)
  const fmt = (d: Date) => {
    const min = Math.round((d.getTime() - now.getTime()) / 60000)
    if (min < 60) return `${Math.max(1, min)} min`
    if (min < 60 * 24) return `${Math.round(min / 60)} h`
    const days = Math.round(min / 1440)
    if (days < 31) return `${days} d`
    if (days < 365) return `${Math.round(days / 30)} m`
    return `${(days / 365).toFixed(1)} a`
  }
  return {
    [Rating.Again]: fmt(rec[Rating.Again].card.due),
    [Rating.Hard]: fmt(rec[Rating.Hard].card.due),
    [Rating.Good]: fmt(rec[Rating.Good].card.due),
    [Rating.Easy]: fmt(rec[Rating.Easy].card.due),
  } as Record<Grade, string>
}

export function markSeen(key: string) {
  if (data.seen.includes(key)) return
  commit({ ...data, seen: [...data.seen, key] })
}

export function addSeconds(seconds: number) {
  commit({ ...data, days: bumpDay({ seconds }) })
}

/** Pone tarjetas como pendientes ya (p. ej. errores del test) */
export function makeDue(ids: string[]) {
  const now = new Date()
  const cards = { ...data.cards }
  for (const id of ids) {
    const c = cards[id]
    cards[id] = c ? { ...c, due: now } : createEmptyCard(now)
  }
  commit({ ...data, cards })
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...data, settings: { ...data.settings, ...patch }, settingsUpdatedAt: Date.now() })
}

export function exportData(): string {
  return JSON.stringify(data)
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as Data
  if (!parsed || typeof parsed.cards !== 'object') throw new Error('Formato inválido')
  commit(revive(parsed))
}

/** Borra el progreso de este dispositivo y lo desvincula de la sincronización */
export function resetAll() {
  commit(empty())
}

// ——— Sincronización ———

export function toPayload(): SyncPayload {
  return {
    v: 1,
    cards: data.cards,
    seen: data.seen,
    settings: data.settings as unknown as Record<string, unknown>,
    settingsUpdatedAt: data.settingsUpdatedAt,
    devices: { ...data.remoteDays, [data.deviceId]: data.days },
  }
}

/** Fusiona lo que llegó del servidor con el estado local actual (que pudo cambiar durante el pedido) */
export function applyRemote(remote: SyncPayload, sync: Partial<SyncState>) {
  const merged = mergePayload(toPayload(), remote)
  const { [data.deviceId]: own = data.days, ...others } = merged.devices
  const next = revive({
    ...data,
    cards: merged.cards as unknown as Record<string, Card>,
    seen: merged.seen,
    settings: merged.settings as unknown as Settings,
    settingsUpdatedAt: merged.settingsUpdatedAt,
    days: own,
    remoteDays: others,
    sync: data.sync ? { ...data.sync, ...sync } : null,
  })
  commit(next, { fromSync: true })
}

export function setSync(sync: SyncState | null) {
  commit({ ...data, sync }, { fromSync: true })
}

export function patchSync(patch: Partial<SyncState>) {
  if (data.sync) commit({ ...data, sync: { ...data.sync, ...patch } }, { fromSync: true })
}

let daysCache: { src: Data; days: Record<string, DayLog> } | null = null

/** Estadísticas diarias de todos los dispositivos sumadas */
export function allDays(): Record<string, DayLog> {
  if (daysCache?.src !== data) {
    const others = Object.entries(data.remoteDays)
      .filter(([id]) => id !== data.deviceId)
      .map(([, d]) => d)
    daysCache = { src: data, days: sumDays([data.days, ...others]) }
  }
  return daysCache.days
}

// ——— Construcción de sesiones ———

function enabled(def: CardDef) {
  return data.settings.areas[def.area]
}

/** La producción (ES→IT) se habilita cuando ya reconocés la palabra */
function unlocked(def: CardDef) {
  if (def.kind !== 'vocab-p') return true
  const r = data.cards[def.id.replace(/:p$/, ':r')]
  return !!r && r.state === State.Review
}

export function dueCards(now = new Date()): CardDef[] {
  return Object.entries(data.cards)
    .filter(([, c]) => c.due <= now)
    .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
    .map(([id]) => CARD_BY_ID.get(id))
    .filter((d): d is CardDef => !!d && enabled(d))
}

export function newBudget(): number {
  // el cupo de nuevas es por persona, no por dispositivo
  const introduced = allDays()[today()]?.introduced ?? 0
  return Math.max(0, data.settings.newPerDay - introduced)
}

export function nextNewCards(limit: number, area?: Area): CardDef[] {
  const out: CardDef[] = []
  for (const def of CATALOG) {
    if (out.length >= limit) break
    if (data.cards[def.id] || !enabled(def) || !unlocked(def)) continue
    if (area && def.area !== area) continue
    out.push(def)
  }
  return out
}

export interface SessionItem {
  def: CardDef
  isNew: boolean
}

export function buildSession(opts: { max?: number; area?: Area; extraNew?: number }): SessionItem[] {
  let due = dueCards()
  if (opts.area) due = due.filter((d) => d.area === opts.area)
  const budget = newBudget() + (opts.extraNew ?? 0)
  const max = opts.max ?? Infinity
  const dueTake = due.slice(0, max)
  const fresh = nextNewCards(Math.min(budget, Math.max(0, max - dueTake.length)), opts.area)

  // intercalar: una nueva cada ~3 repasos
  const out: SessionItem[] = []
  const newQ = fresh.map((def) => ({ def, isNew: true }))
  dueTake.forEach((def, i) => {
    out.push({ def, isNew: false })
    if (i % 3 === 2 && newQ.length) out.push(newQ.shift()!)
  })
  out.push(...newQ)
  return out
}

// ——— Estadísticas ———

export function streak(): number {
  let n = 0
  const d = new Date()
  // si hoy todavía no practicaste, la racha cuenta desde ayer
  const days = allDays()
  if (!days[today(d)]?.reviews) d.setDate(d.getDate() - 1)
  while (days[today(d)]?.reviews) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function areaProgress(): Record<Area, { total: number; seen: number; mature: number }> {
  const out = {} as Record<Area, { total: number; seen: number; mature: number }>
  for (const def of CATALOG) {
    const a = (out[def.area] ??= { total: 0, seen: 0, mature: 0 })
    a.total++
    const c = data.cards[def.id]
    if (c) a.seen++
    if (c && c.state === State.Review && c.scheduled_days >= 21) a.mature++
  }
  return out
}

import { useSyncExternalStore } from 'react'
import { type Card, type Grade, Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import { CARD_BY_ID, CATALOG, type Area, type CardDef } from './cards'
import { LEVELS, type Level } from '../data/verbs'
import { canSpeak } from './speech'
import {
  type DayLog,
  type ReviewLogEntry,
  type Suspension,
  type SyncPayload,
  mergeLogs,
  mergePayload,
  mergeSuspended,
  sumDays,
} from './sync-core'

export type { DayLog }

const KEY = 'datti-una-mossa:v1'

export interface Settings {
  newPerDay: number
  /** tope de repasos por día (0 = sin límite); se priorizan los más atrasados */
  maxReviews: number
  /** las tarjetas nuevas empiezan en este nivel; las de niveles anteriores quedan para después */
  startLevel: Level
  /** ya eligió su nivel inicial */
  onboarded: boolean
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
  /** historial de repasos (para optimizar FSRS con los datos propios) */
  logs: ReviewLogEntry[]
  /** tarjetas suspendidas ("ya la sé" / "no me interesa"); se conserva la marca para sincronizar */
  suspended: Record<string, Suspension>
}

const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  maxReviews: 150,
  startLevel: 'A1',
  onboarded: false,
  areas: { vocab: true, verbi: true, grammatica: true, falsi: true, ascolto: true },
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
  logs: [],
  suspended: {},
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
  const log: ReviewLogEntry = [id, now.getTime(), grade, card.state, seconds]
  commit({
    ...data,
    cards: { ...data.cards, [id]: next },
    logs: [...data.logs, log],
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
    logs: data.logs,
    suspended: data.suspended,
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
    logs: mergeLogs(data.logs, merged.logs),
    suspended: mergeSuspended(data.suspended, merged.suspended),
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
  if (data.suspended[def.id]?.on) return false
  // el dictado necesita la voz del sistema
  if (def.area === 'ascolto' && !canSpeak()) return false
  return data.settings.areas[def.area]
}

export const isSuspended = (id: string) => !!data.suspended[id]?.on

/** Suspende o reactiva tarjetas; en vocabulario conviene pasar ambas direcciones */
export function setSuspended(ids: string[], on: boolean) {
  const at = Date.now()
  const suspended = { ...data.suspended }
  for (const id of ids) suspended[id] = { on, at }
  commit({ ...data, suspended })
}

export const suspendedCount = () => Object.values(data.suspended).filter((s) => s.on).length

/**
 * La producción (ES→IT) se habilita cuando ya reconocés la palabra, y el dictado
 * de una frase cuando ya practicaste su ejercicio de gramática.
 */
function unlocked(def: CardDef) {
  const prereq =
    def.kind === 'vocab-p' ? def.id.replace(/:p$/, ':r') : def.kind === 'dictation' ? def.id.replace(/^d:/, 'g:') : null
  if (!prereq) return true
  const c = data.cards[prereq]
  return !!c && c.state === State.Review
}

export function dueCards(now = new Date()): CardDef[] {
  return Object.entries(data.cards)
    .filter(([, c]) => c.due <= now)
    .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
    .map(([id]) => CARD_BY_ID.get(id))
    .filter((d): d is CardDef => !!d && enabled(d))
}

/** Lo que más cuesta: tarjetas falladas 2+ veces o con dificultad FSRS alta, peores primero */
export function weakCards(limit = 20): CardDef[] {
  return Object.entries(data.cards)
    .filter(([, c]) => c.lapses >= 2 || (c.difficulty >= 8 && c.reps >= 3))
    .sort(([, a], [, b]) => b.lapses - a.lapses || b.difficulty - a.difficulty)
    .map(([id]) => CARD_BY_ID.get(id))
    .filter((d): d is CardDef => !!d && enabled(d))
    .slice(0, limit)
}

export function newBudget(): number {
  // el cupo de nuevas es por persona, no por dispositivo
  const introduced = allDays()[today()]?.introduced ?? 0
  return Math.max(0, data.settings.newPerDay - introduced)
}

/** Catálogo con los niveles desde el inicial primero y los anteriores al final (no se pierden) */
function orderedCatalog(): CardDef[] {
  const start = LEVELS.indexOf(data.settings.startLevel)
  if (start <= 0) return CATALOG
  const isLower = (d: CardDef) => LEVELS.indexOf(d.level) < start
  return [...CATALOG.filter((d) => !isLower(d)), ...CATALOG.filter(isLower)]
}

export function nextNewCards(limit: number, area?: Area): CardDef[] {
  const out: CardDef[] = []
  for (const def of orderedCatalog()) {
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

/** Repasos que quedan hoy según el tope diario (Infinity si no hay tope) */
export function reviewsLeft(): number {
  const max = data.settings.maxReviews
  if (!max) return Infinity
  return Math.max(0, max - (allDays()[today()]?.reviews ?? 0))
}

export function buildSession(opts: {
  max?: number
  area?: Area
  extraNew?: number
  extraReviews?: number
  /** repasar los puntos débiles aunque no estén vencidos */
  weak?: boolean
}): SessionItem[] {
  if (opts.weak) return weakCards(opts.max ?? 20).map((def) => ({ def, isNew: false }))
  // dueCards viene ordenado por vencimiento: los más atrasados primero
  let due = dueCards()
  if (opts.area) due = due.filter((d) => d.area === opts.area)
  const max = opts.max ?? Infinity
  const allowed = reviewsLeft() + (opts.extraReviews ?? 0)
  const dueTake = due.slice(0, Math.min(max, allowed))
  // con repasos atrasados que no entran hoy, sumar nuevas sólo agranda la pila: se pausan (salvo pedido explícito)
  const backlog = due.length > allowed
  const budget = backlog ? (opts.extraNew ?? 0) : newBudget() + (opts.extraNew ?? 0)
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

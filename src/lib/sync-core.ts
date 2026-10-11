/**
 * Núcleo de la sincronización, compartido entre la app y la Netlify Function.
 * Código puro: sin DOM, sin localStorage, sin dependencias.
 */

export interface DayLog {
  reviews: number
  correct: number
  introduced: number
  /** segundos de práctica */
  seconds: number
}

/** Estado de una tarjeta FSRS con las fechas serializadas (o como Date en memoria) */
export interface CardState {
  due: string | Date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string | Date
}

/**
 * Un repaso: [id de tarjeta, momento (ms), nota 1–4, estado FSRS antes del repaso 0–3, segundos].
 * Es lo que necesita el optimizador de FSRS para ajustar los parámetros a cada persona.
 */
export type ReviewLogEntry = [cardId: string, time: number, rating: number, state: number, seconds: number]

/** Suspensión de una tarjeta: gana el cambio más reciente, así reactivar también se propaga */
export interface Suspension {
  on: boolean
  at: number
}

export interface SyncPayload {
  v: 1
  cards: Record<string, CardState>
  seen: string[]
  settings: Record<string, unknown>
  settingsUpdatedAt: number
  /** estadísticas diarias por dispositivo: así dos dispositivos no se pisan ni se suman doble */
  devices: Record<string, Record<string, DayLog>>
  logs: ReviewLogEntry[]
  suspended: Record<string, Suspension>
}

// ——— Código de sincronización ———

// base32 de Crockford en minúsculas: sin i, l, o, u para evitar confusiones
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'
const CODE_RE = /^[0-9a-hjkmnp-tv-z]{4}(?:-[0-9a-hjkmnp-tv-z]{4}){7}$/

/** 160 bits aleatorios → 32 caracteres en grupos de 4: imposible de adivinar */
export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return out.match(/.{4}/g)!.join('-')
}

/** Acepta lo que pegue la persona: mayúsculas, espacios, sin guiones */
export function normalizeCode(input: string): string {
  const raw = input.toLowerCase().replace(/[^0-9a-z]/g, '')
  return raw.match(/.{1,4}/g)?.join('-') ?? ''
}

export const isValidCode = (code: string) => CODE_RE.test(code)

/** En el servidor se guarda sólo el hash: el almacenamiento no revela los códigos */
export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ——— Validación de lo que llega por la red ———

const LIMITS = { cards: 50_000, seen: 5_000, devices: 20, days: 5_000, logs: 200_000 }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ID_RE = /^[\w:’'\-. /àèéìòù]{1,200}$/

const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback)
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const validDate = (x: unknown) => (typeof x === 'string' || x instanceof Date) && !Number.isNaN(new Date(x).getTime())

function cleanCard(x: unknown): CardState | null {
  if (!isObj(x) || !validDate(x.due)) return null
  return {
    due: new Date(x.due as string).toISOString(),
    stability: num(x.stability),
    difficulty: num(x.difficulty),
    elapsed_days: num(x.elapsed_days),
    scheduled_days: num(x.scheduled_days),
    learning_steps: num(x.learning_steps),
    reps: num(x.reps),
    lapses: num(x.lapses),
    state: num(x.state),
    ...(validDate(x.last_review) ? { last_review: new Date(x.last_review as string).toISOString() } : {}),
  }
}

function cleanDays(x: unknown): Record<string, DayLog> {
  const out: Record<string, DayLog> = {}
  if (!isObj(x)) return out
  for (const [date, d] of Object.entries(x).slice(0, LIMITS.days)) {
    if (!DATE_RE.test(date) || !isObj(d)) continue
    out[date] = { reviews: num(d.reviews), correct: num(d.correct), introduced: num(d.introduced), seconds: num(d.seconds) }
  }
  return out
}

function cleanLogs(x: unknown): ReviewLogEntry[] {
  if (!Array.isArray(x)) return []
  const out: ReviewLogEntry[] = []
  for (const e of x.slice(-LIMITS.logs)) {
    if (!Array.isArray(e) || typeof e[0] !== 'string' || !ID_RE.test(e[0])) continue
    const [id, t, rating, state, seconds] = e
    if (!Number.isFinite(t) || ![1, 2, 3, 4].includes(rating) || ![0, 1, 2, 3].includes(state)) continue
    out.push([id, t, rating, state, num(seconds)])
  }
  return out
}

/** Sanea un payload que viene de afuera; descarta todo lo que no tenga la forma esperada */
export function parsePayload(x: unknown): SyncPayload {
  if (!isObj(x) || x.v !== 1) throw new Error('Formato de sincronización inválido')
  const cards: Record<string, CardState> = {}
  if (isObj(x.cards))
    for (const [id, c] of Object.entries(x.cards).slice(0, LIMITS.cards)) {
      const card = ID_RE.test(id) ? cleanCard(c) : null
      if (card) cards[id] = card
    }
  const seen = Array.isArray(x.seen)
    ? x.seen.filter((s): s is string => typeof s === 'string' && ID_RE.test(s)).slice(0, LIMITS.seen)
    : []
  const devices: Record<string, Record<string, DayLog>> = {}
  if (isObj(x.devices))
    for (const [id, days] of Object.entries(x.devices).slice(0, LIMITS.devices))
      if (/^[\w-]{1,64}$/.test(id)) devices[id] = cleanDays(days)
  return {
    v: 1,
    cards,
    seen,
    settings: isObj(x.settings) ? x.settings : {},
    settingsUpdatedAt: num(x.settingsUpdatedAt),
    devices,
    logs: cleanLogs(x.logs),
    suspended: cleanSuspended(x.suspended),
  }
}

function cleanSuspended(x: unknown): Record<string, Suspension> {
  const out: Record<string, Suspension> = {}
  if (!isObj(x)) return out
  for (const [id, v] of Object.entries(x).slice(0, LIMITS.cards))
    if (ID_RE.test(id) && isObj(v) && typeof v.on === 'boolean') out[id] = { on: v.on, at: num(v.at) }
  return out
}

export function mergeSuspended(a: Record<string, Suspension>, b: Record<string, Suspension>): Record<string, Suspension> {
  const out = { ...a }
  for (const [id, s] of Object.entries(b)) if (!out[id] || s.at > out[id].at) out[id] = s
  return out
}

/** Unión de historiales sin duplicados (mismo repaso = misma tarjeta y mismo momento), por fecha */
export function mergeLogs(a: ReviewLogEntry[], b: ReviewLogEntry[]): ReviewLogEntry[] {
  if (!b.length) return a
  const seen = new Set(a.map((e) => `${e[0]}|${e[1]}`))
  const extra = b.filter((e) => !seen.has(`${e[0]}|${e[1]}`))
  if (!extra.length) return a
  return [...a, ...extra].sort((x, y) => x[1] - y[1]).slice(-LIMITS.logs)
}

// ——— Fusión ———

const time = (d: string | Date | undefined) => (d ? new Date(d).getTime() : 0)

/** Por tarjeta gana el repaso más reciente; si empatan, la que tiene más repasos */
export function pickCard(a: CardState, b: CardState): CardState {
  const ta = time(a.last_review)
  const tb = time(b.last_review)
  if (ta !== tb) return ta > tb ? a : b
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b
  return time(a.due) >= time(b.due) ? a : b
}

/** Los contadores de un dispositivo sólo crecen: el máximo nunca pierde ni duplica */
function mergeDays(a: Record<string, DayLog> = {}, b: Record<string, DayLog> = {}): Record<string, DayLog> {
  const out = { ...a }
  for (const [date, d] of Object.entries(b)) {
    const o = out[date]
    out[date] = o
      ? {
          reviews: Math.max(o.reviews, d.reviews),
          correct: Math.max(o.correct, d.correct),
          introduced: Math.max(o.introduced, d.introduced),
          seconds: Math.max(o.seconds, d.seconds),
        }
      : d
  }
  return out
}

export function mergePayload(a: SyncPayload, b: SyncPayload): SyncPayload {
  const cards = { ...a.cards }
  for (const [id, card] of Object.entries(b.cards)) cards[id] = cards[id] ? pickCard(cards[id], card) : card

  const devices: SyncPayload['devices'] = { ...a.devices }
  for (const [id, days] of Object.entries(b.devices)) devices[id] = mergeDays(devices[id], days)

  const newerSettings = b.settingsUpdatedAt > a.settingsUpdatedAt ? b : a
  return {
    v: 1,
    cards,
    seen: [...new Set([...a.seen, ...b.seen])],
    settings: newerSettings.settings,
    settingsUpdatedAt: newerSettings.settingsUpdatedAt,
    devices,
    logs: mergeLogs(a.logs, b.logs),
    suspended: mergeSuspended(a.suspended, b.suspended),
  }
}

/** Suma las estadísticas de todos los dispositivos por fecha */
export function sumDays(devices: Record<string, DayLog>[]): Record<string, DayLog> {
  const out: Record<string, DayLog> = {}
  for (const days of devices)
    for (const [date, d] of Object.entries(days)) {
      const o = (out[date] ??= { reviews: 0, correct: 0, introduced: 0, seconds: 0 })
      o.reviews += d.reviews
      o.correct += d.correct
      o.introduced += d.introduced
      o.seconds += d.seconds
    }
  return out
}

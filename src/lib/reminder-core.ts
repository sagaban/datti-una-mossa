/**
 * Recordatorio diario por Web Push: código puro compartido entre la app y las Netlify Functions.
 * Sin DOM ni dependencias.
 */

/** Clave pública VAPID (la privada vive en la variable de entorno VAPID_PRIVATE_KEY de Netlify) */
export const VAPID_PUBLIC_KEY = 'BLxL5GIWISCkiIAAz_B83NC_mMJH5-KT_gFd1tEsXb0h6mCFhs9HELkVUk2ETUehH1jt4PAznz1lszVxkjsFfaE'

export interface PushSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Reminder {
  sub: PushSub
  /** hora local (0–23) a la que avisar */
  hour: number
  /** zona horaria IANA del dispositivo, p. ej. America/Argentina/Buenos_Aires */
  tz: string
  /** último día (local) en que se practicó en este dispositivo: ese día no se avisa */
  studied?: string
  /** último día (local) en que se mandó el aviso: uno por día como máximo */
  sent?: string
}

// sólo servicios de push reales: el servidor nunca le hace pedidos a URLs arbitrarias
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/]

export function isValidEndpoint(x: unknown): x is string {
  if (typeof x !== 'string' || x.length > 1000) return false
  try {
    const u = new URL(x)
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const B64_RE = /^[\w-]{1,200}={0,2}$/

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function parseSub(x: unknown): PushSub | null {
  if (!x || typeof x !== 'object') return null
  const s = x as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (!isValidEndpoint(s.endpoint)) return null
  const { p256dh, auth } = s.keys ?? {}
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !B64_RE.test(p256dh) || !B64_RE.test(auth)) return null
  return { endpoint: s.endpoint, keys: { p256dh, auth } }
}

export const validHour = (h: unknown): h is number => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23
export const validDate = (d: unknown): d is string => typeof d === 'string' && DATE_RE.test(d)

/** Fecha y hora locales en una zona horaria */
export function localNow(now: Date, tz: string): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/**
 * ¿Hay que avisar ahora? A la hora elegida o después (por si una corrida se saltea),
 * si ese día no se practicó y todavía no se avisó.
 */
export function shouldSend(r: Reminder, now: Date): { send: boolean; date: string } {
  const { date, hour } = localNow(now, r.tz)
  return { send: hour >= r.hour && r.studied !== date && r.sent !== date, date }
}

/** La clave en Blobs es el hash del endpoint: el almacenamiento no expone las suscripciones por nombre */
export async function reminderKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const MESSAGES = [
  'Cinque minuti d’italiano? Tus repasos te esperan.',
  'Datti una mossa! Un repaso rápido y mantenés la racha.',
  'Un caffè e qualche parola: ¿repasamos un ratito?',
  'Piano piano si va lontano. Hoy todavía no practicaste.',
]

export function reminderMessage(date: string): { title: string; body: string; url: string } {
  const day = Number(date.slice(-2))
  return { title: 'Datti una mossa', body: MESSAGES[day % MESSAGES.length], url: '/' }
}
